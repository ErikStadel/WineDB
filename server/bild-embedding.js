const { MongoClient } = require("mongodb");
const { AutoTokenizer, CLIPModel, AutoProcessor, AutoModel } = require("@xenova/transformers");
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

function normalize(vec) {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm ? vec.map(v => v / norm) : vec;
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

    // 🔁 MODELLE LADEN
    console.log("🚀 Lade CLIP-Modelle...");
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch32");
    const processor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32");
    
    // Verwende das komplette CLIP-Modell für beide Tasks
    const model = await CLIPModel.from_pretrained("Xenova/clip-vit-base-patch32");
    
    // Alternativ: Separates Text-Modell für bessere Text-Embeddings
    let textModel = null;
    try {
      textModel = await AutoModel.from_pretrained("nomic/nomic-embed-text-v1");
      console.log("✅ Separates Text-Modell geladen");
    } catch (err) {
      console.log("ℹ️ Verwende CLIP für Text-Embeddings");
    }

    console.log("✅ Modelle geladen");

    // ➕ IMAGE EMBEDDINGS
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
      if (!wein.imageUrl) continue;
      console.log(`🖼️ Verarbeite Image: ${wein._id} (${wein.name})`);

      try {
        const response = await fetch(wein.imageUrl);
        if (!response.ok) throw new Error(`HTTP Fehler: ${response.status}`);
        const imageBuffer = Buffer.from(await response.arrayBuffer());

        const processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 80, progressive: true })
          .resize({ width: 224, height: 224, fit: "contain", background: "white" })
          .toBuffer();

        const imageInputs = await processor(processedBuffer);
        const output = await model({ pixel_values: imageInputs.pixel_values });
        const imageEmbedding = normalize(Array.from(output.image_embeds.data));

        await collection.updateOne(
          { _id: wein._id },
          {
            $set: {
              ImageEmbedding: imageEmbedding,
              PreviousImageUrl: wein.imageUrl,
            },
          }
        );

        console.log(`✅ ImageEmbedding gespeichert für ${wein._id}`);
      } catch (err) {
        console.warn(`⚠️ Fehler bei ImageEmbedding (${wein._id}): ${err.message}`);
      }
    }

    // ➕ OCR + TEXT EMBEDDINGS
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
      if (!wein.imageUrl) continue;
      console.log(`📄 Verarbeite OCR/Text: ${wein._id} (${wein.name})`);

      try {
        const response = await axios.get(wein.imageUrl, { responseType: "arraybuffer" });
        const base64Image = Buffer.from(response.data).toString("base64");

        const [ocrResult] = await visionClient.documentTextDetection({
          image: { content: base64Image },
        });

        const fullText = ocrResult.fullTextAnnotation;
        const processed = postProcessOCR(fullText);
        const ocrText = processed.map(line => line.text).join(" ") || "";

        if (!ocrText) {
          console.warn(`⚠️ Kein OCR-Text für Wein ${wein._id}`);
          continue;
        }

        console.log(`📄 OCR-Text: ${ocrText}`);

        let textEmbedding;

        if (textModel) {
          // Verwende separates Text-Modell (bessere Qualität)
          const textTokenizer = await AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2");
          const textInputs = await textTokenizer(ocrText, {
            return_tensors: "pt",
            padding: true,
            truncation: true,
            max_length: 512,
          });

          const output = await textModel(textInputs);
          // Mean pooling für sentence-transformers
          textEmbedding = normalize(Array.from(output.last_hidden_state.data.slice(0, 384)));
        } else {
          // Fallback: CLIP für Text-Embeddings
          const textInputs = await tokenizer(ocrText, {
            return_tensors: "pt",
            padding: true,
            truncation: true,
            max_length: 77,
          });

          // Dummy pixel_values für CLIP
          const dummyPixelValues = {
            data: new Float32Array(1 * 3 * 224 * 224).fill(0),
            dims: [1, 3, 224, 224]
          };

          const output = await model({
            input_ids: textInputs.input_ids,
            attention_mask: textInputs.attention_mask,
            pixel_values: dummyPixelValues
          });

          textEmbedding = normalize(Array.from(output.text_embeds.data));
        }

        await collection.updateOne(
          { _id: wein._id },
          {
            $set: {
              ocrText,
              TextEmbedding: textEmbedding,
              PreviousImageUrl: wein.imageUrl,
            },
          }
        );

        console.log(`✅ OCR/TextEmbedding gespeichert für ${wein._id}`);
      } catch (err) {
        console.warn(`⚠️ Fehler bei OCR/TextEmbedding (${wein._id}): ${err.message}`);
      }
    }
  } catch (err) {
    console.error("❌ Fehler:", err.message, err.stack);
  } finally {
    if (client) {
      await client.close();
      console.log("✅ MongoDB-Verbindung geschlossen");
    }
  }
}

updateEmbeddings();