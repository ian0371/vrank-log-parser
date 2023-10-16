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
bun run load.ts input.txt
```

To view data:

```bash
bun run view.ts
```

This project was created using `bun init` in bun v1.0.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
