const { MongoClient } = require("mongodb");
const { pipeline, RawImage } = require("@xenova/transformers");
const dotenv = require("dotenv");

dotenv.config();

async function updateEmbeddings() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("WineDB"); // ggf. anpassen
    const collection = db.collection("weine");

    // CLIP Image Embedding Pipeline
    const imageExtractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");

    // Alle Weine mit Name = "Test"
    const cursor = collection.find({ name: "Test" });

    while (await cursor.hasNext()) {
      const wein = await cursor.next();
      if (!wein?.imageUrl) {
        console.warn(`⚠️ Kein Bild für Wein ${wein._id}`);
        continue;
      }

      console.log(`🔎 Verarbeite Wein: ${wein._id} (${wein.name})`);

      // Bild laden & Embedding berechnen
      const image = await RawImage.fromURL(wein.imageUrl);
      const imageEmbedding = await imageExtractor(image, {
        pooling: "mean",
        normalize: true,
      });

      // In MongoDB speichern
      await collection.updateOne(
        { _id: wein._id },
        { $set: { ImageEmbedding: imageEmbedding.data } }
      );

      console.log(`✅ Embedding gespeichert für Wein ${wein._id}`);
    }
  } catch (err) {
    console.error("❌ Fehler:", err);
  } finally {
    await client.close();
  }
}

updateEmbeddings();
