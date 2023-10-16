import * as mongoose from "mongoose";
import { VrankLog } from "./schema";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  const vrankLogs = await VrankLog.find();
  console.log("#records:", vrankLogs.length);
  console.log("first record:", vrankLogs[0]);

  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
