import { VrankLog } from "../src/schema";

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
