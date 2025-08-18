const { MongoClient } = require("mongodb");
const { pipeline } = require("@xenova/transformers");
const sharp = require("sharp");
const dotenv = require("dotenv");

dotenv.config();

async function updateEmbeddings() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI nicht gesetzt");
    process.exit(1);
  }

  let client;
  try {
    client = new MongoClient(uri, {
      serverApi: { version: "1", strict: false, deprecationErrors: true },
      tls: true,
    });

    await client.connect();
    console.log("✅ MongoDB verbunden");
    const db = client.db("wineDB");
    const collection = db.collection("wines");

    console.log("🚀 Lade CLIP Modell...");
    const imageExtractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-large-patch14");
    console.log("✅ Modell geladen");

    const wines = await collection.find({
  Kategorie: { $ne: "Weinstand" }, // Dieser Ausschluss wird IMMER angewendet
  imageUrl: { $exists: true },
  $or: [
    { ImageEmbedding: { $exists: false } },
    { ImageEmbedding: "" },
    { $expr: { $ne: ["$imageUrl", "$PreviousImageUrl"] } }
  ]
})
      .toArray();
    console.log(`🔍 Gefundene Weine: ${wines.length}`);

    for (const wein of wines) {
      if (!wein.imageUrl) {
        console.warn(`⚠️ Kein Bild für Wein ${wein._id}`);
        continue;
      }

      console.log(`🔎 Verarbeite Wein: ${wein._id} (${wein.name})`);

      try {
        console.log("🔍 Fetch-Aufruf für URL:", wein.imageUrl);
        const response = await fetch(wein.imageUrl);
        if (!response.ok) throw new Error(`HTTP Fehler: ${response.status}`);
        const imageBuffer = Buffer.from(await response.arrayBuffer());

        const processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 80, progressive: true })
          .resize({ width: 256, height: 256, fit: "contain", background: "white" })
          .toBuffer();

        const imageEmbedding = await imageExtractor(wein.imageUrl, {
          pooling: "mean",
          normalize: true,
        });

        await collection.updateOne(
          { _id: wein._id },
          {
            $set: {
              ImageEmbedding: Array.from(imageEmbedding.data),
              PreviousImageUrl: wein.imageUrl,
            },
          }
        );

        console.log(`✅ Embedding gespeichert für Wein ${wein._id}`);
      } catch (fetchError) {
        console.warn(`⚠️ Fehler beim Verarbeiten des Bildes für Wein ${wein._id}: ${fetchError.message}`);
        continue;
      }
    }
  } catch (err) {
    console.error("❌ Fehler:", err.message, err.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("✅ MongoDB-Verbindung geschlossen");
    }
  }
}

updateEmbeddings();
