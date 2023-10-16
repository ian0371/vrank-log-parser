import * as mongoose from "mongoose";

const vrankLogSchema = new mongoose.Schema({
  logger: { type: String, required: true },
  blocknum: { type: Number, required: true },
  round: { type: Number, required: true },
  proposer: { type: String, required: true },
  assessment: {
    type: Map,
    of: new mongoose.Schema({
      kind: { type: Number, required: true },
      time: { type: Number, required: true },
    }),
    required: true,
  },
});

export type VrankLog = mongoose.InferSchemaType<typeof vrankLogSchema>;
export const VrankLog = mongoose.model("VrankLog", vrankLogSchema);
