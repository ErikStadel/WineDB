require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();

// CORS-Konfiguration
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.208:3000', 'https://wine-db.vercel.app', 'https://wine-db-git-dev-erikstadels-projects.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Middleware für JSON-Antworten mit besserer Fehlerbehandlung
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Override res.send to ensure JSON responses
  const originalSend = res.send;
  res.send = function(data) {
    if (typeof data === 'string' && !res.get('Content-Type')?.includes('application/json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        JSON.parse(data);
      } catch (e) {
        data = JSON.stringify({ message: data });
      }
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// Request Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  console.log('Headers:', req.headers);
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('Query:', req.query);
  }
  next();
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Server is awake and ready',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// MongoDB-Verbindung
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

if (!uri) {
  console.error('MONGODB_URI nicht in Umgebungsvariablen gefunden');
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
  tls: true,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 1,
});

let db;
let isConnecting = false;

async function connectDB() {
  if (db) {
    return db;
  }
  
  if (isConnecting) {
    // Warte bis Verbindung hergestellt ist
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return db;
  }
  
  try {
    isConnecting = true;
    console.log('Verbinde mit MongoDB...');
    await client.connect();
    console.log(`Connected to ${dbName} at ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);
    await client.db('admin').command({ ping: 1 });
    db = client.db(dbName);
    isConnecting = false;
    return db;
  } catch (err) {
    isConnecting = false;
    console.error('MongoDB connection error:', err.message, err.stack);
    throw err;
  }
}

// Test-Endpunkt für MongoDB-Abfrage
app.get('/test/wines', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const count = await collection.countDocuments({ ImageEmbedding: { $exists: true } });
    res.json({ message: 'MongoDB-Abfrage erfolgreich', count, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Test Wines Fehler:', err.message, err.stack);
    res.status(500).json({ error: 'Fehler bei der Test-Abfrage', message: err.message });
  }
});

// GET /wines - mit verbessertem Logging und Error Handling
app.get('/wines', async (req, res) => {
  try {
    console.log('GET /wines aufgerufen mit:', {
      url: req.originalUrl,
      query: req.query,
      headers: req.headers,
    });
    
    const db = await connectDB();
    const collection = db.collection('wines');
    
    // Prüfe, ob hasEmbedding=true gesetzt ist
    if (req.query.hasEmbedding !== 'true') {
      console.warn('hasEmbedding=true fehlt, gebe leere Antwort zurück');
      return res.json([]); // Leeres Array zurückgeben, wenn Parameter fehlt
    }
    
    const query = { ImageEmbedding: { $exists: true, $ne: [] } }; // Nur nicht-leere Arrays
    console.log('MongoDB Query:', JSON.stringify(query));
    
    const wines = await collection
      .find(query)
      .project({ _id: 1, name: 1, imageUrl: 1, ImageEmbedding: 1 })
      .limit(50)
      .toArray();
    
    console.log(`Fetched ${wines.length} wines`);
    
    const validWines = wines.filter(wine => {
      if (!wine.ImageEmbedding) {
        console.warn(`Wein ${wine._id} hat kein ImageEmbedding`);
        return false;
      }
      if (!Array.isArray(wine.ImageEmbedding)) {
        console.warn(`Wein ${wine._id} hat ungültiges ImageEmbedding:`, {
          type: typeof wine.ImageEmbedding,
          constructor: wine.ImageEmbedding?.constructor?.name
        });
        return false;
      }
      if (wine.ImageEmbedding.length === 0) {
        console.warn(`Wein ${wine._id} hat leeres ImageEmbedding`);
        return false;
      }
      const hasValidNumbers = wine.ImageEmbedding.slice(0, 10).every(val => 
        typeof val === 'number' && !isNaN(val)
      );
      if (!hasValidNumbers) {
        console.warn(`Wein ${wine._id} hat ungültige Zahlen im ImageEmbedding`);
        return false;
      }
      return true;
    });
    
    console.log(`Returning ${validWines.length} valid wines with embeddings`);
    res.json(validWines);
  } catch (err) {
    console.error('MongoDB Fehler bei GET /wines:', err.message, err.stack);
    res.status(500).json({ 
      error: 'Fehler beim Abrufen der Weine', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /wine
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

app.get('/wine/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wine = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!wine) {
      return res.status(404).json({ message: 'Wein nicht gefunden' });
    }
    res.json(wine);
  } catch (err) {
    console.error('Fehler beim Abrufen des Weins:', err.message);
    res.status(500).json({ error: 'Fehler beim Abrufen des Weins', message: err.message });
  }
});

app.put('/wine/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wineData = {
      ...req.body,
      timestamp: new Date(),
    };
    delete wineData._id;
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: wineData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Wein nicht gefunden' });
    }
    console.log('Wein aktualisiert:', req.params.id);
    res.json({ message: 'Wein erfolgreich aktualisiert', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Fehler beim Aktualisieren:', err.message);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Weins', message: err.message });
  }
});

app.delete('/wine/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Ungültige Wein-ID' });
    }
    const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Wein nicht gefunden' });
    }
    console.log('Wein gelöscht:', req.params.id);
    res.json({ message: 'Wein erfolgreich gelöscht', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Fehler beim Löschen:', err.message);
    res.status(500).json({ error: 'Fehler beim Löschen des Weins', message: err.message });
  }
});

app.get('/wines/search', async (req, res) => {
  try {
    const { q, farbe, kauforte, kategorie, limit = 20, skip = 0 } = req.query;
    const db = await connectDB();
    const collection = db.collection('wines');
    const pipeline = [];
    if (q && q.trim() !== '') {
      pipeline.push({
        $search: {
          index: 'WineSearch',
          compound: {
            should: [
              {
                text: {
                  query: q.trim(),
                  path: ['name', 'rebsorte', 'notizen'],
                  fuzzy: { maxEdits: 2 },
                },
              },
              {
                autocomplete: {
                  query: q.trim(),
                  path: 'name_autocomplete',
                  fuzzy: { maxEdits: 2 },
                },
              },
              {
                autocomplete: {
                  query: q.trim(),
                  path: 'rebsorte_autocomplete',
                  fuzzy: { maxEdits: 2 },
                },
              },
            ],
            minimumShouldMatch: 1,
          },
        },
      });
      pipeline.push({
        $addFields: {
          score: { $meta: 'searchScore' },
        },
      });
    }
    const matchConditions = {};
    if (farbe && farbe !== '') {
      matchConditions.farbe = { $regex: `^${farbe}$`, $options: 'i' };
    }
    if (kauforte && kauforte !== '') {
      matchConditions.kauforte = { $in: [kauforte] };
    }
    if (kategorie && kategorie !== '') {
      matchConditions.kategorie = { $regex: `^${kategorie}$`, $options: 'i' };
    }
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }
    pipeline.push({
      $sort: q && q.trim() !== '' ? { score: -1, timestamp: -1 } : { timestamp: -1 },
    });
    pipeline.push({ $skip: parseInt(skip) });
    pipeline.push({ $limit: parseInt(limit) });
    console.log('Search Query:', { q, farbe, kauforte, kategorie, limit, skip });
    console.log('Search Pipeline:', JSON.stringify(pipeline, null, 2));
    const wines = await collection.aggregate(pipeline).toArray();
    console.log('Search Results:', { count: wines.length });
    const totalCount = wines.length === parseInt(limit)
      ? parseInt(skip) + wines.length + 1
      : parseInt(skip) + wines.length;
    res.json({
      wines,
      totalCount,
      hasMore: wines.length === parseInt(limit),
    });
  } catch (err) {
    console.error('Atlas Search Fehler:', err.message, err.stack);
    res.status(500).json({ error: 'Fehler bei der Suche', message: err.message });
  }
});

app.get('/wines/search-fallback', async (req, res) => {
  try {
    const { q, farbe, kauforte, kategorie, limit = 20 } = req.query;
    const db = await connectDB();
    const collection = db.collection('wines');
    const query = {};
    if (q && q.trim() !== '') {
      const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: searchRegex },
        { rebsorte: searchRegex },
        { notizen: searchRegex },
      ];
    }
    if (farbe && farbe !== '') query.farbe = { $regex: `^${farbe}$`, $options: 'i' };
    if (kauforte && kauforte !== '') query.kauforte = { $in: [kauforte] };
    if (kategorie && kategorie !== '') query.kategorie = { $regex: `^${kategorie}$`, $options: 'i' };
    console.log('Fallback Query:', JSON.stringify(query, null, 2));
    const wines = await collection.find(query).sort({ timestamp: -1 }).limit(parseInt(limit)).toArray();
    console.log('Fallback Results:', { count: wines.length });
    res.json({ wines, totalCount: wines.length, hasMore: false });
  } catch (err) {
    console.error('Fallback Search Fehler:', err.message, err.stack);
    res.status(500).json({ error: 'Fehler bei der Suche', message: err.message });
  }
});

// Catch-all für unbekannte Routen - verhindert HTML-Antworten
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error Handling Middleware - stellt sicher, dass immer JSON zurückgegeben wird
app.use((err, req, res, next) => {
  console.error('Interner Serverfehler:', err.message, err.stack);
  
  // Stelle sicher, dass wir JSON zurückgeben
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Interner Serverfehler', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Server starten
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('MongoDB URI verfügbar:', !!process.env.MONGODB_URI);
});

// Cleanup bei Server-Abschaltung
process.on('SIGTERM', async () => {
  console.log('SIGTERM erhalten, schließe Verbindungen...');
  await client.close();
  console.log('MongoDB-Verbindung geschlossen');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT erhalten, schließe Verbindungen...');
  await client.close();
  console.log('MongoDB-Verbindung geschlossen');
  process.exit(0);
});