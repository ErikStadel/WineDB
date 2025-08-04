const functions = require('@google-cloud/functions-framework');
const { pipeline, RawImage } = require('@xenova/transformers');
const sharp = require('sharp');
const { MongoClient } = require('mongodb');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

let imageExtractor;
let isModelLoading = false;

async function initializeModel() {
  if (imageExtractor || isModelLoading) return imageExtractor;
  
  isModelLoading = true;
  console.log('🚀 Lade CLIP Modell...');
  
  try {
    imageExtractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
    console.log('✅ Modell geladen');
    isModelLoading = false;
    return imageExtractor;
  } catch (error) {
    console.error('❌ Fehler beim Laden des Modells:', error);
    isModelLoading = false;
    throw error;
  }
}

const uri = process.env.MONGODB_URI;
let client;
let db;

async function connectDB() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('wineDB');
  }
  return db;
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
  const normB = Math.sqrt(b.reduce((sum, x) => sum + x * x, 0));
  return dot / (normA * normB);
}

// Cloud Function HTTP Handler
functions.http('searchImage', async (req, res) => {
  // CORS Headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST-Requests erlaubt' });
  }

  // Promise wrapper für multer
  const handleUpload = () => {
    return new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  try {
    // Handle file upload
    await handleUpload();

    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    // Initialize model if not loaded
    if (!imageExtractor) {
      console.log('Modell wird geladen...');
      await initializeModel();
    }

    // Connect to database
    const database = await connectDB();
    const collection = database.collection('wines');

    // Process image
    console.log('Verarbeite Bild...');
    const imageBuffer = await sharp(req.file.buffer)
      .jpeg({ quality: 80 })
      .resize({ width: 256, height: 256, fit: 'contain', background: 'white' })
      .toBuffer();

    // Extract features
    console.log('Extrahiere Features...');
    const image = await RawImage.fromBuffer(imageBuffer);
    const imageEmbedding = await imageExtractor(image, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(imageEmbedding.data);

    // Search for similar wines
    console.log('Suche ähnliche Weine...');
    const wines = await collection.find({ ImageEmbedding: { $exists: true } }).toArray();
    
    const results = wines
      .map(wine => ({
        ...wine,
        similarity: cosineSimilarity(queryEmbedding, Array.from(wine.ImageEmbedding)),
      }))
      .filter(wine => wine.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    console.log(`Gefunden: ${results.length} ähnliche Weine`);
    res.json({ wines: results, totalCount: results.length, hasMore: false });

  } catch (error) {
    console.error('Fehler bei der Bildsuche:', error);
    res.status(500).json({ 
      error: 'Fehler bei der Bildsuche', 
      message: error.message 
    });
  }
});