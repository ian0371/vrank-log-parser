import * as mongoose from "mongoose";

async function main() {
  console.log("Connecting Mongo DB...");
  const conn = await mongoose.connect("mongodb://127.0.0.1:27017/vrank");
  console.log("Connected successfully");

  await conn.connection.db.dropDatabase();
  await mongoose.disconnect();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
