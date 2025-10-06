// @ts-ignore
import carboneSDK from "carbone-sdk-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { FolderJsons } from "../types/global";
import { imageToBase64 } from "../helpers/images";

dotenv.config();

const _carboneService = carboneSDK(
  process.env.CARBONE_TOKEN || "TU_ACCESS_TOKEN_AQUI"
);

const testImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

interface EscenarioReporte {
  orden: string;
  imagen: string;
  vus: string;
  tiempo: string;
  iteraciones: string;
  httpReqs: string;
  httpReqDuration: string;
  httpReqBlocked: string;
}

interface PruebaReporte {
  nombre: string;
  url: string;
  escenarios: EscenarioReporte[];
}

interface DataReporte {
  nombreProyecto: string;
  fechaInicio: string;
  fechaFin: string;
  equipo: { nombre: string }[];
  pruebas: PruebaReporte[];
}

function evaluarMetrica(metrica: string, valor: number): string {
  const umbrales: {
    [key: string]: { bueno: number; regular: number; malo: number };
  } = {
    iteraciones: { bueno: 1000, regular: 500, malo: 100 },
    http_reqs: { bueno: 1000, regular: 500, malo: 100 },
    http_req_duration: { bueno: 1000, regular: 3000, malo: 5000 },
    http_req_blocked: { bueno: 100, regular: 500, malo: 1000 },
    tasa_iteraciones: { bueno: 50, regular: 20, malo: 5 },
    tasa_http_reqs: { bueno: 50, regular: 20, malo: 5 },
  };
  const umbral = umbrales[metrica];
  if (!umbral) return "Datos insuficientes para evaluación";

  if (valor <= umbral.bueno) return "Excelente rendimiento";
  if (valor <= umbral.regular) return "Rendimiento aceptable";
  if (valor <= umbral.malo) return "Rendimiento pobre - necesita optimización";
  return "Rendimiento crítico - requiere atención inmediata";
}

function generarTextoIteraciones(metrics: any): string {
  const iterations = metrics.iterations?.values;
  if (!iterations) return "No se encontraron datos de iteraciones";
  const count = iterations.count || 0;
  const rate = iterations.rate || 0;
  const interrupted = metrics.iteration_duration?.values?.count
    ? Math.max(0, (metrics.vus_max?.values?.max || 0) - count)
    : 0;
  const evaluacion = evaluarMetrica("iteraciones", count);
  const evaluacionTasa = evaluarMetrica("tasa_iteraciones", rate);
  return `Se realizaron ${count} iteraciones con tasa de ${rate.toFixed(
    2
  )} iteraciones/s. Iteraciones interrumpidas: ${interrupted}. ${evaluacion}. Tasa: ${evaluacionTasa.toLowerCase()}.`;
}

function generarTextoHttpReqs(metrics: any): string {
  const httpReqs = metrics.http_reqs?.values;
  if (!httpReqs) return "No se encontraron datos de solicitudes HTTP";
  const count = httpReqs.count || 0;
  const rate = httpReqs.rate || 0;
  const failed = metrics.http_req_failed?.values?.passes || 0;
  const successRate =
    count > 0 ? (((count - failed) / count) * 100).toFixed(2) : 0;
  const evaluacion = evaluarMetrica("http_reqs", count);
  const evaluacionTasa = evaluarMetrica("tasa_http_reqs", rate);
  return `Solicitudes realizadas: ${count} (tasa: ${rate.toFixed(
    2
  )}/s). Éxito: ${successRate}%. ${evaluacion}. Tasa: ${evaluacionTasa.toLowerCase()}.`;
}

function generarTextoHttpReqDuration(metrics: any): string {
  const duration = metrics.http_req_duration?.values;
  if (!duration) return "No se encontraron datos de duración de solicitudes";
  const avg = duration.avg || 0;
  const p95 = duration["p(95)"] || 0;
  const max = duration.max || 0;
  const evaluacion = evaluarMetrica("http_req_duration", avg);
  return `Tiempo promedio: ${(avg / 1000).toFixed(2)}s, P95: ${(
    p95 / 1000
  ).toFixed(2)}s, máximo: ${(max / 1000).toFixed(2)}s. ${evaluacion}.`;
}

