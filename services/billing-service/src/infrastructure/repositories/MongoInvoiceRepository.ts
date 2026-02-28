import { IInvoiceRepository, ListInvoicesParams, ListInvoicesResult } from '../../domain/repositories/IInvoiceRepository';
import { InvoiceEntity, InvoiceStatus, CreateInvoiceInput } from '../../domain/entities/Invoice';
import { InvoiceModel, IMongoInvoice, IMongoLineItem } from '../schemas/InvoiceMongooseSchema';
import mongoose from 'mongoose';

function toEntity(doc: IMongoInvoice): InvoiceEntity {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    invoiceNumber: doc.invoiceNumber,
    workOrderId: doc.workOrderId,
    customerId: doc.customerId,
    status: doc.status as InvoiceStatus,
    lineItems: doc.lineItems.map((li) => ({
      id: (li as IMongoLineItem & { _id?: mongoose.Types.ObjectId })._id?.toString() ?? '',
      description: li.description,
      quantity: li.quantity,
      unitPriceCents: li.unitPriceCents,
      totalCents: li.totalCents,
      lineType: li.lineType,
    })),
    subtotalCents: doc.subtotalCents,
    taxRate: doc.taxRate,
    taxAmountCents: doc.taxAmountCents,
    totalCents: doc.totalCents,
    issuedAt: doc.issuedAt ?? null,
    dueAt: doc.dueAt ?? null,
    paidAt: doc.paidAt ?? null,
    notes: doc.notes ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoInvoiceRepository implements IInvoiceRepository {
  async create(data: CreateInvoiceInput & {
    invoiceNumber: string;
    subtotalCents: number;
    taxAmountCents: number;
    totalCents: number;
    issuedAt: Date;
    dueAt: Date;
  }): Promise<InvoiceEntity> {
    const invoice = new InvoiceModel({
      invoiceNumber: data.invoiceNumber,
      workOrderId: data.workOrderId,
      customerId: data.customerId,
      status: 'draft',
      lineItems: data.lineItems,
      subtotalCents: data.subtotalCents,
      taxRate: data.taxRate ?? 0.21,
      taxAmountCents: data.taxAmountCents,
      totalCents: data.totalCents,
      issuedAt: data.issuedAt,
      dueAt: data.dueAt,
      notes: data.notes ?? '',
    });
    await invoice.save();
    return toEntity(invoice);
  }

  async findById(id: string): Promise<InvoiceEntity | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await InvoiceModel.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findMany(params: ListInvoicesParams): Promise<ListInvoicesResult> {
    const { page, pageSize, statusFilter } = params;
    const skip = (page - 1) * pageSize;
    const filter: Record<string, unknown> = {};
    if (statusFilter) filter.status = statusFilter;
    const [invoices, totalCount] = await Promise.all([
      InvoiceModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      InvoiceModel.countDocuments(filter),
    ]);
    return { invoices: invoices.map(toEntity), totalCount };
  }

  async findByCustomerId(customerId: string, params: { page: number; pageSize: number }): Promise<ListInvoicesResult> {
    const skip = (params.page - 1) * params.pageSize;
    const [invoices, totalCount] = await Promise.all([
      InvoiceModel.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(params.pageSize),
      InvoiceModel.countDocuments({ customerId }),
    ]);
    return { invoices: invoices.map(toEntity), totalCount };
  }

  async findByWorkOrderId(workOrderId: string): Promise<InvoiceEntity | null> {
    const doc = await InvoiceModel.findOne({ workOrderId });
    return doc ? toEntity(doc) : null;
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<InvoiceEntity> {
    const update: Record<string, unknown> = { status };
    if (status === 'paid') {
      update.paidAt = new Date();
    }
    const doc = await InvoiceModel.findByIdAndUpdate(id, update, { new: true });
    if (!doc) throw new Error(`Invoice ${id} not found`);
    return toEntity(doc);
  }
}
