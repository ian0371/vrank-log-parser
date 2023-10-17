import * as mongoose from "mongoose";
import { logLateGc } from "./util";
import { loadGcNames } from "../src/util";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  if (process.argv.length < 4) {
    console.error(
      `Usage: ${process.argv[0]} ${process.argv[1]} <Proposer1> <Proposer2>`,
      `Returns late GCs for blocks where block #N-1 proposer = Proposer1 && block #N proposer = Proposer2`,
    );
    throw Error("Argument missing");
  }

  const p1 = process.argv[2];
  const p2 = process.argv[3];

  const gcnames = Object.values(loadGcNames());

  let p1List = [],
    p2List = [];
  if (p1 == "any") {
    p1List = gcnames;
  } else {
    p1List = [p1];
  }

  if (p2 == "any") {
    p2List = gcnames;
  } else {
    p2List = [p2];
  }

  for (const _p1 of p1List) {
    for (const _p2 of p2List) {
      await logLateGc(_p1, _p2);
    }
  }

  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
