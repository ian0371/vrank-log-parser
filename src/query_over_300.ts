import * as mongoose from "mongoose";
import { VrankLog } from "./schema";

export async function logLateGc(proposer: string, logger: string) {
  console.log(`proposer=${proposer} logger=${logger}`);
  const blockNums: number[] = await VrankLog.distinct("blocknum", {
    proposer: proposer,
  });

  for (const blocknum of blockNums) {
    const log = await VrankLog.findOne({
      $and: [{ blocknum: blocknum + 1 }, { logger: logger }],
    });
    if (log == null) {
      console.error(`Log at ${blocknum + 1} not found. continuing...`);
      continue;
    }
    if (log?.assessment?.lateTimes == null) {
      continue;
    }

    const over300 = [];
    for (let i = 0; i < log.assessment.lateTimes.length; i++) {
      if (log.assessment.lateTimes[i] >= 300) {
        over300.push(log.assessment.late[i]);
      }
    }
    if (over300.length > 1) {
      console.log(`block: ${log.blocknum}, Over 300ms: ${over300}`);
    }
  }
}

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
