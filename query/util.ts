import { VrankLog } from "../src/schema";
import { loadGcNames } from "../src/util";

type map = { [key: string]: { [key: string]: string } };

export async function getBlockNumsFromArgs(): Promise<number[]> {
  if (process.argv.length == 3) {
    return [parseInt(process.argv[2])];
  } else if (process.argv.length == 4 && typeof /^\d+$/.test(process.argv[2])) {
    // equivalent of python's range(start, end)
    const start = parseInt(process.argv[2]);
    const end = parseInt(process.argv[3]);
    const len = end - start;
    return Array.from({ length: len }, (_, index) => start + index);
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

  const map: map = {};
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

export function csv(info = "proposers", map: map) {
  const gcnames = Object.values(loadGcNames());
  let ret = [info].concat(gcnames).join(",") + "\n";
  for (const row of gcnames) {
    const buf = [row];
    if (map[row] == null) {
      buf.push(...Array(gcnames.length).fill("-"));
    } else {
      for (const col of gcnames) {
        buf.push(map[row][col] ?? "x");
      }
    }

    ret += buf.join(",") + "\n";
  }
  return ret;
}
