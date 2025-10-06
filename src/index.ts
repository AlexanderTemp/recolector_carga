import dotenv from "dotenv";
import { validarFolders } from "./modules/ValidadorDirectorio";
import { generarPNGs } from "./modules/GenerarCapturas";
import { generarReportePDF } from "./modules/GenerarReporte";
import { generarReporteBarras } from "./modules/GenerarGraficaComparativa";

dotenv.config();

const main = async () => {
  const ubicacionArchivo = process.env.FILE_LOCATION || "./";

  const validos = validarFolders(`${ubicacionArchivo}/inputs`);

  await generarPNGs(validos, `${ubicacionArchivo}/outputs/captures`);
  await generarReporteBarras(validos, `${ubicacionArchivo}/outputs/reportes`);

  await generarReportePDF(
    validos,
    `${ubicacionArchivo}/outputs/captures`,
    `${ubicacionArchivo}/outputs/plantilla_carga_3.odt`,
    {
      nombreProyecto: "hola",
      fechaFin: "",
      fechaInicio: "",
      equipo: ["juan", "perez"],
    }
  );
};

main().finally();
