import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const TEST_NAME = "Reclamo_GET_ID_pdf";
const VUS_COUNT = 500;
const TEST_DURATION = "5m";

const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgiLCJyb2xlcyI6WyJVU1VBUklPIl0sImlkUm9sIjoiNiIsInJvbCI6IlVTVUFSSU8iLCJpYXQiOjE3NTk0OTY4ODcsImV4cCI6MTc1OTUwNDA4N30.6NvjB3rE5dQxHA8SXX67hsqV_zKL073a8XqZFCG6f5E";

export const options = {
  vus: VUS_COUNT,
  duration: TEST_DURATION,
};

export default function () {
  const url =
    "https://load-bolivia-a-tu-servicio.dev.agetic.gob.bo/ws/api/reclamos/246b3969-ad1b-43d2-b9b4-bd0ffca2bd22/pdf";

  const params = {
    headers: {
      Accept: "application/pdf",
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
    },
  };

  const res = http.get(url, params);

  check(res, {
    "status es 200": (r) => r.status === 200,
    "content-type es PDF": (r) =>
      r.headers["Content-Type"] &&
      r.headers["Content-Type"].toLowerCase().includes("application/pdf"),
    "content-disposition tiene filename": (r) =>
      r.headers["Content-Disposition"] &&
      r.headers["Content-Disposition"].includes("filename="),
    "cuerpo no está vacío (>1KB)": (r) => r.body && r.body.length > 1024,
    "tiempo de respuesta aceptable (<3s)": (r) => r.timings.duration < 3000,
  });
}

export function handleSummary(data) {
  const fileName = `${TEST_NAME}_vus${VUS_COUNT}_${TEST_DURATION}.json`;

  return {
    [fileName]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
  };
}
