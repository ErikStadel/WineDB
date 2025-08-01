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

    const wineId = new ObjectId("688c7e03d731781f42fd30d1");

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
    console.log(`🖼️ Bild-URL: ${wein.imageUrl}`);

    try {
      const image = await RawImage.fromURL(wein.imageUrl);
      console.log(`📐 Bildgröße: ${image.width}x${image.height}`);
      
      const imageEmbedding = await imageExtractor(image, {
        pooling: "mean",
        normalize: true,
      });

      console.log(`🧮 Embedding-Typ: ${typeof imageEmbedding.data}`);
      console.log(`🧮 Embedding-Konstruktor: ${imageEmbedding.data.constructor.name}`);
      console.log(`📊 Embedding-Größe: ${imageEmbedding.data.length}`);

      // WICHTIG: Konvertiere Float32Array zu normalem Array
      const embeddingArray = Array.from(imageEmbedding.data);
      
      console.log(`✅ Konvertiert zu Array: ${Array.isArray(embeddingArray)}`);
      console.log(`📊 Array-Größe: ${embeddingArray.length}`);
      console.log(`🔢 Erste 5 Werte: ${embeddingArray.slice(0, 5).join(', ')}`);

      await collection.updateOne(
        { _id: wineId },
        { $set: { ImageEmbedding: embeddingArray } }
      );

      console.log(`✅ Embedding als Array gespeichert für Wein ${wein._id}`);
      
      // Verifikation: Lade den Wein neu und prüfe das Embedding
      const updatedWein = await collection.findOne({ _id: wineId });
      console.log(`🔍 Verifikation - ImageEmbedding ist Array: ${Array.isArray(updatedWein.ImageEmbedding)}`);
      console.log(`🔍 Verifikation - ImageEmbedding Länge: ${updatedWein.ImageEmbedding?.length}`);
      
    } catch (imageError) {
      console.error(`❌ Fehler beim Verarbeiten des Bildes: ${imageError.message}`);
    }

  } catch (err) {
    console.error("❌ Fehler:", err.message);
    console.error("❌ Stack:", err.stack);
  } finally {
    await client.close();
  }
}

updateEmbeddings();