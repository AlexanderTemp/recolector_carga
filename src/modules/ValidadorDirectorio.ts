import fs, { Dirent } from "fs";
import path from "path";
import { validarSummaryManual } from "./ValidadorEstructura";
import { FolderJsons, JsonFile } from "../types/global";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function obtenerSubfolders(dir: string): string[] {
  const entries: Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function obtenerJsons(folderPath: string): string[] {
  const entries: Dirent[] = fs.readdirSync(folderPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
}

function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return "";

  rawUrl = rawUrl.trim();

  rawUrl = rawUrl.replace(/^`?\$\{[^}]+\}`?/, "");

  rawUrl = rawUrl.replace(/^`|`$/g, "");

  return rawUrl
    .split("/")
    .map((seg) => {
      if (!seg) return "";

      if (seg.match(/^\$\{[^}]+\}$/)) return ":UUID";

      if (UUID_REGEX.test(seg)) return ":UUID";

      if (seg.match(/^\d+$/)) return ":ID";

      return seg;
    })
    .filter(Boolean)
    .join("/");
}

function extractUrlsFromK6Script(scriptPath: string): string[] {
  const content = fs.readFileSync(scriptPath, "utf-8");
  const urls: string[] = [];

  
  const varRegex =
    /(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*["'`](https?:\/\/[^"'`]+)["'`]/g;
  const urlVars: Record<string, string> = {};

  let varMatch;
  while ((varMatch = varRegex.exec(content)) !== null) {
    const varName = varMatch[2];
    const rawUrl = varMatch[3];
    urlVars[varName] = normalizeUrl(rawUrl);
  }

  
  const httpRegex = /http\.(get|post|put|patch|del|delete)\(([^,)]+)/g;
  let match;

  while ((match = httpRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let arg = match[2].trim();

    if (
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'")) ||
      (arg.startsWith("`") && arg.endsWith("`"))
    ) {
      const url = arg.slice(1, -1);
      urls.push(`${method} /${normalizeUrl(url)}`);
      continue;
    }

    if (urlVars[arg]) {
      urls.push(`${method} /${urlVars[arg]}`);
      continue;
    }

    const templateRegex = /[`"']?\$\{[^}]+\}\/?([^`"']*)[`"']?/;
    const tMatch = arg.match(templateRegex);
    if (tMatch) {
      const url = tMatch[1];
      urls.push(`${method} /${normalizeUrl(url)}`);
      continue;
    }
  }

  return urls;
}

export function validarFolders(baseDir: string, k6Dir: string): FolderJsons {
  const resultado: FolderJsons = {};

  const folders: string[] = obtenerSubfolders(baseDir);

  for (const folderName of folders) {
    const folderPath: string = path.resolve(baseDir, folderName);
    const jsonFiles: string[] = obtenerJsons(folderPath);

    if (!resultado[folderName]) {
      resultado[folderName] = { folderName, jsons: [], urls: [] };
    }

    for (const file of jsonFiles) {
      const filePath: string = path.join(folderPath, file);
      const valido: boolean = validarSummaryManual(filePath);

      if (!valido) {
        console.error(`❌ JSON inválido: ${filePath}`);
        continue;
      }

      resultado[folderName].jsons.push({
        name: file,
        absolutePath: filePath,
      });
    }

    const k6ScriptPath = path.join(k6Dir, `${folderName}.js`);
    if (fs.existsSync(k6ScriptPath)) {
      const urls = extractUrlsFromK6Script(k6ScriptPath);
      resultado[folderName].urls = urls;
    } else {
      console.warn(
        `⚠️ No se encontró script K6 para la carpeta: ${folderName}`
      );
      resultado[folderName].urls = [];
    }
  }

  return resultado;
}
