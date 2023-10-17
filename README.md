# vrank-log-parser

To install dependencies:

```bash
bun install
```

To run for the first time:

```bash
mkdir data
docker pull mongo
docker run --name mongo -v ./data:/data/db -d -p 27017:27017 mongo
bun run src/load.ts sample_input.txt
```

To view one data:

```bash
bun run src/view.ts
```

To view queried data:

```bash
bun run query/*.ts
```

Queries

- consensus_info
  - argument: block number
  - desc: Shows the proposer, committee of RPC_call `klay_getBlockWithConsensusInfoByNumber`
- over_300
  - argument: Proposer1, Proposer2. `any` is allowed to represent all GCs
  - desc: Shows late GCs for blocks where block #N-1 proposer = Proposer1 && block #N proposer = Proposer2
- block_late_view
  - argument: block number
  - desc: Shows late information viewed by all loggers
- many_lates
  - argument: threshold (default=8)
  - desc: Shows blocks whose number of late GCs > threshold

To download logs from DataDog, see [download](./download/README.md).

This project was created using `bun init` in bun v1.0.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
