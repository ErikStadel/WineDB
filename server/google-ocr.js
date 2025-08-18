import vision from "@google-cloud/vision";
import axios from "axios";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY);
const client = new vision.ImageAnnotatorClient({
  credentials,
});

const mongoClient = new MongoClient(process.env.MONGODB_URI);

function postProcessOCR(fullText) {
  if (!fullText?.pages) return [];
  
  const lines = [];
  
  fullText.pages.forEach(page => {
    page.blocks.forEach(block => {
      block.paragraphs.forEach(para => {
        const text = para.words
          .map(w => w.symbols.map(s => s.text).join(""))
          .join(" ");
        
        const languages = new Set();
        para.words.forEach(word => {
          word.property?.detectedLanguages?.forEach(lang => 
            languages.add(lang.languageCode)
          );
        });
        
        const yPos = para.boundingBox.vertices
          .reduce((sum, v) => sum + v.y, 0) / para.boundingBox.vertices.length;
        
        lines.push({
          text: text.trim(),
          y: yPos,
          languages: [...languages],
        });
      });
    });
  });
  
  lines.sort((a, b) => a.y - b.y);
  
  // Erweiterte Korrekturen für Wein-relevante Begriffe
  const corrections = {
    'Chateu': 'Château',
    'Chatteau': 'Château',
    'Domiane': 'Domaine',
    'Domiane': 'Domaine',
    'Weingut': 'Weingut',
    'Weinqut': 'Weingut',
    'Rieslinq': 'Riesling',
    'Chardonnav': 'Chardonnay',
    'Sauviqnon': 'Sauvignon',
    'Pinot': 'Pinot',
    'Merlot': 'Merlot',
    'Cabernet': 'Cabernet',
    'Spätburqunder': 'Spätburgunder',
    'Gewürztraminer': 'Gewürztraminer',
    'trocken': 'trocken',
    'halbtrocken': 'halbtrocken',
    'süß': 'süß',
    'lieblich': 'lieblich',
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

async function processOCRForWines() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoClient.connect();
    const db = mongoClient.db();
    const collection = db.collection("wines");
    
    // Gleiche Bedingungen wie beim Embedding
    const wines = await collection.find({
      imageUrl: { $exists: true },
      kategorie: { $ne: "Weinstand" }, // Korrigierte Schreibweise
      $or: [
        { ocrText: { $exists: false } },
        { ocrText: "" },
        { ocrText: { $size: 0 } }, // Falls es ein Array ist
        { $expr: { $ne: ["$imageUrl", "$PreviousImageUrl"] } }
      ]
    }).toArray();
    
    console.log(`📋 Found ${wines.length} wines needing OCR processing`);
    
    let processed = 0;
    let errors = 0;
    
    for (const wine of wines) {
      try {
        console.log(`🔎 Processing OCR for: ${wine.name} (${wine._id})`);
        
        // Bild herunterladen
        const response = await axios.get(wine.imageUrl, { 
          responseType: "arraybuffer",
          timeout: 30000 // 30 Sekunden timeout
        });
        
        const base64Image = Buffer.from(response.data).toString("base64");
        
        // OCR durchführen
        const [result] = await client.documentTextDetection({
          image: { content: base64Image },
        });
        
        const fullText = result.fullTextAnnotation;
        
        if (!fullText) {
          console.log(`⚠️  No text detected for ${wine.name}`);
          // Leeres OCR-Result speichern, damit es nicht erneut versucht wird
          await collection.updateOne(
            { _id: wine._id },
            { 
              $set: { 
                ocrText: [],
                ocrProcessedAt: new Date(),
                PreviousImageUrl: wine.imageUrl
              } 
            }
          );
          continue;
        }
        
        console.log(`📝 Raw OCR text: ${fullText.text?.substring(0, 100)}...`);
        
        // Text nachbearbeiten
        const processedLines = postProcessOCR(fullText);
        
        // In MongoDB speichern
        await collection.updateOne(
          { _id: wine._id },
          { 
            $set: { 
              ocrText: processedLines,
              ocrRawText: fullText.text,
              ocrProcessedAt: new Date(),
              PreviousImageUrl: wine.imageUrl
            } 
          }
        );
        
        console.log(`✅ OCR completed for ${wine.name} - ${processedLines.length} lines extracted`);
        processed++;
        
        // Rate limiting - Google Vision API hat Limits
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 Sekunde pause
        
      } catch (error) {
        console.error(`❌ Error processing ${wine.name}:`, error.message);
        errors++;
        
        // Auch bei Fehlern markieren, damit es nicht endlos versucht wird
        await collection.updateOne(
          { _id: wine._id },
          { 
            $set: { 
              ocrError: error.message,
              ocrProcessedAt: new Date(),
              PreviousImageUrl: wine.imageUrl
            } 
          }
        );
      }
    }
    
    console.log(`\n🎉 OCR processing completed!`);
    console.log(`✅ Successfully processed: ${processed}`);
    console.log(`❌ Errors: ${errors}`);
    
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  } finally {
    await mongoClient.close();
  }
}

// Für GitHub Actions
if (process.env.GITHUB_ACTIONS) {
  processOCRForWines().catch(error => {
    console.error("GitHub Action failed:", error);
    process.exit(1);
  });
}

// Für lokale Tests
async function testOCR() {
  const imageUrl = "https://i.ibb.co/9K31whJ/Image-5.jpg";
  
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64Image = Buffer.from(response.data).toString("base64");
    
    const [result] = await client.documentTextDetection({
      image: { content: base64Image },
    });
    
    const fullText = result.fullTextAnnotation;
    
    if (!fullText) return console.log("Kein Text erkannt");
    
    console.log("🔎 Gesamter Text:\n", fullText.text);
    
    const processed = postProcessOCR(fullText);
    console.log("\n📑 Nachbearbeitete Zeilen:");
    processed.forEach(line => {
      console.log(`[${line.languages.join(", ")}] ${line.text}`);
    });
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Wenn direkt ausgeführt und nicht in GitHub Actions
if (!process.env.GITHUB_ACTIONS && import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    testOCR();
  } else {
    processOCRForWines();
  }
}

export { processOCRForWines, testOCR, postProcessOCR };
