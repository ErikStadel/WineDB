const path = require('path');
const { MongoClient } = require('../server/node_modules/mongodb');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'wineDB';

if (!uri) {
  console.error('FEHLER: MONGODB_URI ist nicht in der .env-Datei definiert.');
  process.exit(1);
}

async function runMigration() {
  const client = new MongoClient(uri, { tls: true });

  try {
    console.log('Verbinde mit MongoDB...');
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('wines');

    // 1. Zähle betroffene Dokumente
    const weinstandDocs = await collection.find({ kategorie: 'Weinstand' }).toArray();
    console.log(`Gefundene Dokumente mit kategorie='Weinstand': ${weinstandDocs.length}`);

    if (weinstandDocs.length === 0) {
      console.log('Keine Dokumente mit kategorie="Weinstand" vorhanden. Migration nicht erforderlich.');
      return;
    }

    console.log('Betroffene Weine:');
    weinstandDocs.forEach(w => {
      console.log(`  - [${w._id}] "${w.name}" (bisherige Unterkategorie: "${w.unterkategorie}")`);
    });

    // 2. Führe die Migration durch
    const result = await collection.updateMany(
      { kategorie: 'Weinstand' },
      {
        $set: {
          kategorie: 'Alte Bekannte',
          unterkategorie: 'Winzer',
          updatedAt: new Date(),
        },
      }
    );

    console.log(`\nMigration erfolgreich durchgeführt:`);
    console.log(`- Gematchte Dokumente: ${result.matchedCount}`);
    console.log(`- Geänderte Dokumente: ${result.modifiedCount}`);

    // 3. Verifikation
    const remainingWeinstand = await collection.countDocuments({ kategorie: 'Weinstand' });
    const alteBekannteCount = await collection.countDocuments({ kategorie: 'Alte Bekannte', unterkategorie: 'Winzer' });

    console.log(`\nVerifikation:`);
    console.log(`- Verbleibende Einträge mit "Weinstand": ${remainingWeinstand}`);
    console.log(`- Neue Einträge mit "Alte Bekannte" & "Winzer": ${alteBekannteCount}`);

    if (remainingWeinstand === 0) {
      console.log('✅ Alle Einträge wurden erfolgreich umgezogen!');
    } else {
      console.warn('⚠️ Es sind noch Einträge mit "Weinstand" vorhanden.');
    }
  } catch (err) {
    console.error('Fehler während der Migration:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB-Verbindung getrennt.');
  }
}

runMigration();
