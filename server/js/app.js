require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();

// CORS-Konfiguration
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.208:3000', 'https://wine-db.vercel.app', 'https://wine-db-git-dev-erikstadels-projects.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Server is awake and ready',
  });
});

// MongoDB-Verbindung
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
  tls: true,
});

let db;

async function connectDB() {
  if (!db) {
    try {
      await client.connect();
      console.log(`Connected to ${dbName} at ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);
      await client.db('admin').command({ ping: 1 });
      db = client.db(dbName);
    } catch (err) {
      console.error('MongoDB connection error:', err.message, err.stack);
      throw err;
    }
  }
  return db;
}

// GET /wines
app.get('/wines', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const query = req.query.hasEmbedding === 'true' ? { ImageEmbedding: { $exists: true } } : {};
    const wines = await collection.find(query).toArray();
    console.log('Fetched wines:', wines.length);
    res.json(wines);
  } catch (err) {
    console.error('MongoDB Fehler:', err.message);
    res.status(500).json({ error: 'Fehler beim Abrufen der Weine', message: err.message });
  }
});

// Bestehende Endpunkte (POST /wine, GET /wine/:id, etc.) bleiben unverändert...
app.post('/wine', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wineData = {
      name: req.body.name || 'Unbekannter Wein',
      rebsorte: req.body.rebsorte || '',
      farbe: req.body.farbe || '',
      preis: req.body.preis || '',
      kauforte: req.body.kauforte || [],
      geschmack: req.body.geschmack || [],
      kategorie: req.body.kategorie || '',
      unterkategorie: req.body.unterkategorie || '',
      notizen: req.body.notizen || '',
      bewertung: req.body.bewertung || 0,
      imageUrl: req.body.imageUrl || '',
      timestamp: new Date(),
    };
    console.log('Eingehende Daten:', wineData);
    const result = await collection.insertOne(wineData);
    console.log('Eintrag erstellt:', result.insertedId);
    res.status(201).json({ message: 'Wein erfolgreich gespeichert', data: wineData });
  } catch (err) {
    console.error('MongoDB Fehler:', err.message);
    res.status(500).json({ error: 'Fehler beim Speichern des Weins', message: err.message });
  }
});

// ... (weitere Endpunkte wie GET /wine/:id, PUT /wine/:id, DELETE /wine/:id, GET /wines/search, GET /wines/search-fallback bleiben unverändert)

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Interner Serverfehler:', err.message, err.stack);
  res.status(500).json({ error: 'Interner Serverfehler', message: err.message });
});

// Server starten
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

// Cleanup bei Server-Abschaltung
process.on('SIGTERM', async () => {
  await client.close();
  console.log('MongoDB-Verbindung geschlossen');
  process.exit(0);
});