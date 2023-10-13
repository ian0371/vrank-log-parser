import { ethers } from "ethers";
import * as fs from "fs";

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
  const filename = process.argv[2];
  const lines = fs.readFileSync(filename, "utf-8").split("\n").filter(Boolean);

  for (let line of lines) {
    const { logger, blocknum, round, late, bitmap } = parseLog(line);
    const { committee, proposer } = await getBlockInfo(blocknum);
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

    const result = {
      logger,
      blocknum,
      round,
      proposer,
      assessmentObj,
    };
    console.log(result);
  }
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
