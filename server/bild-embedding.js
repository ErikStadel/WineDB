const { MongoClient } = require("mongodb");
const { pipeline } = require("@xenova/transformers");
const sharp = require("sharp");
const vision = require("@google-cloud/vision");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY);
const visionClient = new vision.ImageAnnotatorClient({ credentials });

function postProcessOCR(fullText) {
  if (!fullText?.pages) return [];

  const lines = [];
  fullText.pages.forEach(page => {
    page.blocks.forEach(block => {
      block.paragraphs.forEach(para => {
        const text = para.words.map(w => w.symbols.map(s => s.text).join("")).join(" ");
        const languages = new Set();
        para.words.forEach(word => {
          word.property?.detectedLanguages?.forEach(lang => languages.add(lang.languageCode));
        });

        const yPos = para.boundingBox.vertices.reduce((sum, v) => sum + v.y, 0) / para.boundingBox.vertices.length;

        lines.push({
          text: text.trim(),
          y: yPos,
          languages: [...languages],
        });
      });
    });
  });

  lines.sort((a, b) => a.y - b.y);

  const corrections = {
    'Chateu': 'Château',
    'vin': 'vin',
    'Wein': 'Wein',
  };

  return lines.map(line => {
    let correctedText = line.text;
    Object.entries(corrections).forEach(([wrong, right]) => {
      correctedText = correctedText.replace(new RegExp(wrong, "gi"), right);
    });
    return {
      ...line,
      text: correctedText,
    };
  });
}

async function updateEmbeddings() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI nicht gesetzt");
    process.exit(1);
  }
  if (!process.env.GOOGLE_CLOUD_KEY) {
    console.error("❌ GOOGLE_CLOUD_KEY nicht gesetzt");
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
    const imageExtractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");
    console.log("✅ Modell geladen");

    // Weine für ImageEmbedding
    const imageWines = await collection
      .find({
        imageUrl: { $exists: true },
        $or: [
          { ImageEmbedding: { $exists: false } },
          { $expr: { $ne: ["$imageUrl", "$PreviousImageUrl"] } },
        ],
      })
      .toArray();
    console.log(`🔍 Gefundene Weine für ImageEmbedding: ${imageWines.length}`);

    for (const wein of imageWines) {
      if (!wein.imageUrl) {
        console.warn(`⚠️ Kein Bild für Wein ${wein._id}`);
        continue;
      }

      console.log(`🔎 Verarbeite ImageEmbedding: ${wein._id} (${wein.name})`);

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

        console.log(`✅ ImageEmbedding gespeichert für Wein ${wein._id}`);
      } catch (fetchError) {
        console.warn(`⚠️ Fehler beim Verarbeiten des Bildes für Wein ${wein._id}: ${fetchError.message}`);
        continue;
      }
    }

    // Weine für OCR und TextEmbedding
    const textWines = await collection
      .find({
        imageUrl: { $exists: true },
        $or: [
          { ocrText: { $exists: false } },
          { TextEmbedding: { $exists: false } },
          { $expr: { $ne: ["$imageUrl", "$PreviousImageUrl"] } },
        ],
      })
      .toArray();
    console.log(`🔍 Gefundene Weine für OCR/TextEmbedding: ${textWines.length}`);

    for (const wein of textWines) {
      if (!wein.imageUrl) {
        console.warn(`⚠️ Kein Bild für Wein ${wein._id}`);
        continue;
      }

      console.log(`🔎 Verarbeite OCR/TextEmbedding: ${wein._id} (${wein.name})`);

      try {
        console.log("🔍 Fetch-Aufruf für URL:", wein.imageUrl);
        const response = await axios.get(wein.imageUrl, { responseType: "arraybuffer" });
        const base64Image = Buffer.from(response.data).toString("base64");

        const [ocrResult] = await visionClient.documentTextDetection({
          image: { content: base64Image },
        });

        const fullText = ocrResult.fullTextAnnotation;
        const processed = postProcessOCR(fullText);
        const ocrText = processed.map(line => line.text).join(" ") || "";

        const textEmbedding = await imageExtractor(ocrText, {
          pooling: "mean",
          normalize: true,
        });

        await collection.updateOne(
          { _id: wein._id },
          {
            $set: {
              ocrText,
              TextEmbedding: Array.from(textEmbedding.data),
              PreviousImageUrl: wein.imageUrl,
            },
          }
        );

        console.log(`✅ OCR/TextEmbedding gespeichert für Wein ${wein._id}`);
      } catch (fetchError) {
        console.warn(`⚠️ Fehler beim Verarbeiten von OCR/TextEmbedding für Wein ${wein._id}: ${fetchError.message}`);
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