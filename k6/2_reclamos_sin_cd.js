import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

import http from "k6/http";
import { check } from "k6";
import { ENV } from "./constants.js";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";

const archivo = open("./assets/dummy.pdf", "b");

export const options = {
  scenarios: {
    load_test: {
      executor: "constant-vus",
      vus: parseInt(__ENV.VUS || "10"),
      duration: __ENV.DURATION || "10s",
    },
  },
};

export default function () {
  const params = {
    headers: {},
  };

  const fd = new FormData();
  fd.append("reclamante[nroDocumento]", "10794206");
  fd.append("reclamante[nombres]", "lols");
  fd.append("reclamante[primerApellido]", "xD");
  fd.append("reclamante[segundoApellido]", "gaaaa");
  fd.append("reclamante[fechaNacimiento]", "nose");
  fd.append("reclamante[tipoDocumento]", "CI");
  fd.append("reclamante[telefono]", "69935122");
  fd.append(
    "reclamante[correoElectronico]",
    "nosenosenose@rkrkrkrkrkrkrkrkr.com"
  );
  fd.append("reclamo[esTitular]", "true");
  fd.append("reclamo[sector]", "Telecomunicaciones");
  fd.append("reclamo[idEntidad]", "74");

  fd.append("reclamo[lugarAcontecimiento]", "lasdfasdf");
  fd.append("reclamo[fechaAcontecimiento]", "2025-10-01T04:00:00.000Z");
  fd.append("reclamo[horaAproximada]", "03:15:00");
  fd.append("reclamo[idDepartamento]", "2");
  fd.append("descripcion", "asdfasdfasdfasdf");
  fd.append(
    "incidentes[0][valor]",
    "Problema de FacturaciÃ³n y/o Cobros indebidos"
  );
  fd.append("incidentes[0][grupo]", "Servicio mÃ³vil");
  fd.append("conformidad", "true");
  fd.append("archivos", http.file(archivo, "dummy.pdf", "application/pdf"));

  const res = http.post(`${ENV.BACKEND_URL}/reclamos/publicos`, fd.body(), {
    headers: { "Content-Type": "multipart/form-data; boundary=" + fd.boundary },
  });

  check(res, { "status is 201": (r) => r.status === 201 });

  if (res.status !== 201) {
    console.log("📣", res.status);
    console.log("📣", JSON.stringify(res.body));
  }
}

export function handleSummary(data) {
  const fileName = __ENV.FILE_NAME;
  const scenario = __ENV.SCENARIO;
  const outputDir = __ENV.OUTPUT_DIR || "./inputs";

  return {
    [`${outputDir}/${fileName}/${scenario}.json`]: JSON.stringify(
      data,
      null,
      2
    ),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
