import mongoose, { Document, Schema } from "mongoose";

// ---------------------------------------------------------------------------
// Line item subdocument
// ---------------------------------------------------------------------------

export interface ILineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  lineType: "part" | "labor";
}

const lineItemSchema = new Schema<ILineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPriceCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    lineType: { type: String, enum: ["part", "labor"], required: true },
  },
  { _id: true }
);

// ---------------------------------------------------------------------------
// Invoice document
// ---------------------------------------------------------------------------

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export interface IInvoice extends Document {
  invoiceNumber: string;
  workOrderId: string;
  customerId: string;
  status: InvoiceStatus;
  lineItems: ILineItem[];
  subtotalCents: number;
  taxRate: number;
  taxAmountCents: number;
  totalCents: number;
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    workOrderId: { type: String, required: true },
    customerId: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    lineItems: { type: [lineItemSchema], default: [] },
    subtotalCents: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0.21 },
    taxAmountCents: { type: Number, default: 0 },
    totalCents: { type: Number, default: 0 },
    issuedAt: { type: Date },
    dueAt: { type: Date },
    paidAt: { type: Date },
    notes: { type: String },
  },
  {
    timestamps: true, // auto-manages createdAt / updatedAt
  }
);

// Indexes for common query patterns
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ workOrderId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
