const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

async function fixExistingEmbeddings() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("wineDB"); 
    const collection = db.collection("wines");

    console.log("🔍 Suche nach Weinen mit Object-Embeddings...");

    // Finde alle Weine mit ImageEmbedding
    const wines = await collection.find({ 
      ImageEmbedding: { $exists: true } 
    }).toArray();

    console.log(`📊 Gefunden: ${wines.length} Weine mit ImageEmbedding`);

    for (const wine of wines) {
      console.log(`\n🍷 Prüfe Wein: ${wine._id} (${wine.name})`);
      
      if (Array.isArray(wine.ImageEmbedding)) {
        console.log(`✅ ImageEmbedding ist bereits ein Array (Länge: ${wine.ImageEmbedding.length})`);
        continue;
      }

      console.log(`🔧 ImageEmbedding ist ${typeof wine.ImageEmbedding}, konvertiere zu Array...`);
      
      let embeddingArray;
      
      // Verschiedene Konvertierungsversuche
      if (wine.ImageEmbedding && typeof wine.ImageEmbedding === 'object') {
        // Wenn es ein Object ist, versuche verschiedene Konvertierungen
        if (wine.ImageEmbedding.data) {
          // Falls es ein Transformers-Ergebnis ist
          embeddingArray = Array.from(wine.ImageEmbedding.data);
          console.log(`🔄 Konvertiert von .data Property (Länge: ${embeddingArray.length})`);
        } else if (wine.ImageEmbedding.length !== undefined) {
          // Falls es array-ähnlich ist
          embeddingArray = Array.from(wine.ImageEmbedding);
          console.log(`🔄 Konvertiert von array-ähnlichem Object (Länge: ${embeddingArray.length})`);
        } else {
          // Als letzter Ausweg: Object.values
          embeddingArray = Object.values(wine.ImageEmbedding);
          console.log(`🔄 Konvertiert von Object.values (Länge: ${embeddingArray.length})`);
        }
      }

      if (!embeddingArray || embeddingArray.length === 0) {
        console.log(`❌ Konnte ImageEmbedding für ${wine._id} nicht konvertieren`);
        continue;
      }

      // Validiere, dass es numerische Werte sind
      const isValidEmbedding = embeddingArray.every(val => typeof val === 'number' && !isNaN(val));
      
      if (!isValidEmbedding) {
        console.log(`❌ ImageEmbedding für ${wine._id} enthält ungültige Werte`);
        continue;
      }

      console.log(`🔢 Erste 5 Werte: ${embeddingArray.slice(0, 5).join(', ')}`);
      
      // Update in der Datenbank
      await collection.updateOne(
        { _id: wine._id },
        { $set: { ImageEmbedding: embeddingArray } }
      );

      console.log(`✅ ImageEmbedding für ${wine._id} erfolgreich repariert`);
    }

    console.log("\n🎉 Reparatur abgeschlossen!");
    
    // Finale Verifikation
    const fixedWines = await collection.find({ 
      ImageEmbedding: { $exists: true, $type: "array" } 
    }).toArray();
    
    console.log(`📊 Finale Anzahl Weine mit Array-Embeddings: ${fixedWines.length}`);

  } catch (err) {
    console.error("❌ Fehler:", err.message);
    console.error("❌ Stack:", err.stack);
  } finally {
    await client.close();
  }
}

fixExistingEmbeddings();