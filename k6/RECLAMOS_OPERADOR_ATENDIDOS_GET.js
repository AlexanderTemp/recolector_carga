import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Reclamos_Operador_Atendidos_GET";
const VUS_COUNT = 10;
const TEST_DURATION = "5m";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUiLCJyb2xlcyI6WyJHRVNUT1JfUkVDTEFNT19FTlRJREFEIiwiVVNVQVJJTyJdLCJpZFJvbCI6IjUiLCJyb2wiOiJHRVNUT1JfUkVDTEFNT19FTlRJREFEIiwiaWRFbnRpZGFkIjoiNzQiLCJlbnRpZGFkIjoiRU5URUwgUy5BLiIsImlhdCI6MTc1OTc1NTIyMCwiZXhwIjoxNzU5NzYyNDIwfQ.v6p2_YB3Rjib1d9jeSOPnXDzit6f-AdWJGSZofLPf_w";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/reclamos/operador/atendidos?pagina=1&limite=10";

  const params = {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      Authorization: `Bearer ${BEARER_TOKEN}`,
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
    "estructura base correcta": (r) => {
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
    "filas con estructura esperada": (r) => {
      try {
        const body = r.json();
        if (
          !body.datos ||
          !Array.isArray(body.datos.filas) ||
          body.datos.filas.length === 0
        ) {
          return false;
        }

        const item = body.datos.filas[0];
        const baseCampos =
          typeof item.uuidReclamo === "string" &&
          typeof item.codigo === "string" &&
          typeof item.sector === "string" &&
          typeof item.fechaAcontecimiento === "string" &&
          typeof item.fechaCreacion === "string" &&
          typeof item.horaAproximada === "string" &&
          typeof item.transacciones === "object" &&
          typeof item.transacciones.accion === "string" &&
          typeof item.tiempoRespuesta === "number" &&
          typeof item.departamento === "object" &&
          typeof item.departamento.codigo === "string" &&
          typeof item.departamento.nombre === "string" &&
          typeof item.entidad === "object" &&
          typeof item.entidad.nombre === "string" &&
          Array.isArray(item.detallesReclamo) &&
          Array.isArray(item.incidentes);

        const reclamanteValido =
          item.reclamante === null ||
          (typeof item.reclamante === "object" &&
            typeof item.reclamante.nombres === "string");

        return baseCampos && reclamanteValido;
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
