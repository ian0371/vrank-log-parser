import * as mongoose from "mongoose";
import { logLateGc } from "./util";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  if (process.argv.length < 4) {
    console.error(
      `Usage: ${process.argv[0]} ${process.argv[1]} <PrevProposer> <Logger>`,
    );
    throw Error("Argument missing");
  }

  const proposer = process.argv[2];
  const logger = process.argv[3];
  await logLateGc(proposer, logger);

  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
