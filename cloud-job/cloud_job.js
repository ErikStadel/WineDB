const functions = require('@google-cloud/functions-framework');
const { AutoTokenizer, AutoProcessor, AutoModel, CLIPModel } = require('@xenova/transformers');
const sharp = require('sharp');
const { MongoClient } = require('mongodb');
const vision = require('@google-cloud/vision');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY || '{}');
const visionClient = new vision.ImageAnnotatorClient({ credentials });
let model, tokenizer, processor, textModel, textTokenizer;
let isModelLoading = false;
let client;
const ocrCache = new Map();
const MAX_CACHE_SIZE = 100;

function postProcessOCR(fullText) {
  if (!fullText?.pages) return [];
  const lines = [];
  fullText.pages.forEach(page => {
    page.blocks.forEach(block => {
      block.paragraphs.forEach(para => {
        const text = para.words.map(w => w.symbols.map(s => s.text).join('')).join(' ');
        const languages = new Set();
        para.words.forEach(word => {
          word.property?.detectedLanguages?.forEach(lang => languages.add(lang.languageCode));
        });
        const yPos = para.boundingBox.vertices.reduce((sum, v) => sum + v.y, 0) / para.boundingBox.vertices.length;
        lines.push({ text: text.trim(), y: yPos, languages: [...languages] });
      });
    });
  });
  lines.sort((a, b) => a.y - b.y);
  const corrections = { 'Chateu': 'Château', 'vin': 'vin', 'Wein': 'Wein' };
  return lines.map(line => {
    let correctedText = line.text;
    Object.entries(corrections).forEach(([wrong, right]) => {
      correctedText = correctedText.replace(new RegExp(wrong, 'gi'), right);
    });
    return { ...line, text: correctedText };
  });
}

function normalize(vec) {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm ? vec.map(v => v / norm) : vec;
}

function cosineSimilarity(a, b) {
  return a.reduce((sum, x, i) => sum + x * b[i], 0); // Normalisierte Vektoren
}

async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI nicht gesetzt');
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: { version: '1', strict: false, deprecationErrors: true },
      tls: true,
    });
    await client.connect();
    console.log('✅ MongoDB verbunden');
  }
  return client.db('wineDB');
}

async function initializeModels() {
  if (model || isModelLoading) return;
  isModelLoading = true;
  console.log('🚀 Lade Modelle...');
  try {
    tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
    processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32');
    model = await CLIPModel.from_pretrained('Xenova/clip-vit-base-patch32');
    try {
      textTokenizer = await AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2');
      textModel = await AutoModel.from_pretrained('nomic/nomic-embed-text-v1');
      console.log('✅ Text-Modell geladen');
    } catch (err) {
      console.log('ℹ️ Fallback: Verwende CLIP für Text-Embeddings');
    }
    console.log('✅ Modelle geladen');
  } catch (error) {
    console.error('❌ Modell-Ladefehler:', error.message);
    throw error;
  } finally {
    isModelLoading = false;
  }
}