function generarTextoHttpReqBlocked(metrics: any): string {
  const blocked = metrics.http_req_blocked?.values;
  if (!blocked) return "No se encontraron datos de solicitudes bloqueadas";
  const avg = blocked.avg || 0;
  const max = blocked.max || 0;
  const evaluacion = evaluarMetrica("http_req_blocked", avg);
  return `Promedio bloqueado: ${avg.toFixed(2)}ms, máximo: ${max.toFixed(
    2
  )}ms. ${evaluacion}.`;
}

function extraerInfoVusYTiempo(
  metrics: any,
  data: any
): { vus: string; tiempo: string } {
  const vusMax = metrics.vus_max?.values?.max || 0;
  const vus = metrics.vus?.values?.value || 0;
  const testDurationMs = data.state?.testRunDurationMs || 0;
  const minutes = Math.floor(testDurationMs / 60000);
  const seconds = Math.floor((testDurationMs % 60000) / 1000);
  const tiempo = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  return { vus: `${vus} VUs (máx: ${vusMax})`, tiempo };
}

export const generarReportePDF = async (
  validJsons: FolderJsons,
  capturesDir: string,
  outputFile: string,
  options: {
    nombreProyecto: string;
    fechaInicio: string;
    fechaFin: string;
    equipo: string[];
  }
) => {
  try {
    const dataReporte: DataReporte = {
      nombreProyecto: options.nombreProyecto,
      fechaInicio: options.fechaInicio,
      fechaFin: options.fechaFin,
      equipo: options.equipo.map((n) => ({ nombre: n })),
      pruebas: [],
    };

    for (const [folderName, folderData] of Object.entries(validJsons)) {
      const prueba: PruebaReporte = {
        nombre: folderName,
        url: `Capturas de ${folderName}`,
        escenarios: [],
      };

      for (const jsonFile of folderData.jsons) {
        try {
          const raw = fs.readFileSync(jsonFile.absolutePath, "utf8");
          const data = JSON.parse(raw);
          const metrics = data.metrics || {};
          const { vus, tiempo } = extraerInfoVusYTiempo(metrics, data);

          prueba.escenarios.push({
            orden: jsonFile.name.replace(".json", ""),
            imagen: testImage, // reemplaza con imageToBase64(imagePath) si quieres imagen real
            vus,
            tiempo,
            iteraciones: generarTextoIteraciones(metrics),
            httpReqs: generarTextoHttpReqs(metrics),
            httpReqDuration: generarTextoHttpReqDuration(metrics),
            httpReqBlocked: generarTextoHttpReqBlocked(metrics),
          });
        } catch (err) {
          console.error(`❌ Error procesando ${jsonFile.absolutePath}:`, err);
        }
      }

      dataReporte.pruebas.push(prueba);
    }

    console.log("📦 Enviando datos a Carbone Cloud...");

    const { content } = await _carboneService.render(
      "6ba923aa555cb10b68a201c159c03ccc10fa9f3fa9e0dd89c2af939707b526a6",
      { data: dataReporte, convertTo: "pdf" }
    );

    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const buffer = Buffer.from((await content.arrayBuffer?.()) || content);
    fs.writeFileSync(outputFile, buffer);

    console.log(`✅ Reporte PDF generado con éxito: ${outputFile}`);

    const jsonPath = path.join(outputDir, "informe-generado.json");
    fs.writeFileSync(jsonPath, JSON.stringify(dataReporte, null, 2), "utf8");
    console.log(`📄 Datos guardados en: ${jsonPath}`);
  } catch (error) {
    console.error("❌ Error generando reporte PDF:", error);
  }
};

export const validarPlantillaODT = (templatePath: string): boolean => {
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Plantilla no encontrada: ${templatePath}`);
    return false;
  }
  if (!templatePath.endsWith(".odt")) {
    console.error(`❌ La plantilla debe ser un archivo .odt: ${templatePath}`);
    return false;
  }
  return true;
};
