import mongoose, { Document, Schema } from 'mongoose';

// Counter for sequential invoice numbers
interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model<ICounter>('Counter', counterSchema);

export async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `invoice-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `INV-${year}-${paddedSeq}`;
}

// Line item subdocument
export interface IMongoLineItem {
  _id?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  lineType: 'part' | 'labor';
}

const lineItemSchema = new Schema<IMongoLineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPriceCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    lineType: { type: String, enum: ['part', 'labor'], required: true },
  },
  { _id: true }
);

// Invoice document
export type InvoiceMongooseStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface IMongoInvoice extends Document {
  invoiceNumber: string;
  workOrderId: string;
  customerId: string;
  status: InvoiceMongooseStatus;
  lineItems: IMongoLineItem[];
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

const invoiceSchema = new Schema<IMongoInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    workOrderId: { type: String, required: true },
    customerId: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
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
  { timestamps: true }
);

invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ workOrderId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

export const InvoiceModel = mongoose.model<IMongoInvoice>('Invoice', invoiceSchema);
