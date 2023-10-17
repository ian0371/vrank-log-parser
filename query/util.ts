import { VrankLog } from "../src/schema";
import { loadGcNames } from "../src/util";

type table = { [key: string]: { [key: string]: string } };

export async function logLateGc(p1: string, p2: string) {
  console.log(
    `*****proposer at block is ${p2}, previous proposer is ${p1} *****`,
  );
  const p1Blocks: number[] = await VrankLog.distinct("blocknum", {
    proposer: p1,
  });
  const p2Blocks: number[] = await VrankLog.distinct("blocknum", {
    proposer: p2,
  });

  const neighbors = [];
  for (let i = 0; i < p1Blocks.length; i++) {
    for (let j = 0; j < p2Blocks.length; j++) {
      if (p2Blocks[j] - p1Blocks[i] == 1) {
        neighbors.push(p2Blocks[i]);
      }
    }
  }

  for (const p2Block of neighbors) {
    const log = await VrankLog.findOne({
      $and: [{ blocknum: p2Block }, { logger: p2 }],
    });
    if (log == null) {
      console.error(`Log at ${p2Block} not found. continuing...`);
      continue;
    }
    if (log?.assessment?.lateTimes == null) {
      continue;
    }

    const over300 = [];
    for (let i = 0; i < log.assessment.lateTimes.length; i++) {
      if (log.assessment.lateTimes[i] >= 300) {
        over300.push(log.assessment.late[i]);
      }
    }
    if (over300.length > 1) {
      console.log(`block: ${log.blocknum}, Over 300ms: ${over300}`);
    }
  }
}

export async function getBlockNumsFromArgs(): Promise<number[]> {
  if (process.argv.length == 3) {
    return [parseInt(process.argv[2])];
  } else if (process.argv.length == 4) {
    const [prevProposer, proposer] = [process.argv[2], process.argv[3]];
    if (prevProposer == "any" || proposer == "any") {
      if (prevProposer == "any" && proposer == "any") {
        return await VrankLog.distinct("blocknum");
      }
      if (prevProposer == "any") {
        return await VrankLog.distinct("blocknum", { proposer: proposer });
      }
      if (proposer == "any") {
        return (
          (await VrankLog.distinct("blocknum", {
            proposer: prevProposer,
          })) as number[]
        ).map((x) => x + 1);
      }
    }

    const prevProposerBlocks: number[] = await VrankLog.distinct("blocknum", {
      proposer: prevProposer,
    });
    const proposerBlocks: number[] = await VrankLog.distinct("blocknum", {
      proposer: proposer,
    });
    const neighbors = [];
    for (let i = 0; i < proposerBlocks.length; i++) {
      for (let j = 0; j < prevProposerBlocks.length; j++) {
        if (proposerBlocks[i] - prevProposerBlocks[j] == 1) {
          neighbors.push(proposerBlocks[i]);
        }
      }
    }
    return neighbors;
  } else {
    console.error(
      `Usage: ${process.argv[0]} ${process.argv[1]} <block num>`,
      `Shows late information viewed by all loggers`,
    );
    throw Error("Argument missing");
  }
}

export async function blockView(blocknum: number) {
  const logs = await VrankLog.find({
    blocknum: blocknum,
  });
  const prevLog = await VrankLog.findOne({
    blocknum: blocknum - 1,
  });

  console.log(`latency:`);
  const map: table = {};
  for (const log of logs) {
    map[log.logger] = {};
    for (const [i, gc] of log.assessment?.late.entries() ?? []) {
      map[log.logger][gc] = log.assessment?.lateTimes[i].toString() ?? "err";
    }
    for (const gc of log.assessment?.early ?? []) {
      map[log.logger][gc] = " ";
    }
    for (const gc of log.assessment?.notArrived ?? []) {
      map[log.logger][gc] = "x";
    }
  }

  return {
    blocknum,
    proposer: logs[0].proposer,
    prev_proposer: prevLog?.proposer,
    map,
  };
}

export function printMap(table: table) {
  const gcnames = Object.values(loadGcNames());
  console.log(["proposers"].concat(gcnames).join(","));
  for (const row of gcnames) {
    const buf = [row];
    if (table[row] == null) {
      buf.push(...Array(gcnames.length).fill("-"));
    } else {
      for (const col of gcnames) {
        buf.push(table[row][col] ?? "x");
      }
    }

    console.log(buf.join(","));
  }
}
