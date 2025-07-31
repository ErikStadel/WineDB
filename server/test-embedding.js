import vision from "@google-cloud/vision";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY);

const client = new vision.ImageAnnotatorClient({
  credentials,
});

function postProcessOCR(fullText) {
  if (!fullText?.pages) return [];

  const lines = [];
  fullText.pages.forEach(page => {
    page.blocks.forEach(block => {
      block.paragraphs.forEach(para => {
        const text = para.words.map(w => w.symbols.map(s => s.text).join("")).join(" ");
        const languages = new Set();
        para.words.forEach(word => {
          word.property?.detectedLanguages?.forEach(lang => languages.add(lang.languageCode));
        });

        const yPos = para.boundingBox.vertices.reduce((sum, v) => sum + v.y, 0) / para.boundingBox.vertices.length;

        lines.push({
          text: text.trim(),
          y: yPos,
          languages: [...languages],
        });
      });
    });
  });

  lines.sort((a, b) => a.y - b.y);

  const corrections = {
    'Chateu': 'Château',
    'vin': 'vin',
    'Wein': 'Wein',
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

async function testOCR() {
  const imageUrl = "https://i.ibb.co/3QNCjgq/1d586615-4337-4664-bf0c-9b8483fb083d.jpg";
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
}

testOCR();
