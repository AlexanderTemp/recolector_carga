import fs from "fs";
import path from "path";

export const imageToBase64 = (imagePath: string): string => {
  try {
    const absolutePath = path.resolve(__dirname, imagePath);
    const imageBuffer = fs.readFileSync(absolutePath);
    const base64Data = imageBuffer.toString("base64");
    return `data:image/png;base64,${base64Data}`;
  } catch (error) {
    console.error(`Error cargando imagen ${imagePath}:`, error);
    return "";
  }
};
