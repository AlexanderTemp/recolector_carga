import fs, { Dirent } from "fs";
import path from "path";
import { validarSummaryManual } from "./ValidadorEstructura";
import { FolderJsons, JsonFile } from "../types/global";

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

export function validarFolders(baseDir: string): FolderJsons {
  const resultado: FolderJsons = {};

  const folders: string[] = obtenerSubfolders(baseDir);

  for (const folderName of folders) {
    const folderPath: string = path.resolve(baseDir, folderName);
    const jsonFiles: string[] = obtenerJsons(folderPath);

    for (const file of jsonFiles) {
      const filePath: string = path.join(folderPath, file);
      const valido: boolean = validarSummaryManual(filePath);

      if (!valido) {
        console.error(`❌ JSON inválido: ${filePath}`);
        continue;
      }

      if (!resultado[folderName]) {
        resultado[folderName] = { folderName, jsons: [] };
      }

      resultado[folderName].jsons.push({
        name: file,
        absolutePath: filePath,
      });
    }
  }

  return resultado;
}
