import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { FolderJsons } from "../types/global";
import * as docx from "docx";
import sharp from "sharp";

dotenv.config();

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
  const umbrales: Record<
    string,
    { bueno: number; regular: number; malo: number }
  > = {
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

function generarTextoIteraciones(metrics: any): {
  texto: string;
  evaluacion: string;
} {
  const iterations = metrics.iterations?.values;
  if (!iterations)
    return {
      texto: "No se encontraron datos de iteraciones",
      evaluacion: "Sin datos",
    };

  const count = iterations.count || 0;
  const rate = iterations.rate || 0;
  const interrupted = metrics.iteration_duration?.values?.count
    ? Math.max(0, (metrics.vus_max?.values?.max || 0) - count)
    : 0;

  const evaluacion = evaluarMetrica("iteraciones", count);
  const evaluacionTasa = evaluarMetrica("tasa_iteraciones", rate);

  const texto = `El cual nos indica que se realizaron ${count} iteraciones (flujos finalizados) con una tasa de ${rate.toFixed(
    2
  )} iteraciones por segundo, también nos indica el número de iteraciones interrumpidas (${interrupted}).`;

  return { texto, evaluacion };
}

function generarTextoHttpReqs(metrics: any): {
  texto: string;
  evaluacion: string;
} {
  const httpReqs = metrics.http_reqs?.values;
  if (!httpReqs)
    return {
      texto: "No se encontraron datos de solicitudes HTTP",
      evaluacion: "Sin datos",
    };

  const count = httpReqs.count || 0;
  const rate = httpReqs.rate || 0;
  const failed = metrics.http_req_failed?.values?.passes || 0;
  const successRate =
    count > 0 ? (((count - failed) / count) * 100).toFixed(2) : 0;

  const evaluacion = evaluarMetrica("http_reqs", count);
  const evaluacionTasa = evaluarMetrica("tasa_http_reqs", rate);

  const texto = `Este parámetro nos indica el número de solicitudes realizadas (${count}) con una tasa de ${rate.toFixed(
    2
  )} solicitudes por segundo.`;

  return { texto, evaluacion };
}

function generarTextoHttpReqDuration(metrics: any): {
  texto: string;
  evaluacion: string;
} {
  const duration = metrics.http_req_duration?.values;
  if (!duration)
    return {
      texto: "No se encontraron datos de duración de solicitudes",
      evaluacion: "Sin datos",
    };

  const avg = duration.avg || 0;
  const p95 = duration["p(95)"] || 0;
  const max = duration.max || 0;

  const evaluacion = evaluarMetrica("http_req_duration", avg);

  const texto = `Este parámetro nos indica el tiempo estimado de duración de cada petición, teniendo como resultados un tiempo promedio de ${(
    avg / 1000
  ).toFixed(2)}s, un P95 de ${(p95 / 1000).toFixed(2)}s y un máximo de ${(
    max / 1000
  ).toFixed(2)}s.`;

  return { texto, evaluacion };
}

function generarTextoHttpReqBlocked(metrics: any): {
  texto: string;
  evaluacion: string;
} {
  const blocked = metrics.http_req_blocked?.values;
  if (!blocked)
    return {
      texto: "No se encontraron datos de solicitudes bloqueadas",
      evaluacion: "Sin datos",
    };

  const avg = blocked.avg || 0;
  const max = blocked.max || 0;
  const evaluacion = evaluarMetrica("http_req_blocked", avg);

  const texto = `Este parámetro nos indica el tiempo estimado de duración de las peticiones bloqueadas, teniendo como resultados un tiempo promedio de ${avg.toFixed(
    2
  )}ms y un máximo de ${max.toFixed(2)}ms.`;

  return { texto, evaluacion };
}

function extraerInfoVusYTiempo(
  metrics: any,
  data: any
): { vus: string; tiempo: string } {
  const vus = metrics.vus?.values?.max || 0;
  const testDurationMs = data.state?.testRunDurationMs || 0;
  const minutes = Math.floor(testDurationMs / 60000);
  const seconds = Math.floor((testDurationMs % 60000) / 1000);
  const tiempo = minutes > 0 ? `${minutes} minutos ` : `${seconds} segundos`;
  return { vus: `${vus} usuarios virtuales`, tiempo };
}

export async function generarReporteDOCX(
  validJsons: FolderJsons,
  capturesDir: string,
  reportesDir: string,
  outputFile: string
) {
  const sections: docx.ISectionOptions[] = [];
  const pageWidthTwips = 12240;
  const pageMargin = 720;
  const usableWidth = pageWidthTwips - pageMargin * 2;
  const children: docx.Paragraph[] = [];

  let pos_prueba = 0;
  let pos_carga = 0;

  for (const [folderName, folderData] of Object.entries(validJsons)) {
    pos_prueba++;
    pos_carga++;

    children.push(
      new docx.Paragraph({
        spacing: { after: 200, before: 200 },
        children: [
          new docx.TextRun({
            text: `3.${pos_prueba} ${folderName.replace(/_+/g, " ").trim()}`,
            allCaps: true,
            size: 32,
            font: "Arial",
          }),
        ],
      })
    );

    children.push(
      new docx.Paragraph({
        spacing: { after: 200, before: 200 },
        children: [
          new docx.TextRun({
            text: `${folderData.urls.join(", ")}`,
            size: 24,
            font: "Arial",
          }),
        ],
      })
    );

    let segmentoPrueba = `3.${pos_carga}.${pos_prueba}`;
    children.push(
      new docx.Paragraph({
        spacing: { after: 200, before: 200 },
        children: [
          new docx.TextRun({
            text: `${segmentoPrueba} Pruebas de carga`,
            bold: true,
            size: 28,
            font: "Arial",
          }),
        ],
      })
    );

    let pos = 0;

    for (const jsonFile of folderData.jsons) {
      pos++;
      try {
        const raw = fs.readFileSync(jsonFile.absolutePath, "utf8");
        const data = JSON.parse(raw);
        const metrics = data.metrics || {};
        const { vus, tiempo } = extraerInfoVusYTiempo(metrics, data);

        const imageName = jsonFile.name.replace(".json", ".png");
        const imagePath = path.join(capturesDir, folderName, imageName);

        let imageRun: docx.ImageRun | null = null;

        if (fs.existsSync(imagePath)) {
          const buffer = fs.readFileSync(imagePath);
          const metadata = await sharp(buffer).metadata();

          const maxWidth = 600;
          const scale = metadata.width
            ? Math.min(1, maxWidth / metadata.width)
            : 1;

          const width = metadata.width
            ? Math.floor(metadata.width * scale)
            : maxWidth;
          const height = metadata.height
            ? Math.floor(metadata.height * scale)
            : 200;

          imageRun = new docx.ImageRun({
            data: buffer,
            transformation: { width, height },
            type: "png",
          });
        }
        const { texto: textoIter, evaluacion: evalIter } =
          generarTextoIteraciones(metrics);
        const { texto: textoHttp, evaluacion: evalHttp } =
          generarTextoHttpReqs(metrics);
        const { texto: textoDur, evaluacion: evalDur } =
          generarTextoHttpReqDuration(metrics);
        const { texto: textoBloq, evaluacion: evalBloq } =
          generarTextoHttpReqBlocked(metrics);

        const crearParrafoDescriptivo = (titulo: string, descripcion: string) =>
          new docx.Paragraph({
            bullet: { level: 0 },
            children: [
              new docx.TextRun({
                text: `${titulo}: `,
                bold: true,
                font: "Arial",
                size: 24,
              }),
              new docx.TextRun({
                text: descripcion,
                font: "Arial",
                size: 24,
              }),
            ],
            spacing: { after: 150, before: 150 },
          });

        children.push(
          new docx.Paragraph({
            spacing: { after: 50 },
            children: [
              new docx.TextRun({
                text: `${segmentoPrueba}.${pos} Escenario ${pos}`,
                bold: true,
                size: 26,
                font: "Arial",
              }),
            ],
          })
        );

        if (imageRun) {
          children.push(
            new docx.Paragraph({
              children: [imageRun],
              alignment: docx.AlignmentType.CENTER,
              spacing: { after: 100 },
            })
          );
        } else {
          children.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: "⚠️ Imagen no disponible",
                  font: "Arial",
                }),
              ],
              alignment: docx.AlignmentType.CENTER,
              spacing: { after: 100 },
            })
          );
        }

        children.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: `${vus} / ${tiempo}`,
                font: "Arial",
                size: 24,
              }),
            ],
            alignment: docx.AlignmentType.CENTER,
            spacing: { after: 100 },
          })
        );

        children.push(
          new docx.Paragraph({
            spacing: { before: 200, after: 50 },
            children: [
              new docx.TextRun({
                text: "Análisis.",
                bold: true,
                font: "Arial",
                size: 24,
              }),
            ],
          })
        );

        children.push(
          new docx.Paragraph({
            spacing: { after: 200 },
            children: [
              new docx.TextRun({
                text: "Al término de la ejecución de las pruebas de carga, las métricas más importantes son:",
                font: "Arial",
                size: 24,
              }),
            ],
          })
        );

        children.push(
          crearParrafoDescriptivo("Iteraciones", `(${evalIter}) ${textoIter}`),
          crearParrafoDescriptivo(
            "Solicitudes HTTP",
            `(${evalHttp}) ${textoHttp}`
          ),
          crearParrafoDescriptivo(
            "Duración de Solicitudes",
            `(${evalDur}) ${textoDur}`
          ),
          crearParrafoDescriptivo(
            "Solicitudes Bloqueadas",
            `(${evalBloq}) ${textoBloq}`
          )
        );
        children.push(
          new docx.Paragraph({
            spacing: { after: 200 },
            children: [new docx.TextRun({ text: "", font: "Arial", size: 24 })],
          })
        );
      } catch (err) {
        console.error(`❌ Error procesando ${jsonFile.absolutePath}:`, err);
      }
    }

    children.push(new docx.Paragraph({ spacing: { after: 500, before: 500 } }));
  }

  children.push(
    new docx.Paragraph({
      spacing: { before: 500, after: 300 },
      children: [
        new docx.TextRun({
          text: "RESUMEN DE GRÁFICAS GENERALES",
          bold: true,
          allCaps: true,
          size: 32,
          font: "Arial",
        }),
      ],
    })
  );

  for (const [folderName] of Object.entries(validJsons)) {
    const graficaPath = path.join(
      reportesDir,
      folderName,
      "reporte_barras_k6.png"
    );
    if (!fs.existsSync(graficaPath)) continue;

    const buffer = fs.readFileSync(graficaPath);
    const metadata = await sharp(buffer).metadata();
    const maxWidth = 600;
    const scale = metadata.width ? Math.min(1, maxWidth / metadata.width) : 1;
    const width = metadata.width
      ? Math.floor(metadata.width * scale)
      : maxWidth;
    const height = metadata.height ? Math.floor(metadata.height * scale) : 200;

    const graficaRun = new docx.ImageRun({
      data: buffer,
      transformation: { width, height },
      type: "png",
    });

    children.push(
      new docx.Paragraph({
        spacing: { before: 300, after: 200 },
        children: [
          new docx.TextRun({
            text: folderName.replace(/_+/g, " ").trim(),
            bold: true,
            size: 28,
            font: "Arial",
          }),
        ],
      })
    );

    children.push(
      new docx.Paragraph({
        children: [graficaRun],
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  sections.push({
    properties: {
      page: {
        margin: {
          top: pageMargin,
          bottom: pageMargin,
          left: pageMargin,
          right: pageMargin,
        },
      },
    },
    children,
  });

  const doc = new docx.Document({ sections });
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const docBuffer = await docx.Packer.toBuffer(doc);
  fs.writeFileSync(outputFile, docBuffer);

  console.log(`✅ Reporte DOCX generado correctamente en: ${outputFile}`);
}
