const { MongoClient, ObjectId } = require("mongodb");
const { pipeline, RawImage } = require("@xenova/transformers");
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

    const image = await RawImage.fromURL(wein.imageUrl);
    const imageEmbedding = await imageExtractor(image, {
      pooling: "mean",
      normalize: true,
    });

    await collection.updateOne(
      { _id: wineId },
      { $set: { ImageEmbedding: imageEmbedding.data } }
    );

    console.log(`✅ Embedding gespeichert für Wein ${wein._id}`);
  } catch (err) {
    console.error("❌ Fehler:", err.message);
  } finally {
    await client.close();
  }
}

updateEmbeddings();
