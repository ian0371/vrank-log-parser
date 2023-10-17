import { ethers } from "ethers";
import * as fs from "fs";

let gcnames: { [key: string]: string };
const blockInfoCache: { [key: number]: blockInfo } = {};

export type blockInfo = {
  committee: string[];
  proposer: string;
};

const RPC_ENDPOINT =
  process.env.RPC_ENDPOINT ?? "https://public-en-cypress.klaytn.net";

export function loadGcNames() {
  if (gcnames == null) {
    gcnames = JSON.parse(fs.readFileSync("gcnames.json", "utf-8"));
  }
  return gcnames;
}

export function getGcNameByAddr(checksumAddr: string) {
  loadGcNames();
  if (gcnames[checksumAddr] == null) {
    throw Error(`no addr ${checksumAddr}`);
  }

  return gcnames[checksumAddr];
}

export function isValidGcName(name: string) {
  loadGcNames();
  if (Object.values(gcnames).includes(name)) {
    return true;
  }
  return false;
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
