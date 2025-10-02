import http from "k6/http";
import { sleep } from "k6";

const SCENARIO = __ENV.SCENARIO || "l1_50vus_5min";
const FILE_NAME = __ENV.FILE_NAME || "default";

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
  http.get("https://quickpizza.grafana.com");
  sleep(1);
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
  };
}
