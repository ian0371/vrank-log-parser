import * as fs from "fs";
import * as mongoose from "mongoose";
import { VrankLog, VrankLogMetadata } from "./schema";
import { getConsensusBlockLoop, isValidGcName } from "./util";

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

      const record = new VrankLog({
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
      });
      if (record.validateSync()) {
        console.error(record.validateSync());
        console.error(record);
        throw Error();
      }
      vrankLogs.push(record);
    } catch (err: any) {
      console.error(`Error at line ${i + 1}: ${line}`);
      throw err;
    }
  }

  await insertVrankLog(vrankLogs);

  let metadata = await VrankLogMetadata.findOne();
  if (metadata != null) {
    if (metadata.minBlocknum > minBlocknum) {
      metadata.minBlocknum = minBlocknum;
    }
    if (metadata.maxBlocknum < maxBlocknum) {
      metadata.maxBlocknum = maxBlocknum;
    }
    await new VrankLogMetadata(metadata).save();
  } else {
    await new VrankLogMetadata({ minBlocknum, maxBlocknum }).save();
  }

  await mongoose.disconnect();
}

function parseLog(log: string) {
  let [logger, blocknumStr, roundStr, lateStr, bitmap] = log.split(",");

  // verification
  logger = logger.replace(/-cn-01$/, "");
  if (!isValidGcName(logger)) {
    throw Error(`Not a valid GC name, ${logger}`);
  }
  const blocknum = parseInt(blocknumStr);
  if (isNaN(blocknum)) {
    throw Error("NaN blocknum in log");
  }
  const round = parseInt(roundStr);
  if (isNaN(round)) {
    throw Error("NaN round in log");
  }
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
    logger,
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

async function processLine(line: string) {
  const { logger, blocknum, round, late, bitmap: _bitmap } = parseLog(line);
  const { committee, proposer } = await getConsensusBlockLoop(blocknum);
  const bitmap = _bitmap.padStart(Math.ceil(committee.length / 3), "0");
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
