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
- table_view
  - argument: <block number> OR <prev proposer> <proposer>
  - desc: if block number is given, shows the refined log at block.
    if not, finds blocks where prevProposer and proposer matches, and shows the refined logs at the blocks.
    (prev)proposer can be "any".
  - output:
    - blank: early
    - number: late time (ms)
    - x: not arrived
    - -: not committee / log does not exist
- view
  - desc: Shows the number of records in DB, and shows the first record

To download logs from DataDog, see [download](./download/README.md).

This project was created using `bun init` in bun v1.0.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
