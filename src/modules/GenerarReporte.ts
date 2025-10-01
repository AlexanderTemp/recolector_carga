// @ts-ignore
import * as carbone from "carbone";
import fs from "fs";
import path from "path";
import { FolderJsons, JsonFile } from "../types/global";
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

// Función para evaluar umbrales y generar texto descriptivo
function evaluarMetrica(metrica: string, valor: number): string {
  const umbrales: {
    [key: string]: { bueno: number; regular: number; malo: number };
  } = {
    iteraciones: { bueno: 1000, regular: 500, malo: 100 },
    http_reqs: { bueno: 1000, regular: 500, malo: 100 },
    http_req_duration: { bueno: 1000, regular: 3000, malo: 5000 }, // ms
    http_req_blocked: { bueno: 100, regular: 500, malo: 1000 }, // ms
    tasa_iteraciones: { bueno: 50, regular: 20, malo: 5 }, // iteraciones/segundo
    tasa_http_reqs: { bueno: 50, regular: 20, malo: 5 }, // reqs/segundo
  };

  const umbral = umbrales[metrica];
  if (!umbral) return "Datos insuficientes para evaluación";

  let evaluacion = "";
  if (valor <= umbral.bueno) {
    evaluacion = "Excelente rendimiento";
  } else if (valor <= umbral.regular) {
    evaluacion = "Rendimiento aceptable";
  } else if (valor <= umbral.malo) {
    evaluacion = "Rendimiento pobre - necesita optimización";
  } else {
    evaluacion = "Rendimiento crítico - requiere atención inmediata";
  }

  return evaluacion;
}

// Función para generar texto descriptivo de iteraciones
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

  return `El cual nos indica que se realizaron ${count} iteraciones (flujos finalizados) con una tasa de ${rate.toFixed(
    2
  )} iteraciones por segundo, también nos indica el número de iteraciones interrumpidas (${interrupted}). ${evaluacion}. La tasa de iteraciones es ${evaluacionTasa.toLowerCase()}.`;
}

// Función para generar texto descriptivo de HTTP requests
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

  return `Este parámetro nos indica el número de solicitudes realizadas (${count}) con una tasa de ${rate.toFixed(
    2
  )} solicitudes por segundo. Tasa de éxito: ${successRate}%. ${evaluacion}. La tasa de solicitudes es ${evaluacionTasa.toLowerCase()}.`;
}

// Función para generar texto descriptivo de duración de requests
function generarTextoHttpReqDuration(metrics: any): string {
  const duration = metrics.http_req_duration?.values;
  if (!duration) return "No se encontraron datos de duración de solicitudes";

  const avg = duration.avg || 0;
  const p95 = duration["p(95)"] || 0;
  const max = duration.max || 0;

  const evaluacion = evaluarMetrica("http_req_duration", avg);

  return `Este parámetro nos indica el tiempo estimado de duración de cada petición, teniendo como resultados un tiempo promedio de ${(
    avg / 1000
  ).toFixed(2)}s, percentil 95 de ${(p95 / 1000).toFixed(2)}s y máximo de ${(
    max / 1000
  ).toFixed(2)}s. ${evaluacion}.`;
}

// Función para generar texto descriptivo de requests bloqueados
function generarTextoHttpReqBlocked(metrics: any): string {
  const blocked = metrics.http_req_blocked?.values;
  if (!blocked) return "No se encontraron datos de solicitudes bloqueadas";

  const avg = blocked.avg || 0;
  const max = blocked.max || 0;

  const evaluacion = evaluarMetrica("http_req_blocked", avg);

  // Convertir a unidades más legibles
  let avgText = `${avg.toFixed(2)}ms`;
  let maxText = `${max.toFixed(2)}ms`;

  if (avg < 1) {
    avgText = `${(avg * 1000).toFixed(2)}μs`;
  }
  if (max < 1) {
    maxText = `${(max * 1000).toFixed(2)}μs`;
  }

  return `Este parámetro nos indica el tiempo estimado de duración de las peticiones bloqueadas, teniendo como resultados un tiempo promedio de ${avgText} y máximo de ${maxText}. ${evaluacion}.`;
}

// Función para extraer información de VUs y tiempo
function extraerInfoVusYTiempo(
  metrics: any,
  data: any
): { vus: string; tiempo: string } {
  const vusMax = metrics.vus_max?.values?.max || 0;
  const vus = metrics.vus?.values?.value || 0;
  const testDurationMs = data.state?.testRunDurationMs || 0;

  // Convertir duración a formato legible
  const minutes = Math.floor(testDurationMs / 60000);
  const seconds = Math.floor((testDurationMs % 60000) / 1000);
  const tiempo = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return {
    vus: `${vus} VUs (máximo: ${vusMax} VUs)`,
    tiempo: tiempo,
  };
}

export const generarReporte = async (
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
      equipo: options.equipo.map((nombre) => ({ nombre })),
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
            vus: vus,
            tiempo: tiempo,
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

    const template = "./src/mocks/test_word.docx";

    carbone.render(template, dataReporte, function (err: any, result: any) {
      if (err) {
        console.error("Error generando reporte:", err);
        return;
      }

      const outputPath = outputFile.endsWith(".docx")
        ? outputFile
        : `${outputFile}/informe-generado.docx`;

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, result);
      console.log(`✅ Documento DOCX generado: ${outputPath}`);
    });
  } catch (error) {
    console.error("❌ Error en generarReporte:", error);
  }
};

export const generarReporteDesdeData = async (
  dataReporte: DataReporte,
  template: string,
  outputFile: string
) => {
  carbone.render(template, dataReporte, function (err: any, result: any) {
    if (err) {
      console.error("Error:", err);
      return;
    }

    const outputPath = outputFile.endsWith(".docx")
      ? outputFile
      : `${outputFile}/informe-generado.docx`;

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, result);
    console.log(`✅ Documento DOCX generado: ${outputPath}`);
  });
};

export const validarPlantillaDOCX = (templatePath: string): boolean => {
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Plantilla no encontrada: ${templatePath}`);
    return false;
  }

  if (!templatePath.endsWith(".docx")) {
    console.error(`❌ La plantilla debe ser un archivo .docx: ${templatePath}`);
    return false;
  }

  return true;
};
