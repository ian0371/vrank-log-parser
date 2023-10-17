import { getConsensusBlockLoop } from "../src/util";

async function main() {
  if (process.argv.length < 3) {
    console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <blocknum>`);
    throw Error("Argument missing");
  }
  const blocknum = process.argv[2];

  console.log(await getConsensusBlockLoop(parseInt(blocknum)));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
