import fs from "fs";
import path from "path";

export const imageToBase64 = (imagePath: string): string => {
  try {
    if (!fs.existsSync(imagePath)) {
      console.warn(`⚠️ Imagen no encontrada: ${imagePath}`);
      return "";
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();

    // Determinar el MIME type correcto
    let mimeType = "image/png"; // Por defecto PNG
    if (ext === ".jpg" || ext === ".jpeg") {
      mimeType = "image/jpeg";
    } else if (ext === ".gif") {
      mimeType = "image/gif";
    } else if (ext === ".svg") {
      mimeType = "image/svg+xml";
    } else if (ext === ".bmp") {
      mimeType = "image/bmp";
    } else if (ext === ".webp") {
      mimeType = "image/webp";
    }

    const base64Data = imageBuffer.toString("base64");

    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    console.error(`❌ Error cargando imagen ${imagePath}:`, error);
    return "";
  }
};
