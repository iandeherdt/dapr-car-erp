import mongoose, { Schema } from "mongoose";

// ---------------------------------------------------------------------------
// Counter document — used for sequential invoice number generation
// ---------------------------------------------------------------------------

interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model<ICounter>("Counter", counterSchema);

// ---------------------------------------------------------------------------
// getNextInvoiceNumber
//
// Atomically increments the counter and returns a formatted invoice number
// such as "INV-2026-00042".  Uses findOneAndUpdate with upsert so the
// document is created on first call without a race condition.
// ---------------------------------------------------------------------------

export async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `invoice-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Zero-pad to 5 digits, e.g. 42 -> "00042"
  const paddedSeq = String(counter.seq).padStart(5, "0");
  return `INV-${year}-${paddedSeq}`;
}
