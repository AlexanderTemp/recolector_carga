// @ts-ignore
import * as carbone from "carbone";
import fs from "fs";
import path from "path";
import { FolderJsons } from "../types/global";
import { imageToBase64 } from "../helpers/images";

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

export const generarReporteODT = async (
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
          const imageName = jsonFile.name.replace(".json", ".png");
          const imagePath = path.join(capturesDir, folderName, imageName);
          const { vus, tiempo } = extraerInfoVusYTiempo(metrics, data);

          const escenario: EscenarioReporte = {
            orden: jsonFile.name.replace(".json", ""),
            imagen: imageToBase64(imagePath),
            vus,
            tiempo,
            iteraciones: generarTextoIteraciones(metrics),
            httpReqs: generarTextoHttpReqs(metrics),
            httpReqDuration: generarTextoHttpReqDuration(metrics),
            httpReqBlocked: generarTextoHttpReqBlocked(metrics),
          };

          prueba.escenarios.push(escenario);
        } catch (error) {
          console.error(`❌ Error procesando ${jsonFile.absolutePath}:`, error);
        }
      }
      dataReporte.pruebas.push(prueba);
    }

    const template = "./src/mocks/plantilla_carga_3.odt";

    carbone.render(template, dataReporte, function (err: any, result: any) {
      if (err) {
        console.error("Error generando reporte:", err);
        return;
      }

      const outputPath = outputFile.endsWith(".odt")
        ? outputFile
        : `${outputFile}/informe-generado.odt`;

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, result);
      console.log(`✅ Documento ODT generado: ${outputPath}`);
    });
  } catch (error) {
    console.error("❌ Error en generarReporteODT:", error);
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
