import { ethers } from "ethers";
import * as fs from "fs";
import * as mongoose from "mongoose";
import { VrankLog } from "./schema";

const RPC_ENDPOINT = "https://archive-en.cypress.klaytn.net";

type blockInfo = {
  committee: string[];
  proposer: string;
};

const blockInfoCache: { [key: number]: blockInfo } = {};

/*
 * input log format: host,blocknum,round,late,bitmap,message
 * a character bitmap encodes the status of two validators
 * e.g., 4 represents 0100, meaning one validator is late (01) and the other is not (00)
 */
async function main() {
  if (process.argv.length < 3) {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <input.txt>`);
    throw Error("Argument missing");
  }
  const filename = process.argv[2];
  const lines = fs.readFileSync(filename, "utf-8").split("\n").filter(Boolean);

  console.log("Connecting Mongo DB...");
  await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  for (let [i, line] of lines.entries()) {
    const { logger, blocknum, round, late, bitmap: _bitmap } = parseLog(line);
    const { committee, proposer } = await getBlockInfo(blocknum);
    const bitmap = _bitmap.padStart(Math.ceil(committee.length / 2), "0");
    const assessments = parseBitmap(bitmap);

    const assessmentObj: { [key: string]: { kind: number; time: number } } = {};
    for (let i = 0; i < committee.length; i++) {
      let time = 0;
      if (assessments[i] == 1) {
        // late
        time = late.shift() ?? 0;
      }
      assessmentObj[committee[i]] = {
        kind: assessments[i],
        time,
      };
    }

    const result = new VrankLog({
      logger,
      blocknum,
      round,
      proposer,
      assessment: assessmentObj,
    });
    await result.save();
    if (i % 100 == 0) {
      console.log(`Parsing line ${i + 1} into DB`);
    }
  }

  await mongoose.disconnect();
}

function parseLog(log: string) {
  const [logger, blocknumStr, roundStr, lateStr, bitmap] = log.split(",");
  const blocknum = parseInt(blocknumStr);
  const round = parseInt(roundStr);
  const late = lateStr.replace(/\[|\]/g, "").split(" ").map(Number);
  return { logger, blocknum, round, late, bitmap };
}

function parseBitmap(bitmap: string) {
  const assessments = [];
  for (let char of bitmap) {
    const n = parseInt(char);
    assessments.push(n >> 2);
    assessments.push(n & 0b11);
  }
  return assessments;
}

async function getBlockInfo(blockNum: number) {
  if (blockInfoCache[blockNum] != null) {
    return blockInfoCache[blockNum];
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
  let { committee, proposer }: { committee: string[]; proposer: string } =
    await provider.send("klay_getBlockWithConsensusInfoByNumber", [
      "0x" + blockNum.toString(16),
    ]);

  committee.sort((a, b) => a.localeCompare(b));
  const ret: blockInfo = { committee, proposer };
  blockInfoCache[blockNum] = ret;
  return ret;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
