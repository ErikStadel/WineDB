const functions = require('@google-cloud/functions-framework');
const { pipeline } = require('@xenova/transformers');
const sharp = require('sharp');
const { MongoClient } = require('mongodb');

let imageExtractor;
let isModelLoading = false;
let client;

async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: { version: '1', strict: false, deprecationErrors: true },
      tls: true,
    });
    await client.connect();
    console.log('MongoDB verbunden');
  }
  return client.db('wineDB');
}

async function initializeModel() {
  if (imageExtractor || isModelLoading) return imageExtractor;
  isModelLoading = true;
  console.log('🚀 Lade CLIP Modell...');
  try {
    imageExtractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-large-patch14');
    console.log('✅ Modell geladen');
    isModelLoading = false;
    return imageExtractor;
  } catch (error) {
    isModelLoading = false;
    throw error;
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
  const normB = Math.sqrt(b.reduce((sum, x) => sum + x * x, 0));
  return normA && normB ? dot / (normA * normB) : 0;
}

functions.http('searchImage', async (req, res) => {
  const allowedOrigins = [
    'https://wine-db.vercel.app',
    'https://wine-db-git-dev-erikstadels-projects.vercel.app',
  ];
  const origin = req.get('origin');
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST erlaubt' });

  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Keine Bild-URL angegeben' });

    console.log('Verarbeite Bild-URL:', imageUrl);

    await initializeModel();
    const db = await connectDB();
    const collection = db.collection('wines');

    // Bild herunterladen
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP Fehler: ${response.status}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Bildvorverarbeitung mit sharp
    const processedBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 80, progressive: true })
      .resize({ width: 256, height: 256, fit: 'contain', background: 'white' })
      .toBuffer();

    // Bild als URL an imageExtractor übergeben
    const imageEmbedding = await imageExtractor(imageUrl, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(imageEmbedding.data);

    // Suche
    const wines = await collection.find({ ImageEmbedding: { $exists: true } }).toArray();
    const results = wines
      .map(wine => ({
        ...wine,
        similarity: cosineSimilarity(queryEmbedding, Array.from(wine.ImageEmbedding)),
      }))
      .filter(wine => wine.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    res.json({ wines: results, totalCount: results.length, hasMore: false });
  } catch (error) {
    console.error('Fehler bei der Bildsuche:', error);
    res.status(500).json({ error: 'Fehler bei der Bildsuche', message: error.message });
  }
});

process.on('SIGTERM', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB-Verbindung geschlossen');
  }
  process.exit(0);
});