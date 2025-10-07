import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Reclamos_POST";
const VUS_COUNT = 1;
const TEST_DURATION = "5s";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjciLCJyb2xlcyI6WyJVU1VBUklPIl0sImlkUm9sIjoiNiIsInJvbCI6IlVTVUFSSU8iLCJpYXQiOjE3NTk3ODEyMDQsImV4cCI6MTc1OTc4ODQwNH0.qxrLV0N7FlINxg6zGY2fYBZUQlGIJRPJhFHVCCfN-0U";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/reclamos";

  const payload = JSON.stringify({
    esTitular: true,
    sector: "Transporte Ferroviario",
    idEntidad: "306",
    lugarAcontecimiento: "SANTA",
    fechaAcontecimiento: "2025-10-04",
    horaAproximada: "08:30:00",
    idDepartamento: "7",
    paso: 1,
  });

  const params = {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEARER_TOKEN}`,
      Cookie: "jid=eu7oXK7zashcBOLT2CiHA; token=" + BEARER_TOKEN,
      Origin: "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo",
      Referer:
        "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/reclamos/crear-nuevo",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Priority: "u=0",
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    "status es 200 o 201": (r) => r.status === 200 || r.status === 201,
    "respuesta tiene JSON válido": (r) => {
      try {
        const body = r.json();
        return typeof body === "object" && body !== null;
      } catch (e) {
        return false;
      }
    },
    "estructura esperada en POST": (r) => {
      try {
        const body = r.json();
        return (
          body.finalizado === true &&
          body.mensaje === "Registro creado con éxito." &&
          typeof body.datos === "object" &&
          typeof body.datos.id === "string" &&
          body.datos.estado === "ACTIVO"
        );
      } catch (e) {
        return false;
      }
    },
    "tiempo de respuesta aceptable": (r) => r.timings.duration < 2000,
  });
}

export function handleSummary(data) {
  const fileName = `${TEST_NAME}_vus${VUS_COUNT}_${TEST_DURATION}.json`;

  return {
    [fileName]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
  };
}
