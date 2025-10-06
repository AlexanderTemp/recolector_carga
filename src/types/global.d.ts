export interface JsonFile {
  name: string;
  absolutePath: string;
}

export interface FolderContent {
  folderName: string;
  urls: string[];
  jsons: JsonFile[];
}

export interface FolderJsons {
  [folderName: string]: FolderContent;
}
