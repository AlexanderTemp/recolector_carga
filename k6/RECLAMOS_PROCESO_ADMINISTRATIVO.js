import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Reclamos_Proceso_Administrativo_GET";
const VUS_COUNT = 10;
const TEST_DURATION = "5m";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUiLCJyb2xlcyI6WyJHRVNUT1JfUkVDTEFNT19FTlRJREFEIiwiVVNVQVJJTyIsIkFETUlOSVNUUkFET1JfRU5USURBRCIsIkdFU1RPUl9SRUNMQU1PX1JFR1VMQURPUiIsIkFETUlOSVNUUkFET1JfUkVHVUxBRE9SIiwiQURNSU5JU1RSQURPUiIsIlRFQ05JQ09fUkVHVUxBRE9SIl0sImlkUm9sIjoiNSIsInJvbCI6IkdFU1RPUl9SRUNMQU1PX0VOVElEQUQiLCJpZEVudGlkYWQiOiI3NCIsImVudGlkYWQiOiJFTlRFTCBTLkEuIiwiaWF0IjoxNzU5NzYwNzg2LCJleHAiOjE3NTk3Njc5ODZ9.NIDxC2Va8WQ6j9_4E_UfcgrR9KhNc8qOXc8K4qG8gN4";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/regulador/reclamos/proceso-administrativo?pagina=1&limite=10";

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
        )
          return false;

        const item = body.datos.filas[0];
        const baseCampos =
          typeof item.fechaCreacion === "string" &&
          typeof item.id === "string" &&
          typeof item.uuidReclamo === "string" &&
          typeof item.codigo === "string" &&
          typeof item.sector === "string" &&
          typeof item.fechaAcontecimiento === "string" &&
          typeof item.horaAproximada === "string" &&
          typeof item.transacciones === "object" &&
          typeof item.transacciones.id === "string" &&
          typeof item.transacciones.accion === "string" &&
          Array.isArray(item.incidentes) &&
          Array.isArray(item.detallesReclamo) &&
          typeof item.entidad === "object" &&
          typeof item.entidad.nombre === "string" &&
          typeof item.departamento === "object" &&
          typeof item.departamento.nombre === "string" &&
          typeof item.reclamante === "object" &&
          typeof item.reclamante.uuidUsuario === "string" &&
          typeof item.reclamante.correoElectronico === "string" &&
          typeof item.reclamante.persona === "object" &&
          typeof item.reclamante.persona.nombres === "string" &&
          typeof item.reclamante.persona.primerApellido === "string" &&
          typeof item.reclamante.persona.segundoApellido === "string" &&
          typeof item.reclamante.persona.nroDocumento === "string" &&
          typeof item.reclamante.persona.telefono === "string" &&
          typeof item.adjuntos === "object";

        return baseCampos;
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
