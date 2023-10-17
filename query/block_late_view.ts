import * as mongoose from "mongoose";
import { VrankLog } from "../src/schema";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  if (process.argv.length < 3) {
    console.error(
      `Usage: ${process.argv[0]} ${process.argv[1]} <block num>`,
      `Shows late information viewed by all loggers`,
    );
    throw Error("Argument missing");
  }

  const blocknum = parseInt(process.argv[2]);
  const records = await VrankLog.find({
    blocknum: blocknum,
  });
  const prevLog = await VrankLog.findOne({
    blocknum: blocknum - 1,
  });

  console.log(`blocknum: ${blocknum}`);
  console.log(`proposer: ${records[0].proposer}`);
  console.log(`prev_proposer: ${prevLog?.proposer}`);
  console.log(`reported late (grouped by loggers):`);

  for (const record of records) {
    console.log(`  - ${record.logger}: ${record.assessment?.late}`);
  }

  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
