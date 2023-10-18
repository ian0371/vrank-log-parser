import * as mongoose from "mongoose";
import { blockView, getBlockNumsFromArgs, csv } from "./util";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");

  const blockNumList = await getBlockNumsFromArgs();

  for (const num of blockNumList) {
    const record = await blockView(num);
    const info = `num:${num}/proposer:${record.proposer}/prev_proposer:${record.prev_proposer}`;
    const output = {
      num,
      proposer: record.proposer,
      prev_proposer: record.prev_proposer,
      csv: csv(info, record.map),
    };
    console.log(JSON.stringify(output));
  }

  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
