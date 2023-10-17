import * as mongoose from "mongoose";
import { VrankLog } from "../src/schema";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  let threshold = 8;
  if (process.argv.length >= 3) {
    threshold = parseInt(process.argv[2]);
  }

  const blockNums: number[] = await VrankLog.distinct("blocknum");

  for (const blocknum of blockNums) {
    const ret = await getProposerLog(blocknum);

    // if no log exist, consider it late (problematic).
    const numLates = ret?.assessment?.late.length ?? 99;
    if (numLates > threshold) {
      console.log({ blocknum, numLates });
    }
  }

  await mongoose.disconnect();
}

async function getProposerLog(blocknum: number) {
  return await VrankLog.findOne({
    $and: [
      { blocknum: blocknum },
      {
        $where: function () {
          return this.logger == this.proposer;
        },
      },
    ],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