async function updateEmbedding(wine, collection) {
  if (!wine.imageUrl) return;
  console.log(`🖼️ Verarbeite Wein: ${wine._id} (${wine.name})`);

  try {
    // Bild-Embedding
    const response = await fetch(wine.imageUrl);
    if (!response.ok) throw new Error(`HTTP Fehler: ${response.status}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const processedBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 80, progressive: true })
      .resize({ width: 224, height: 224, fit: 'contain', background: 'white' })
      .toBuffer();
    const imageInputs = await processor(processedBuffer);
    const imageOutputs = await model({ pixel_values: imageInputs.pixel_values });
    const imageEmbedding = normalize(Array.from(imageOutputs.image_embeds.data));

    // OCR und Text-Embedding
    let ocrText = ocrCache.get(wine.imageUrl);
    if (!ocrText) {
      const axiosResponse = await axios.get(wine.imageUrl, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(axiosResponse.data).toString('base64');
      const [ocrResult] = await visionClient.documentTextDetection({ image: { content: base64Image } });
      const fullText = ocrResult.fullTextAnnotation;
      const processed = postProcessOCR(fullText);
      ocrText = processed.map(line => line.text).join(' ') || '';
      if (ocrText) {
        if (ocrCache.size >= MAX_CACHE_SIZE) ocrCache.delete(ocrCache.keys().next().value);
        ocrCache.set(wine.imageUrl, ocrText);
      }
    }
    console.log(`📄 OCR-Text: ${ocrText}`);

    let textEmbedding;
    if (textModel && ocrText) {
      const textInputs = await textTokenizer(ocrText, { return_tensors: 'pt', padding: true, truncation: true, max_length: 512 });
      const textOutputs = await textModel(textInputs);
      textEmbedding = normalize(Array.from(textOutputs.last_hidden_state.data.slice(0, 384)));
    } else if (ocrText) {
      const textInputs = await tokenizer(ocrText, { return_tensors: 'pt', padding: true, truncation: true, max_length: 77 });
      const dummyPixelValues = { data: new Float32Array(1 * 3 * 224 * 224).fill(0), dims: [1, 3, 224, 224] };
      const textOutputs = await model({ input_ids: textInputs.input_ids, attention_mask: textInputs.attention_mask, pixel_values: dummyPixelValues });
      textEmbedding = normalize(Array.from(textOutputs.text_embeds.data));
    }

    await collection.updateOne(
      { _id: wine._id },
      {
        $set: {
          ImageEmbedding: imageEmbedding,
          ocrText,
          TextEmbedding: textEmbedding || null,
          PreviousImageUrl: wine.imageUrl,
        },
      }
    );
    console.log(`✅ Embeddings gespeichert für ${wine._id}`);
  } catch (err) {
    console.warn(`⚠️ Fehler bei Embedding (${wine._id}): ${err.message}`);
  }
}

functions.http('imageSearch', async (req, res) => {
  const allowedOrigins = [
    'https://wine-db.vercel.app',
    'https://wine-db-git-dev-erikstadels-projects.vercel.app',
  ];
  const origin = req.get('origin');
  if (allowedOrigins.includes(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt' });

  try {
    const { imageUrl, imageWeight = 0.7, textWeight = 0.3 } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Keine Bild-URL angegeben' });
    if (imageWeight + textWeight !== 1) return res.status(400).json({ error: 'Gewichtungen müssen 1 ergeben' });

    console.log('🔍 Verarbeite Bildsuche:', imageUrl);
    await initializeModels();
    const db = await connectDB();
    const collection = db.collection('wines');

    // Bild-Embedding
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP Fehler: ${response.status}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const processedBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 80, progressive: true })
      .resize({ width: 224, height: 224, fit: 'contain', background: 'white' })
      .toBuffer();
    const imageInputs = await processor(processedBuffer);
    const imageOutputs = await model({ pixel_values: imageInputs.pixel_values });
    const queryImageEmbedding = normalize(Array.from(imageOutputs.image_embeds.data));

    // OCR und Text-Embedding
    let ocrText = ocrCache.get(imageUrl);
    if (!ocrText) {
      const axiosResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(axiosResponse.data).toString('base64');
      const [ocrResult] = await visionClient.documentTextDetection({ image: { content: base64Image } });
      const fullText = ocrResult.fullTextAnnotation;
      const processed = postProcessOCR(fullText);
      ocrText = processed.map(line => line.text).join(' ') || '';
      if (ocrText) {
        if (ocrCache.size >= MAX_CACHE_SIZE) ocrCache.delete(ocrCache.keys().next().value);
        ocrCache.set(imageUrl, ocrText);
      }
    }
    console.log(`📄 OCR-Text: ${ocrText}`);

    let queryTextEmbedding;
    if (textModel && ocrText) {
      const textInputs = await textTokenizer(ocrText, { return_tensors: 'pt', padding: true, truncation: true, max_length: 512 });
      const textOutputs = await textModel(textInputs);
      queryTextEmbedding = normalize(Array.from(textOutputs.last_hidden_state.data.slice(0, 384)));
    } else if (ocrText) {
      const textInputs = await tokenizer(ocrText, { return_tensors: 'pt', padding: true, truncation: true, max_length: 77 });
      const dummyPixelValues = { data: new Float32Array(1 * 3 * 224 * 224).fill(0), dims: [1, 3, 224, 224] };
      const textOutputs = await model({ input_ids: textInputs.input_ids, attention_mask: textInputs.attention_mask, pixel_values: dummyPixelValues });
      queryTextEmbedding = normalize(Array.from(textOutputs.text_embeds.data));
    }

    // Embeddings für Weine ohne aktuelle Embeddings aktualisieren
    const winesToUpdate = await collection
      .find({
        imageUrl: { $exists: true },
        $or: [
          { ImageEmbedding: { $exists: false } },
          { $expr: { $ne: ['$imageUrl', '$PreviousImageUrl'] } },
        ],
      })
      .toArray();
    for (const wine of winesToUpdate) {
      await updateEmbedding(wine, collection);
    }

    // Hybride Suche
    const wines = await collection.find({ ImageEmbedding: { $exists: true } }).toArray();
    const results = wines
      .map(wine => {
        const imageScore = cosineSimilarity(queryImageEmbedding, Array.from(wine.ImageEmbedding));
        const textScore = wine.TextEmbedding && queryTextEmbedding ? cosineSimilarity(queryTextEmbedding, Array.from(wine.TextEmbedding)) : 0;
        const finalScore = imageWeight * imageScore + textWeight * textScore;
        return { ...wine, similarity: finalScore };
      })
      .filter(wine => wine.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    res.json({ wines: results, totalCount: results.length, hasMore: false });
  } catch (error) {
    console.error('❌ Fehler bei der Bildsuche:', error.message);
    res.status(500).json({ error: 'Fehler bei der Bildsuche', message: error.message });
  }
});

process.on('SIGTERM', async () => {
  if (client) {
    await client.close();
    console.log('✅ MongoDB-Verbindung geschlossen');
  }
  process.exit(0);
});