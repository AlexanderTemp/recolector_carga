import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Reclamo_GET_ID";
const VUS_COUNT = 1000;
const TEST_DURATION = "10m";

const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgiLCJyb2xlcyI6WyJVU1VBUklPIl0sImlkUm9sIjoiNiIsInJvbCI6IlVTVUFSSU8iLCJpYXQiOjE3NTk0MzE3MDQsImV4cCI6MTc1OTQzODkwNH0.fqXjqvG-qflSjkHVnvTvlNjcqi0kPk2hBNAvAhuO8tA";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/reclamos/246b3969-ad1b-43d2-b9b4-bd0ffca2bd22";

  const params = {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      Authorization: `Bearer ${BEARER_TOKEN}`,
      Referer:
        "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/reclamos/components/acciones?uuid=246b3969-ad1b-43d2-b9b4-bd0ffca2bd22",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    },
  };

  const res = http.get(url, params);

  check(res, {
    "status es 200": (r) => r.status === 200,
    "respuesta tiene JSON válido": (r) => {
      try {
        const body = r.json();
        return typeof body === "object" && body !== null;
      } catch (e) {
        return false;
      }
    },
    "respuesta tiene estructura esperada": (r) => {
      try {
        const body = r.json();
        return (
          body.finalizado === true &&
          body.mensaje === "¡Tarea completada con éxito!" &&
          typeof body.datos === "object"
        );
      } catch (e) {
        return false;
      }
    },
    "datos principales correctos": (r) => {
      try {
        const datos = r.json().datos;
        return (
          typeof datos.estado === "string" &&
          typeof datos.uuidReclamo === "string" &&
          typeof datos.codigo === "string" &&
          typeof datos.sector === "string" &&
          typeof datos.entidad === "object" &&
          typeof datos.departamento === "object" &&
          typeof datos.reclamante === "object"
        );
      } catch (e) {
        return false;
      }
    },
    "incidentes y detalles presentes": (r) => {
      try {
        const datos = r.json().datos;
        return (
          Array.isArray(datos.incidentes) &&
          datos.incidentes.length > 0 &&
          Array.isArray(datos.detallesReclamo) &&
          datos.detallesReclamo.length > 0
        );
      } catch (e) {
        return false;
      }
    },
    "adjuntos presentes y válidos": (r) => {
      try {
        const datos = r.json().datos;
        return (
          Array.isArray(datos.adjuntos) &&
          typeof datos.adjuntos[0].uuidAdjunto === "string" &&
          typeof datos.adjuntos[0].nombreOriginal === "string"
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
