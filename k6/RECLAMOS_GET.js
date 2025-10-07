import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Reclamos_GET";
const VUS_COUNT = 50;
const TEST_DURATION = "5m";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgiLCJyb2xlcyI6WyJVU1VBUklPIl0sImlkUm9sIjoiNiIsInJvbCI6IlVTVUFSSU8iLCJpYXQiOjE3NTk0MTA5NDQsImV4cCI6MTc1OTQxODE0NH0.7BfeoCniB2ctdM3T8Kor4vsgSMqiRizTYmK_LePKXkI";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/reclamos?pagina=1&limite=10";

  const params = {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      Authorization: `Bearer ${BEARER_TOKEN}`,
      Referer:
        "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/reclamos/bandeja",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Priority: "u=0",
    },
  };

  const res = http.get(url, params);

  check(res, {
    "status es 200": (r) => r.status === 200 || r.status === 201,
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
          body.mensaje === "Registros obtenidos con éxito." &&
          typeof body.datos === "object" &&
          typeof body.datos.total === "number" &&
          Array.isArray(body.datos.filas)
        );
      } catch (e) {
        return false;
      }
    },
    "datos.filas tiene elementos con estructura correcta": (r) => {
      try {
        const body = r.json();
        if (
          !body.datos ||
          !Array.isArray(body.datos.filas) ||
          body.datos.filas.length === 0
        ) {
          return false;
        }

        const firstItem = body.datos.filas[0];
        return (
          typeof firstItem.estado === "string" &&
          typeof firstItem.uuidReclamo === "string" &&
          typeof firstItem.codigo === "string" &&
          typeof firstItem.sector === "string" &&
          typeof firstItem.departamento === "object" &&
          typeof firstItem.entidad === "object" &&
          Array.isArray(firstItem.detallesReclamo) &&
          Array.isArray(firstItem.incidentes)
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
