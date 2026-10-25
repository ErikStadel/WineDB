const path = require('path');
const { MongoClient } = require('../server/node_modules/mongodb');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

if (!uri) {
  console.error('FEHLER: MONGODB_URI ist nicht definiert.');
  process.exit(1);
}

async function runMigration() {
  const client = new MongoClient(uri, { tls: true });

  try {
    console.log('Verbinde mit MongoDB...');
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('wines');

    // 1. Weine mit Kaufort "Wo anders" und "Globus" in den Notizen
    const globusWines = await collection
      .find({
        kauforte: 'Wo anders',
        notizen: { $regex: /globus/i },
      })
      .toArray();

    console.log(`\nGefundene Weine für "Globus": ${globusWines.length}`);
    for (const wine of globusWines) {
      const updatedKauforte = Array.from(
        new Set(wine.kauforte.map(k => (k === 'Wo anders' ? 'Globus' : k)))
      );
      console.log(`- [${wine._id}] "${wine.name}": ${JSON.stringify(wine.kauforte)} -> ${JSON.stringify(updatedKauforte)} | Notiz: "${wine.notizen.replace(/\n/g, ' ')}"`);
      await collection.updateOne(
        { _id: wine._id },
        {
          $set: {
            kauforte: updatedKauforte,
            updatedAt: new Date(),
          },
        }
      );
    }

    // 2. Weine mit Kaufort "Wo anders" und "Weinfreunde" in den Notizen
    const weinfreundeWines = await collection
      .find({
        kauforte: 'Wo anders',
        notizen: { $regex: /weinfreunde/i },
      })
      .toArray();

    console.log(`\nGefundene Weine für "Weinfreunde": ${weinfreundeWines.length}`);
    for (const wine of weinfreundeWines) {
      const updatedKauforte = Array.from(
        new Set(wine.kauforte.map(k => (k === 'Wo anders' ? 'Weinfreunde' : k)))
      );
      console.log(`- [${wine._id}] "${wine.name}": ${JSON.stringify(wine.kauforte)} -> ${JSON.stringify(updatedKauforte)} | Notiz: "${wine.notizen.replace(/\n/g, ' ')}"`);
      await collection.updateOne(
        { _id: wine._id },
        {
          $set: {
            kauforte: updatedKauforte,
            updatedAt: new Date(),
          },
        }
      );
    }

    // 3. Verifikation
    const globusCount = await collection.countDocuments({ kauforte: 'Globus' });
    const weinfreundeCount = await collection.countDocuments({ kauforte: 'Weinfreunde' });
    const remaining = await collection.countDocuments({
      kauforte: 'Wo anders',
      notizen: { $regex: /globus|weinfreunde/i },
    });

    console.log('\nVerifikation nach Migration:');
    console.log(`- Weine mit Kaufort "Globus": ${globusCount}`);
    console.log(`- Weine mit Kaufort "Weinfreunde": ${weinfreundeCount}`);
    console.log(`- Verbleibende "Wo anders"-Weine mit Globus/Weinfreunde in Notizen: ${remaining}`);

    if (remaining === 0) {
      console.log('\n✅ Alle Weine erfolgreich auf Globus bzw. Weinfreunde umgeschrieben!');
    } else {
      console.warn('\n⚠️ Es sind noch nicht migrierte Einträge übrig.');
    }
  } catch (err) {
    console.error('Fehler bei der Migration:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB-Verbindung getrennt.');
  }
}

runMigration();
