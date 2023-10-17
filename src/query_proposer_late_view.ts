import * as fs from "fs";
import * as mongoose from "mongoose";
import { VrankLog } from "./schema";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  let gcNames: string[] = Object.values(
    JSON.parse(fs.readFileSync("gcnames.json", "utf-8")),
  );

  console.log(["proposers"].concat(gcNames).join(","));

  for (const proposer of gcNames) {
    const row = [proposer];
    for (const target of gcNames) {
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
