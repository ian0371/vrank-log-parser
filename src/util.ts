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
      /* how to see:
       *
      func TestVrankSort(t *testing.T) {
        s1 := []string{
            "0xa3b387b7B0dC914a4F106Ad645A0Ad079d70EBdC", "0xBc28b81E73a66747695D9236dC20491D65f74381",
            "0xBCA8fFa45CC8e30bBC0522CdF1A1e0eBF540dfE2", "0xC0cBE1C770fbCE1eb7786BFBa1Ac2115D5C0a456",
        }
        v1 := make([]common.Address, len(s1))
        for i := range s1 {
            v1[i] = common.HexToAddress(s1[i])
        }
        vs1 := validator.NewWeightedCouncil(v1, nil, nil, nil, nil, istanbul.WeightedRandom, uint64(len(s1)), 0, 0, &blockchain.BlockChain{})
        fmt.Println(vs1.GetValidators())
      }
      */
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
