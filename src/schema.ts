import * as mongoose from "mongoose";

const vrankLogSchema = new mongoose.Schema({
  blocknum: { type: Number, required: true },
  round: { type: Number, required: true },
  logger: { type: String, required: true },
  proposer: { type: String, required: true },
  assessment: {
    early: [String],
    late: [String],
    lateTimes: [Number],
    notArrived: [String],
  },
});

const vrankLogMetadataSchema = new mongoose.Schema({
  minBlocknum: { type: Number, required: true },
  maxBlocknum: { type: Number, required: true },
});

vrankLogSchema.index({ blocknum: 1, round: 1, logger: 1 }, { unique: true });

export type VrankLog = mongoose.InferSchemaType<typeof vrankLogSchema>;
export const VrankLog = mongoose.model("VrankLog", vrankLogSchema);

export type VrankLogMetadata = mongoose.InferSchemaType<
  typeof vrankLogMetadataSchema
>;
export const VrankLogMetadata = mongoose.model(
  "vrankLogMetadata",
  vrankLogMetadataSchema,
);
