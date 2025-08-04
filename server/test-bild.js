const { MongoClient, ObjectId } = require("mongodb");
const { pipeline } = require("@xenova/transformers");
const sharp = require('sharp');
const fetch = require('node-fetch'); // Expliziter Import
const dotenv = require("dotenv");

dotenv.config();

// Workaround für fetch in Node.js
const fetchWithBuffer = async (url) => {
  const response = await fetch(url);
  return response.arrayBuffer();
};

async function updateEmbeddings() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, {
    serverApi: { version: '1', strict: false, deprecationErrors: true },
    tls: true,
  });

  try {
    await client.connect();
    const db = client.db("wineDB");
    const collection = db.collection("wines");

    console.log("🚀 Lade CLIP Modell...");
    const imageExtractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");
    console.log("✅ Modell geladen");

    const wines = await collection.find({ imageUrl: { $exists: true } }).toArray();
    for (const wein of wines) {
      if (!wein.imageUrl) {
        console.warn(`⚠️ Kein Bild für Wein ${wein._id}`);
        continue;
      }

      console.log(`🔎 Verarbeite Wein: ${wein._id} (${wein.name})`);

      // Bild herunterladen
      try {
        const imageBuffer = Buffer.from(await fetchWithBuffer(wein.imageUrl));
        // Bildvorverarbeitung mit sharp
        const processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 80, progressive: true })
          .resize({ width: 256, height: 256, fit: 'contain', background: 'white' })
          .toBuffer();

        // Bild direkt an imageExtractor übergeben
        const imageEmbedding = await imageExtractor(processedBuffer, {
          pooling: "mean",
          normalize: true,
        });

        await collection.updateOne(
          { _id: wein._id },
          { $set: { ImageEmbedding: Array.from(imageEmbedding.data) } }
        );

        console.log(`✅ Embedding gespeichert für Wein ${wein._id}`);
      } catch (fetchError) {
        console.warn(`⚠️ Fehler beim Herunterladen des Bildes für Wein ${wein._id}: ${fetchError.message}`);
        continue;
      }
    }
  } catch (err) {
    console.error("❌ Fehler:", err.message, err.stack);
  } finally {
    await client.close();
  }
}

updateEmbeddings();