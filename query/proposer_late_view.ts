import * as mongoose from "mongoose";
import { VrankLog } from "../src/schema";
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
  let gcnames = Object.values(loadGcNames());

  console.log(["proposers"].concat(gcnames).join(","));

  for (const proposer of gcnames) {
    const row = [proposer];
    for (const target of gcnames) {
      const ret = await VrankLog.find({
        $and: [
          { proposer: proposer },
          { logger: proposer },
          { "assessment.late": { $elemMatch: { $eq: target } } },
        ],
      });
      if (ret.length > 0) {
        console.log(ret);
        await mongoose.disconnect();
        return;
      }
      row.push(ret.length.toString());
    }
    console.log(row.join(","));
  }

  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
