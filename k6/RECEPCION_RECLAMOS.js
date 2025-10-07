import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Recepcionados_GET";
const VUS_COUNT = 1000;
const TEST_DURATION = "10m";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUiLCJyb2xlcyI6WyJHRVNUT1JfUkVDTEFNT19FTlRJREFEIiwiVVNVQVJJTyJdLCJpZFJvbCI6IjUiLCJyb2wiOiJHRVNUT1JfUkVDTEFNT19FTlRJREFEIiwiaWRFbnRpZGFkIjoiNzQiLCJlbnRpZGFkIjoiRU5URUwgUy5BLiIsImlhdCI6MTc1OTUwMzg5MCwiZXhwIjoxNzU5NTExMDkwfQ.MGltygudFUvPo-cHWVYiPU_FOHYURKFlBiM6sg7V-vY";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/recepcion-reclamos/listar/recepcionados?pagina=1&limite=10";

  const params = {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      Authorization: `Bearer ${BEARER_TOKEN}`,
      Referer:
        "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/admin/recepcion-reclamos/recepcionados",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Cookie:
        "base.connect.sid=s%3Az8C1ezNzkusNygMTHTMpYDIZ2gX5YVHt.dTrl2a%2FwF1kFURv8pQjtuWS3GTDBKsr07LRA%2FM2Z8fU; jid=kAPNf_mLTJxa18Wvu9T4J; token=" +
        BEARER_TOKEN,
      IfNoneMatch: 'W/"494-ew7Z85qMR0mAAOa0KogSU9Tl7+0"',
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
          typeof body.mensaje === "string" &&
          Array.isArray(body.datos) &&
          Array.isArray(body.datos[0])
        );
      } catch (e) {
        return false;
      }
    },
    "datos[0] tiene elementos con estructura correcta": (r) => {
      try {
        const body = r.json();
        if (!Array.isArray(body.datos) || body.datos.length === 0) {
          return false;
        }
        const firstItem = body.datos[0][0];
        return (
          typeof firstItem.estado === "string" &&
          typeof firstItem.uuidReclamo === "string" &&
          typeof firstItem.codigo === "string" &&
          typeof firstItem.sector === "string" &&
          typeof firstItem.departamento === "object" &&
          typeof firstItem.entidad === "object" &&
          Array.isArray(firstItem.detallesReclamo) &&
          Array.isArray(firstItem.incidentes) &&
          typeof firstItem.reclamante === "object"
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
