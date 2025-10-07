import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
const pdfFile = open("./dummy.pdf", "b");

// Constantes del test
const TEST_NAME = "Reclamos_Detalle_id_PATCH";
const VUS_COUNT = 500;
const TEST_DURATION = "10m";
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjciLCJyb2xlcyI6WyJVU1VBUklPIl0sImlkUm9sIjoiNiIsInJvbCI6IlVTVUFSSU8iLCJpYXQiOjE3NTk4NDU1MDYsImV4cCI6MTc1OTg1MjcwNn0.ildgd14ojpOEmFZwqX8tdBCaPDYBSbSlEptjU-bq0NQ";

// Configuración de VUs y duración
export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const reclamoId = "fea993a1-b200-4912-82d9-1287907e6ce1"; // ID dinámico del reclamo
  const url = `https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/reclamos/${reclamoId}/detalles`;

  // Aquí no usamos archivo real, solo simulamos un payload
  const payload = {
    paso: "3",
    archivos: http.file(pdfFile, "dummy.pdf", "application/pdf"),
  };

  const params = {
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      Accept: "application/json",
      Referer: `https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/reclamos/${reclamoId}`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
      Origin: "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo",
    },
  };

  const res = http.patch(url, payload, params);

  check(res, {
    "status es 200/201": (r) => r.status === 200 || r.status === 201,
    "respuesta tiene JSON válido": (r) => {
      try {
        const body = r.json();
        return typeof body === "object" && body !== null;
      } catch (e) {
        return false;
      }
    },
    "finalizado existe y es booleano": (r) => {
      try {
        const body = r.json();
        return "finalizado" in body && typeof body.finalizado === "boolean";
      } catch (e) {
        return false;
      }
    },
    "mensaje existe y es string": (r) => {
      try {
        const body = r.json();
        return "mensaje" in body && typeof body.mensaje === "string";
      } catch (e) {
        return false;
      }
    },
    "datos existe y es objeto": (r) => {
      try {
        const body = r.json();
        return (
          "datos" in body &&
          typeof body.datos === "object" &&
          body.datos !== null
        );
      } catch (e) {
        return false;
      }
    },
    "datos contiene id, estado y paso con tipos correctos": (r) => {
      try {
        const datos = r.json().datos;
        return (
          "id" in datos &&
          typeof datos.id === "string" &&
          "estado" in datos &&
          typeof datos.estado === "string" &&
          "paso" in datos &&
          typeof datos.paso === "number"
        );
      } catch (e) {
        return false;
      }
    },
    "tiempo de respuesta aceptable": (r) => r.timings.duration < 3000,
  });
}

export function handleSummary(data) {
  const fileName = `${TEST_NAME}_vus${VUS_COUNT}_${TEST_DURATION}.json`;

  return {
    [fileName]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
  };
}
