import * as fs from "fs";
let gcnames: { [key: string]: string };

export function loadGcNames() {
  if (gcnames == null) {
    gcnames = JSON.parse(fs.readFileSync("gcnames.json", "utf-8"));
  }
  return gcnames;
}

export function getGcNameByAddr(checksumAddr: string) {
  loadGcNames();
  if (gcnames[checksumAddr] == null) {
    throw Error(`no addr ${checksumAddr}`);
  }

  return gcnames[checksumAddr];
}

export function isValidGcName(name: string) {
  loadGcNames();
  if (Object.values(gcnames).includes(name)) {
    return true;
  }
  return false;
}
