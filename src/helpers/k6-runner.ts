import { spawn } from "child_process";
import readline from "readline";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

interface Scenario {
  id: string;
  vus: number;
  duration: string;
}

const scenarios: Scenario[] = [
  // { id: "test", vus: 1, duration: "5s" },
  // { id: "k0", vus: 5, duration: "5m" },
  // { id: "k2", vus: 9, duration: "5m" },
  // { id: "l0", vus: 10, duration: "5m" },
  { id: "l1", vus: 20, duration: "5m" },
  { id: "l2", vus: 50, duration: "5m" },
  { id: "l3", vus: 100, duration: "5m" },
  { id: "l4", vus: 200, duration: "5m" },
  { id: "l5", vus: 500, duration: "10m" },
  { id: "l6", vus: 1000, duration: "10m" },
];

const scriptsDir = process.env.K6_SCRIPTS_PATH || "./scripts";
const outputDir = process.env.K6_OUTPUT_PATH || "./inputs";

const fileName = process.argv[2];
if (!fileName) {
  console.error("❌ Debes pasar el nombre del script de K6, ej:");
  console.error("   ts-node runner.ts 1_registro_reclamo_sin_cd.js");
  process.exit(1);
}

const filePath = path.join(scriptsDir, fileName);
const fileBase = fileName.replace(/\.js$/, "");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function runScenarios() {
  for (const scenario of scenarios) {
    const scenarioName = `${scenario.id}_${scenario.vus}vus_${scenario.duration}`;

    const scenarioOutputPath = path.join(
      outputDir,
      fileBase,
      `${scenarioName}.json`
    );

    fs.mkdirSync(path.dirname(scenarioOutputPath), { recursive: true });

    await new Promise<void>((resolve) => {
      const k6 = spawn(
        "k6",
        [
          "run",
          "--summary-mode=full",
          "--env",
          `SCENARIO=${scenarioName}`,
          "--env",
          `FILE_NAME=${fileBase}`,
          "--env",
          `VUS=${scenario.vus}`,
          "--env",
          `DURATION=${scenario.duration}`,
          "--env",
          `OUTPUT_DIR=${outputDir}`,
          filePath,
        ],
        { stdio: "inherit" }
      );

      k6.on("close", () => {
        rl.question("👉 Presiona ENTER para continuar...", () => resolve());
      });
    });
  }

  rl.close();
}

runScenarios();

// npm run k6 1_registro_reclamo_sin_cd.js
