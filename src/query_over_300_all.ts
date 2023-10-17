import * as mongoose from "mongoose";
import { logLateGc } from "./query_over_300";
import { loadGcNames } from "./util";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  const gcnames = Object.values(loadGcNames());

  for (const proposer of gcnames) {
    for (const logger of gcnames) {
      await logLateGc(proposer, logger);
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
