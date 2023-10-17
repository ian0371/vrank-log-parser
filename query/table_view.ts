import * as mongoose from "mongoose";
import { blockView, getBlockNumsFromArgs, printMap } from "./util";

async function main() {
  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  const blockNumList = await getBlockNumsFromArgs();

  for (const num of blockNumList) {
    const record = await blockView(num);
    console.log(`* blocknum: ${num}`);
    console.log(`* proposer: ${record.proposer}`);
    console.log(`* prev_proposer: ${record.prev_proposer}`);
    console.log(`* csv`);
    printMap(record.map);
  }

  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});