require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.208:3000', 'https://wine-db.vercel.app', 'https://wine-db-git-dev-erikstadels-projects.vercel.app'],
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

// GET /wines
app.get('/wines', async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection('wines');
    const wines = await collection.find({}).toArray();
    console.log('Fetched wines:', wines.length); // Debugging
    res.json(wines);
  } catch (err) {
    console.error('MongoDB Fehler:', err.message);
    res.status(500).json({ error: 'Fehler beim Abrufen der Weine', message: err.message });
  }
});

// GET /wine/:id
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

// PUT /wine/:id
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

// DELETE /wine/:id
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

// Atlas Search Route
app.get('/wines/search', async (req, res) => {
  try {
    const { q, farbe, kauforte, kategorie, limit = 20, skip = 0 } = req.query;

    const db = await connectDB();
    const collection = db.collection('wines');

    // Basis-Pipeline für Atlas Search
    const pipeline = [];

    // Wenn Suchterm vorhanden, verwende Atlas Search
    if (q && q.trim() !== '') {
      pipeline.push({
        $search: {
          index: 'WineSearch', // Stelle sicher, dass der Index-Name korrekt ist
          compound: {
            should: [
              {
                text: {
                  query: q.trim(),
                  path: ['name', 'rebsorte', 'notizen'],
                  fuzzy: { maxEdits: 2 }, // Erhöhe maxEdits für mehr Flexibilität
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

    // Case-insensitive Filter für Facetten
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

    // Sortierung: Zuerst nach Score (bei Suche), dann nach Timestamp
    pipeline.push({
      $sort: q && q.trim() !== '' ? { score: -1, timestamp: -1 } : { timestamp: -1 },
    });

    // Pagination
    pipeline.push({ $skip: parseInt(skip) });
    pipeline.push({ $limit: parseInt(limit) });

    // Debugging: Logge die gesamte Pipeline und Parameter
    console.log('Search Query:', { q, farbe, kauforte, kategorie, limit, skip });
    console.log('Search Pipeline:', JSON.stringify(pipeline, null, 2));

    const wines = await collection.aggregate(pipeline).toArray();
    console.log('Search Results:', { count: wines.length, wines });

    // Gesamtanzahl für Pagination
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

// Fallback Search Route
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
    console.log('Fallback Results:', { count: wines.length, wines });

    res.json({ wines, totalCount: wines.length, hasMore: false });
  } catch (err) {
    console.error('Fallback Search Fehler:', err.message, err.stack);
    res.status(500).json({ error: 'Fehler bei der Suche', message: err.message });
  }
});

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