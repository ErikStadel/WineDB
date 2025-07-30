require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { pipeline } = require('@xenova/transformers');
const axios = require('axios');

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
      .limit(50) // Batch-Verarbeitung für Stabilität
      .toArray();

    if (wines.length === 0) {
      console.log('Keine Weine ohne Embeddings gefunden.');
      return;
    }

    const ocr = await pipeline('image-to-text', 'Xenova/trocr-base-printed');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    for (const wine of wines) {
      try {
        // Bild von imageUrl laden
        const response = await axios.get(wine.imageUrl, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'];
        if (!contentType.includes('image/jpeg') && !contentType.includes('image/png')) {
          console.log(`Ungültiges Bildformat für Wein ${wine.name}: ${contentType}`);
          continue;
        }
        const imageBuffer = Buffer.from(response.data, 'binary');

        // OCR-Text extrahieren
        const ocrResult = await ocr(imageBuffer);
        const extractedText = ocrResult[0]?.generated_text || '';
        if (!extractedText) {
          console.log(`Kein Text für Wein: ${wine.name}`);
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
      } catch (err) {
        console.error(`Fehler bei Wein ${wine.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Globaler Fehler:', err.message);
  } finally {
    await client.close();
  }
}

updateEmbeddings().catch(console.error);