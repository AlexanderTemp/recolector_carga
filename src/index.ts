import dotenv from "dotenv";
import { validarFolders } from "./modules/ValidadorDirectorio";
import { generarPNGs } from "./modules/GenerarCapturas";
import { generarReporte } from "./modules/GenerarReporte";
import { imageToBase64 } from "./helpers/images";

dotenv.config();

const main = async () => {
  const ubicacionArchivo = process.env.FILE_LOCATION || "./";

  const validos = validarFolders(`${ubicacionArchivo}/inputs`);

  console.log("📣", JSON.stringify(validos, null, 2));

  await generarPNGs(validos, `${ubicacionArchivo}/outputs/captures`);

  await generarReporte(
    validos,
    `${ubicacionArchivo}/outputs/captures`,
    `${ubicacionArchivo}/outputs/informe_generado_2.docx`,
    {
      nombreProyecto: "hola",
      fechaFin: "",
      fechaInicio: "",
      equipo: ["juan", "perez"],
    }
  );
};

main().finally();
