# vrank-log-parser

To install dependencies:

```bash
bun install
```

To run:

```bash
mkdir data
docker pull mongo
docker run --name mongo -v ./data:/data/db -d -p 27017:27017 mongo

bun run load.ts
bun run view.ts
```

This project was created using `bun init` in bun v1.0.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
