import * as mongoose from "mongoose";
import { VrankLog, VrankLogMetadata } from "./schema";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  const threshold = 0;
  const metadata = await VrankLogMetadata.findOne();
  if (metadata == null) {
    throw Error("metadata is null");
  }

  const lateBlocks = [];

  for (
    let blocknum = metadata.minBlocknum;
    blocknum < metadata.maxBlocknum + 1;
    blocknum++
  ) {
    const ret = await getProposerLog(blocknum);

    // if no log exist, consider it late (problematic).
    const numLates = ret?.assessment?.lateTimes.filter((x) => x >= 300);
    if (numLates == null) {
      continue;
    }

    if (numLates.length > threshold) {
      lateBlocks.push({ blocknum, numLates });
    }
  }
  console.log(lateBlocks);

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
