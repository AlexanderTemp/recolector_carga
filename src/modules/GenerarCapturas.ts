import fs from "fs";
import path from "path";
import { generateTextSummary } from "./TextSummary";
import { createCanvas, loadImage } from "canvas";
import { FolderJsons, JsonFile } from "../types/global";

export const generarPNGs = async (
  validJsons: FolderJsons,
  outputBaseDir: string
) => {
  if (!fs.existsSync(outputBaseDir))
    fs.mkdirSync(outputBaseDir, { recursive: true });

  for (const [folderName, folderData] of Object.entries(validJsons)) {
    const folderOutput = path.join(outputBaseDir, folderName);
    if (!fs.existsSync(folderOutput))
      fs.mkdirSync(folderOutput, { recursive: true });

    for (const jsonFile of folderData.jsons) {
      try {
        const raw = fs.readFileSync(jsonFile.absolutePath, "utf8");
        const data = JSON.parse(raw);

        const resumenTexto: string = generateTextSummary(data, {
          indent: "  ",
          enableColors: true,
        });

        await createK6StylePNG(
          resumenTexto,
          folderOutput,
          jsonFile.name.replace(".json", ".png"),
          folderName, // ← Agregar folderName
          jsonFile.name // ← Agregar fileName
        );

        console.log(
          `✅ PNG generado: ${path.join(
            folderOutput,
            jsonFile.name.replace(".json", ".png")
          )}`
        );
      } catch (error) {
        console.error(`❌ Error procesando ${jsonFile.absolutePath}:`, error);
      }
    }
  }
};

async function createK6StylePNG(
  text: string,
  outputDir: string,
  filename: string,
  folderName: string, // ← Nuevo parámetro
  fileName: string // ← Nuevo parámetro
) {
  const lines = text.split("\n");

  const fontSize = 14;
  const lineHeight = 20;
  const padding = 25;
  const sectionSpacing = 8;

  const ctx = createCanvas(1, 1).getContext("2d");
  ctx.font = `${fontSize}px 'Courier New', monospace`;

  let maxWidth = 0;
  lines.forEach((line) => {
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "");
    const width = ctx.measureText(cleanLine).width;
    if (width > maxWidth) maxWidth = width;
  });

  // Aumentar altura para incluir la información del archivo
  const logoHeight = 100;
  const infoHeight = 40; // Espacio para la información del archivo
  const width = Math.ceil(maxWidth) + padding * 2;
  const height =
    lines.length * lineHeight +
    padding * 2 +
    logoHeight +
    infoHeight +
    sectionSpacing * 4;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.font = `${fontSize}px 'Courier New', monospace`;
  context.textBaseline = "top";

  drawK6AsciiLogo(context, width, padding);

  // Dibujar información del archivo
  drawFileInfo(context, width, padding + logoHeight + 10, folderName, fileName);

  let currentY = padding + logoHeight + infoHeight + sectionSpacing * 2;

  lines.forEach((line, index) => {
    if (line === "" && index > 0 && index < lines.length - 1) {
      currentY += sectionSpacing;
      return;
    }

    drawANSIFormattedText(context, line, padding, currentY);
    currentY += lineHeight;
  });

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(outputDir, filename), buffer);
}

function drawFileInfo(
  ctx: any,
  canvasWidth: number,
  y: number,
  folderName: string,
  fileName: string
) {
  const folderText = `Prueba de carga: ${folderName}`;
  const fileText = `Escenario: ${fileName}`;

  // Configurar estilo para la información del archivo
  ctx.fillStyle = "#374151"; // Gris oscuro
  ctx.font = "bold 12px 'Courier New', monospace";

  // Calcular posición centrada
  const folderWidth = ctx.measureText(folderText).width;
  const fileWidth = ctx.measureText(fileText).width;
  const maxWidth = Math.max(folderWidth, fileWidth);
  const infoX = (canvasWidth - maxWidth) / 2;

  // Dibujar información
  ctx.fillText(folderText, infoX, y);
  ctx.fillText(fileText, infoX, y + 18);

  // Línea separadora
  ctx.fillStyle = "#e5e7eb"; // Gris claro
  ctx.fillRect(infoX, y + 40, maxWidth, 1);
}

