import fs from "fs/promises";
import axios from "axios";
import sharp from "sharp";
import path from "path";
import { pipeline } from "@huggingface/transformers";

async function test() {
  // Modell laden – image-to-text Pipeline
  const ocr = await pipeline("image-to-text", "Xenova/trocr-base-printed");

  // Bild laden und vorverarbeiten
  const response = await axios.get(
    "https://i.ibb.co/1fScc6Gh/25456c98-fc69-4a84-be93-14fe9360d583.jpg",
    { responseType: "arraybuffer" }
  );

  const imageBuffer = await sharp(Buffer.from(response.data))
    .jpeg({ quality: 90 })
    .resize({ width: 512, height: 512, fit: "contain", background: "white" })
    .sharpen()
    .toBuffer();

  const tempFilePath = path.join(process.cwd(), "temp_test.jpg");
  await fs.writeFile(tempFilePath, imageBuffer);

  // OCR ausführen
  const result = await ocr(tempFilePath);
  console.log("OCR-Result:", result);

  await fs.unlink(tempFilePath);
}

test();
