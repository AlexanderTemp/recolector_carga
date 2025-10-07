import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Reclamos_Operador_Nuevos_GET";
const VUS_COUNT = 500;
const TEST_DURATION = "10m";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUiLCJyb2xlcyI6WyJHRVNUT1JfUkVDTEFNT19FTlRJREFEIiwiVVNVQVJJTyJdLCJpZFJvbCI6IjUiLCJyb2wiOiJHRVNUT1JfUkVDTEFNT19FTlRJREFEIiwiaWRFbnRpZGFkIjoiNzQiLCJlbnRpZGFkIjoiRU5URUwgUy5BLiIsImlhdCI6MTc1OTUxNTk0MywiZXhwIjoxNzU5NTIzMTQzfQ.i4C1t7beZGJxxhpv_-mvqT7HueeWAvazJOmbKG1rjU0";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/reclamos/operador/nuevos?pagina=2&limite=10";

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
      Cookie:
        "base.connect.sid=s%3AdZ6HbTbn5XH5MMmL-SaPJFJ7Jno4NM2t.M6W%2F8uG%2B8H2CnA67EwEzuJMgce5PFgVr0H%2F0Gxb%2B6xI; jid=cLTuC-lhOz-1thd3-bAVx; token=" +
        BEARER_TOKEN,
    },
  };

  const res = http.get(url, params);

  check(res, {
    "status es 200": (r) => r.status === 200 || r.status === 201,
    "respuesta tiene JSON válido": (r) => {
      try {
        const body = r.json();
        return typeof body === "object" && body !== null;
      } catch {
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
      } catch {
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
          typeof firstItem.uuidReclamo === "string" &&
          typeof firstItem.codigo === "string" &&
          typeof firstItem.sector === "string" &&
          typeof firstItem.fechaAcontecimiento === "string" &&
          typeof firstItem.fechaCreacion === "string" &&
          typeof firstItem.horaAproximada === "string" &&
          typeof firstItem.transacciones === "object" &&
          typeof firstItem.transacciones.accion === "string" &&
          typeof firstItem.tiempoRespuesta === "number" &&
          typeof firstItem.departamento === "object" &&
          typeof firstItem.departamento.codigo === "string" &&
          typeof firstItem.departamento.nombre === "string" &&
          typeof firstItem.entidad === "object" &&
          typeof firstItem.entidad.nombre === "string" &&
          Array.isArray(firstItem.detallesReclamo) &&
          Array.isArray(firstItem.incidentes) &&
          typeof firstItem.reclamante === "object" &&
          typeof firstItem.reclamante.nombres === "string" &&
          typeof firstItem.reclamante.correoElectronico === "string" &&
          typeof firstItem.reclamante.primerApellido === "string" &&
          typeof firstItem.reclamante.segundoApellido === "string" &&
          typeof firstItem.reclamante.telefono === "string"
        );
      } catch {
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