function drawK6AsciiLogo(ctx: any, canvasWidth: number, padding: number) {
  const logoLines = [
    "         /\\      Grafana   /‾‾/  ",
    "    /\\  /  \\     |\\  __   /  /   ",
    "   /  \\/    \\    | |/ /  /   ‾‾\\ ",
    "  /          \\   |   (  |  (‾)  |",
    " / __________ \\  |_|\\_\\  \\_____/ ",
  ];

  const orangeColor = "#ff780a";

  ctx.font = "bold 12px 'Courier New', monospace";

  const logoWidth = ctx.measureText(logoLines[0]).width;
  const logoX = (canvasWidth - logoWidth) / 2;

  logoLines.forEach((line, index) => {
    ctx.fillStyle = orangeColor;
    ctx.fillText(line, logoX, padding + index * 16);
  });

  ctx.fillStyle = "#666666";
  ctx.font = "11px 'Courier New', monospace";
  const versionText = "";
  const versionWidth = ctx.measureText(versionText).width;
  const versionX = (canvasWidth - versionWidth) / 2;
  ctx.fillText(versionText, versionX, padding + 90);
}

// Paleta moderna MODO DÍA - colores suaves pero legibles
const ansiColors: { [key: string]: string } = {
  "0": "#24292f", // reset - gris oscuro de GitHub
  "1": "#0d1117", // bold - casi negro
  "2": "#656d76", // faint - gris medio GitHub
  "22": "#24292f", // reset bold
  "30": "#24292f", // black
  "31": "#cf222e", // red - rojo GitHub
  "32": "#1a7f37", // green - verde GitHub
  "33": "#9a6700", // yellow - amarillo GitHub
  "34": "#0969da", // blue - azul GitHub
  "35": "#8250df", // magenta - púrpura GitHub
  "36": "#1b7c83", // cyan - cyan GitHub
  "37": "#57606a", // white - gris GitHub
  "39": "#24292f", // reset foreground
  "90": "#656d76", // bright black (gray)
  "91": "#a40e26", // bright red
  "92": "#0f5323", // bright green
  "93": "#7c4a03", // bright yellow
  "94": "#0550ae", // bright blue
  "95": "#6639ba", // bright magenta
  "96": "#0f6f78", // bright cyan
  "97": "#0d1117", // bright white
};

function drawANSIFormattedText(ctx: any, text: string, x: number, y: number) {
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  let currentX = x;
  let currentColor = "#1a1a1a";
  let currentAttributes: Set<string> = new Set();

  let lastIndex = 0;
  let match;

  while ((match = ansiRegex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) {
      ctx.fillStyle = currentColor;
      ctx.fillText(textBefore, currentX, y);
      currentX += ctx.measureText(textBefore).width;
    }

    const codes = match[1].split(";").filter((code) => code !== "");

    if (codes.length === 0) {
      currentColor = "#1a1a1a";
      currentAttributes.clear();
    } else {
      for (const code of codes) {
        if (code === "0") {
          currentColor = "#1a1a1a";
          currentAttributes.clear();
        } else if (code === "1") {
          currentAttributes.add("bold");
          if (currentColor === "#1a1a1a") currentColor = "#000000";
        } else if (code === "2") {
          currentAttributes.add("faint");
          currentColor = "#666666";
        } else if (code === "22") {
          currentAttributes.delete("bold");
          currentAttributes.delete("faint");
          currentColor = "#1a1a1a";
        } else if (ansiColors[code]) {
          currentColor = ansiColors[code];
        }
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    ctx.fillStyle = currentColor;
    ctx.fillText(remainingText, currentX, y);
  }
}
