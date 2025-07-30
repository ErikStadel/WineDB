require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { pipeline } = require('@xenova/transformers');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Fehler: MONGODB_URI nicht in .env gesetzt');
  process.exit(1);
}
const client = new MongoClient(uri);

async function updateEmbeddings() {
  try {
    await client.connect();
    const db = client.db('wineDB');
    const collection = db.collection('wines');
    const wines = await collection
      .find({ imageUrl: { $exists: true, $ne: '' }, embedding: { $exists: false } })
      .limit(10) // Kleiner Batch für Debugging
      .toArray();

    if (wines.length === 0) {
      console.log('Keine Weine ohne Embeddings gefunden.');
      return;
    }

    console.log(`Verarbeite ${wines.length} Weine...`);
    let ocr;
    try {
      ocr = await pipeline('image-to-text', 'Xenova/trocr-base-printed');
    } catch (err) {
      console.error('Fehler beim Laden von trocr-base-printed, versuche trocr-small-printed:', err.message);
      ocr = await pipeline('image-to-text', 'Xenova/trocr-small-printed');
    }
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    for (const wine of wines) {
      try {
        // Bild von imageUrl laden
        console.log(`Lade Bild für Wein ${wine.name}: ${wine.imageUrl}`);
        const response = await axios.get(wine.imageUrl, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'];
        console.log(`Content-Type für ${wine.name}: ${contentType}`);
        if (!contentType.includes('image/jpeg') && !contentType.includes('image/png')) {
          console.log(`Ungültiges Bildformat für Wein ${wine.name}: ${contentType}`);
          continue;
        }

        // Direkter Buffer
        const imageBuffer = Buffer.from(response.data);
        console.log(`Buffer-Größe für ${wine.name}: ${imageBuffer.length} Bytes`);
        console.log(`Buffer-Typ für ${wine.name}: ${imageBuffer instanceof Buffer}`);
        console.log(`Buffer-Erste-Bytes für ${wine.name}: ${imageBuffer.slice(0, 10).toString('hex')}`);

        // Fallback: Temporäre Datei schreiben
        let input = imageBuffer;
        const tempFilePath = path.join(__dirname, `temp_${wine._id}.jpg`);
        try {
          await fs.writeFile(tempFilePath, imageBuffer);
          console.log(`Temporäre Datei für ${wine.name} erstellt: ${tempFilePath}`);
          input = tempFilePath; // Verwende Dateipfad statt Buffer
        } catch (err) {
          console.error(`Fehler beim Schreiben der temporären Datei für ${wine.name}:`, err.message);
        }

        // OCR-Text extrahieren
        const ocrResult = await ocr(input);
        const extractedText = ocrResult[0]?.generated_text || '';
        console.log(`Extrahierter Text für ${wine.name}: ${extractedText}`);
        if (!extractedText) {
          console.log(`Kein Text für Wein: ${wine.name}`);
          await fs.unlink(tempFilePath).catch(() => {}); // Bereinige temporäre Datei
          continue;
        }

        // Embedding generieren
        const output = await embedder(extractedText, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);

        // MongoDB aktualisieren
        await collection.updateOne(
          { _id: new ObjectId(wine._id) },
          { $set: { embedding, extractedText } }
        );
        console.log(`Updated embedding for wine: ${wine.name}`);

        // Temporäre Datei bereinigen
        await fs.unlink(tempFilePath).catch(() => {});
      } catch (err) {
        console.error(`Fehler bei Wein ${wine.name}:`, err.message);
        console.error(`Stacktrace:`, err.stack);
      }
    }
  } catch (err) {
    console.error('Globaler Fehler:', err.message);
    console.error('Stacktrace:', err.stack);
  } finally {
    await client.close();
  }
}

updateEmbeddings().catch(console.error);