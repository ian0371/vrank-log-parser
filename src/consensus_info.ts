import { ethers } from "ethers";
import { getGcNameByAddr } from "./util";

const blockInfoCache: { [key: number]: blockInfo } = {};

export type blockInfo = {
  committee: string[];
  proposer: string;
};

const RPC_ENDPOINT =
  process.env.RPC_ENDPOINT ?? "https://public-en-cypress.klaytn.net";

async function main() {
  if (process.argv.length < 3) {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <blocknum>`);
    throw Error("Argument missing");
  }
  const blocknum = process.argv[2];

  console.log(await getConsensusBlockLoop(parseInt(blocknum)));
}

export async function getConsensusBlockLoop(
  blockNum: number,
): Promise<blockInfo> {
  if (blockInfoCache[blockNum] != null) {
    return blockInfoCache[blockNum];
  }

  for (;;) {
    try {
      const rpcResult = await _getConsensusInfo(blockNum);
      let { committee, proposer }: blockInfo = rpcResult;

      // committee is sorted by checksum-ed address, case-sensitive
      committee = committee.map((x) => ethers.utils.getAddress(x));
      committee.sort();
      console.log(committee);
      committee = committee.map(getGcNameByAddr);
      proposer = ethers.utils.getAddress(proposer);
      proposer = getGcNameByAddr(proposer);
      const ret: blockInfo = { committee, proposer };
      blockInfoCache[blockNum] = ret;
      return ret;
    } catch (err: any) {
      if (err.code == "TIMEOUT") {
        console.log(`RPC timeout. retrying... ${blockNum}`);
        continue;
      }
      throw err;
    }
  }
}

async function _getConsensusInfo(blockNum: number) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
  return await provider.send("klay_getBlockWithConsensusInfoByNumber", [
    "0x" + blockNum.toString(16),
  ]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
