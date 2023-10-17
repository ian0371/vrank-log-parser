import { VrankLog } from "../src/schema";

export async function logLateGc(proposer: string, logger: string) {
  console.log(`proposer=${proposer} logger=${logger}`);
  const blockNums: number[] = await VrankLog.distinct("blocknum", {
    proposer: proposer,
  });

  for (const blocknum of blockNums) {
    const log = await VrankLog.findOne({
      $and: [{ blocknum: blocknum + 1 }, { logger: logger }],
    });
    if (log == null) {
      console.error(`Log at ${blocknum + 1} not found. continuing...`);
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
