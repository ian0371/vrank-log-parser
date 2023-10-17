import * as mongoose from "mongoose";
import { VrankLog } from "./schema";
import { loadGcNames } from "./util";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  let gcnames = Object.values(loadGcNames());

  for (const proposer of gcnames) {
    for (const logger of gcnames) {
      if (proposer == logger) {
        continue;
      }
      console.log(`proposer=${proposer} logger=${logger}`);
      for (const target of gcnames) {
        const ret = await VrankLog.find({
          $and: [
            { proposer: proposer },
            { logger: logger },
            { "assessment.late": { $elemMatch: { $eq: target } } },
          ],
        });
        if (ret.length > 0) {
          console.log(`* ${target}: ${ret.length}`);
        }
      }
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
