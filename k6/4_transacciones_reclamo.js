import http from "k6/http";
import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { ENV } from "./constants.js";

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

  const res = http.get(
    `${ENV.BACKEND_URL}/reclamos/publicos/5883e958-c8c9-449b-9d3e-e5b192e4b097/transacciones`
  );

  check(res, { "estado es 200": (r) => r.status === 200 });

  if (res.status !== 200) {
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
