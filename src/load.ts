import { ethers } from "ethers";
import * as fs from "fs";
import * as mongoose from "mongoose";
import { VrankLog, VrankLogMetadata } from "./schema";

const RPC_ENDPOINT =
  process.env.RPC_ENDPOINT ?? "https://public-en-cypress.klaytn.net";

type blockInfo = {
  committee: string[];
  proposer: string;
};

let gcnames: any;

const blockInfoCache: { [key: number]: blockInfo } = {};

async function insertVrankLog(v: VrankLog[]) {
  if (v.length > 0) {
    // skip if duplicate data
    try {
      await VrankLog.insertMany(v);
    } catch (err: any) {
      if (err.code != 11000) {
        throw err;
      }
    }
  }
}

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

  let minBlocknum = 9999999999,
    maxBlocknum = 0;

  let vrankLogs: VrankLog[] = [];

  for (let [i, line] of lines.entries()) {
    try {
      if (line.includes("host,blocknumber,round,late,bitmap")) {
        continue;
      }
      // batch insert
      if (i % 1000 == 0) {
        console.log(`Parsing line ${i + 1} into DB`);
        await insertVrankLog(vrankLogs);
        vrankLogs = [];
      }

      const {
        logger,
        blocknum,
        round,
        late,
        committee,
        proposer,
        assessments,
      } = await processLine(line);
      if (blocknum < minBlocknum) {
        minBlocknum = blocknum;
      }
      if (blocknum > maxBlocknum) {
        maxBlocknum = blocknum;
      }

      const { earlys, lates, notArriveds, lateTimes } = group(
        committee,
        assessments,
        late,
      );

      vrankLogs.push(
        new VrankLog({
          blocknum,
          round,
          logger,
          proposer,
          assessment: {
            early: earlys,
            late: lates,
            notArrived: notArriveds,
            lateTimes,
          },
        }),
      );
    } catch (err: any) {
      console.error(`Error at ${line}`);
      throw err;
    }
  }

  await insertVrankLog(vrankLogs);

  await new VrankLogMetadata({ minBlocknum, maxBlocknum }).save();

  await mongoose.disconnect();
}

function parseLog(log: string) {
  const [logger, blocknumStr, roundStr, lateStr, bitmap] = log.split(",");
  const blocknum = parseInt(blocknumStr);
  const round = parseInt(roundStr);
  const late = lateStr
    .replace(/\[|\]/g, "")
    .split(" ")
    .map((x) => {
      if (x.endsWith("s")) {
        return Number(x.slice(0, -1)) * 1000;
      } else {
        return Number(x);
      }
    });
  return {
    logger: logger.replace(/-cn-01$/, ""),
    blocknum,
    round,
    late,
    bitmap,
  };
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

async function getBlockInfoLoop(blockNum: number) {
  for (;;) {
    try {
      return await _getBlockInfo(blockNum);
    } catch (err: any) {
      if (err.code == "TIMEOUT") {
        console.log(`RPC timeout. retrying... ${blockNum}`);
        continue;
      }
      throw err;
    }
  }
}

async function processLine(line: string) {
  const { logger, blocknum, round, late, bitmap: _bitmap } = parseLog(line);
  const { committee, proposer } = await getBlockInfoLoop(blocknum);
  const bitmap = _bitmap.padStart(Math.ceil(committee.length / 2), "0");
  const assessments = parseBitmap(bitmap);
  return {
    logger,
    blocknum,
    round,
    late,
    bitmap,
    committee,
    proposer,
    assessments,
  };
}

function group(committee: string[], assessments: number[], late: number[]) {
  const earlys = [],
    lates = [],
    notArriveds = [],
    lateTimes = [];
  for (let i = 0; i < committee.length; i++) {
    if (assessments[i] == 1) {
      lates.push(committee[i]);
      lateTimes.push(late.shift() ?? 0);
    } else if (assessments[i] == 0) {
      earlys.push(committee[i]);
    } else {
      notArriveds.push(committee[i]);
    }
  }
  return { earlys, lates, notArriveds, lateTimes };
}

async function _getBlockInfo(blockNum: number) {
  if (blockInfoCache[blockNum] != null) {
    return blockInfoCache[blockNum];
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
  let { committee, proposer }: { committee: string[]; proposer: string } =
    await provider.send("klay_getBlockWithConsensusInfoByNumber", [
      "0x" + blockNum.toString(16),
    ]);

  committee.sort((a, b) => a.localeCompare(b));
  const ret: blockInfo = {
    committee: committee.map(getNameByAddress),
    proposer: getNameByAddress(proposer),
  };
  blockInfoCache[blockNum] = ret;
  return ret;
}

function getNameByAddress(addr: string) {
  if (gcnames == null) {
    gcnames = JSON.parse(fs.readFileSync("gcnames.json", "utf-8"));
  }

  if (gcnames[addr] == null) {
    throw Error(`no addr ${addr}`);
  }

  return gcnames[addr];
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
