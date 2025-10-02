import dotenv from "dotenv";
import { validarFolders } from "./modules/ValidadorDirectorio";
import { generarPNGs } from "./modules/GenerarCapturas";
import { generarReporteODT } from "./modules/GenerarReporte";
import { generarReporteBarras } from "./modules/GenerarGraficaComparativa";

dotenv.config();

const main = async () => {
  const ubicacionArchivo = process.env.FILE_LOCATION || "./";

  const validos = validarFolders(`${ubicacionArchivo}/inputs`);

  console.log("📣", JSON.stringify(validos, null, 2));

  await generarPNGs(validos, `${ubicacionArchivo}/outputs/captures`);
  await generarReporteBarras(validos, `${ubicacionArchivo}/outputs/reportes`);

  console.log("📣", JSON.stringify(validos));

  await generarReporteODT(
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
