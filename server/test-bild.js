const { MongoClient, ObjectId } = require("mongodb");
const { pipeline, RawImage } = require("@xenova/transformers");
const sharp = require('sharp');
const dotenv = require("dotenv");

dotenv.config();

async function updateEmbeddings() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("wineDB");
    const collection = db.collection("wines");

    console.log("🚀 Lade CLIP Modell...");
    const imageExtractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");
    console.log("✅ Modell geladen");

    const wineId = new ObjectId("688c6703fd2cbdac9895f1df");
    const wein = await collection.findOne({ _id: wineId });
    if (!wein) {
      console.log("❌ Kein Wein mit dieser ID gefunden.");
      return;
    }

    if (!wein.imageUrl) {
      console.warn(`⚠️ Kein Bild für Wein ${wein._id}`);
      return;
    }

    console.log(`🔎 Verarbeite Wein: ${wein._id} (${wein.name})`);

    // Bild herunterladen
    const response = await fetch(wein.imageUrl);
    if (!response.ok) {
      console.warn(`⚠️ Bild nicht verfügbar: ${wein.imageUrl}`);
      return;
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Bildvorverarbeitung mit sharp
    const processedBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 80, progressive: true })
      .resize({ width: 256, height: 256, fit: 'contain', background: 'white' })
      .toBuffer();

    const image = await RawImage.fromBuffer(processedBuffer);
    const imageEmbedding = await imageExtractor(image, {
      pooling: "mean",
      normalize: true,
    });

    await collection.updateOne(
      { _id: wineId },
      { $set: { ImageEmbedding: Array.from(imageEmbedding.data) } }
    );

    console.log(`✅ Embedding gespeichert für Wein ${wein._id}`);
  } catch (err) {
    console.error("❌ Fehler:", err.message);
  } finally {
    await client.close();
  }
}

updateEmbeddings();