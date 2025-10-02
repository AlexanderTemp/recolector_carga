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
  { id: "l1", vus: 1, duration: "15s" },
  { id: "l2", vus: 2, duration: "15s" },
  { id: "l3", vus: 3, duration: "15s" },
  { id: "l4", vus: 4, duration: "15s" },
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
