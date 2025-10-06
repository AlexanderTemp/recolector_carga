import dotenv from "dotenv";
import { validarFolders } from "./modules/ValidadorDirectorio";
import { generarPNGs } from "./modules/GenerarCapturas";
import { generarReporteDOCX } from "./modules/GenerarReporte";
import { generarReporteBarras } from "./modules/GenerarGraficaComparativa";

dotenv.config();

const main = async () => {
  const ubicacionArchivo = process.env.FILE_LOCATION || "./";

  const validos = validarFolders(`${ubicacionArchivo}/inputs`);

  await generarPNGs(validos, `${ubicacionArchivo}/outputs/captures`, "media");
  await generarReporteBarras(validos, `${ubicacionArchivo}/outputs/reportes`);

  await generarReporteDOCX(
    validos,
    `${ubicacionArchivo}/outputs/captures`,
    `${ubicacionArchivo}/outputs/reportes`,
    `${ubicacionArchivo}/outputs/reporte-final.docx`
  );
};

main().finally();
