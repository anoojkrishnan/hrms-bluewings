import mongoose, { Schema } from 'mongoose';
import type { ApiClient, WebhookSubscription, WebhookDelivery } from './integrations.types';

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const apiClientSchema = new Schema({
  publicId:      { type: String, required: true, unique: true },
  tenantId:      { type: String, required: true, index: true },
  organizationId: String,
  name:          { type: String, required: true },
  description:   String,
  keyHash:       { type: String, required: true },
  keyPrefix:     { type: String, required: true },
  isActive:      { type: Boolean, default: true },
  lastUsedAt:    Date,
  createdBy:     String,
  updatedBy:     String,
  deletedAt:     { type: Date, default: null },
}, { collection: 'api_clients', timestamps: true });
apiClientSchema.index({ tenantId: 1, publicId: 1 });

const webhookSchema = new Schema({
  publicId:      { type: String, required: true, unique: true },
  tenantId:      { type: String, required: true, index: true },
  organizationId: String,
  name:          { type: String, required: true },
  url:           { type: String, required: true },
  secret:        { type: String, required: true },
  events:        [String],
  isActive:      { type: Boolean, default: true },
  createdBy:     String,
  updatedBy:     String,
  deletedAt:     { type: Date, default: null },
}, { collection: 'webhook_subscriptions', timestamps: true });
webhookSchema.index({ tenantId: 1 });

const deliverySchema = new Schema({
  publicId:       { type: String, required: true, unique: true },
  tenantId:       { type: String, required: true },
  webhookId:      { type: String, required: true },
  event:          String,
  payload:        Schema.Types.Mixed,
  responseStatus: Number,
  responseBody:   String,
  durationMs:     Number,
  success:        { type: Boolean, required: true },
  error:          String,
  deliveredAt:    { type: Date, required: true },
}, { collection: 'webhook_delivery_logs', timestamps: false });
deliverySchema.index({ tenantId: 1, webhookId: 1, deliveredAt: -1 });

const ApiClientModel  = getOrCreateModel('ApiClient', apiClientSchema);
const WebhookModel    = getOrCreateModel('WebhookSubscription', webhookSchema);
const DeliveryModel   = getOrCreateModel('WebhookDelivery', deliverySchema);

export class IntegrationsRepository {
  private base(tenantId: string) { return { tenantId, deletedAt: null }; }

  // ── API Clients ────────────────────────────────────────────────────────────

  async createApiClient(data: Omit<ApiClient, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiClient> {
    const doc = await ApiClientModel.create(data);
    return doc.toObject() as unknown as ApiClient;
  }

  async findApiClients(tenantId: string): Promise<ApiClient[]> {
    const docs = await ApiClientModel.find(this.base(tenantId)).sort({ createdAt: -1 }).lean();
    return docs as unknown as ApiClient[];
  }

  async findApiClientByPublicId(publicId: string, tenantId: string): Promise<ApiClient | null> {
    const doc = await ApiClientModel.findOne({ ...this.base(tenantId), publicId }).lean();
    return doc as unknown as ApiClient | null;
  }

  async findApiClientByKeyHash(keyHash: string): Promise<ApiClient | null> {
    const doc = await ApiClientModel.findOne({ keyHash, isActive: true, deletedAt: null }).lean();
    return doc as unknown as ApiClient | null;
  }

  async updateApiClient(publicId: string, tenantId: string, patch: Partial<ApiClient>): Promise<ApiClient | null> {
    const doc = await ApiClientModel.findOneAndUpdate(
      { ...this.base(tenantId), publicId },
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as ApiClient | null;
  }

  async softDeleteApiClient(publicId: string, tenantId: string): Promise<void> {
    await ApiClientModel.updateOne(
      { ...this.base(tenantId), publicId },
      { $set: { deletedAt: new Date(), isActive: false } },
    );
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  async createWebhook(data: Omit<WebhookSubscription, '_id' | 'createdAt' | 'updatedAt'>): Promise<WebhookSubscription> {
    const doc = await WebhookModel.create(data);
    return doc.toObject() as unknown as WebhookSubscription;
  }

  async findWebhooks(tenantId: string): Promise<WebhookSubscription[]> {
    const docs = await WebhookModel.find(this.base(tenantId)).sort({ createdAt: -1 }).lean();
    return docs as unknown as WebhookSubscription[];
  }

  async findWebhookByPublicId(publicId: string, tenantId: string): Promise<WebhookSubscription | null> {
    const doc = await WebhookModel.findOne({ ...this.base(tenantId), publicId }).lean();
    return doc as unknown as WebhookSubscription | null;
  }

  async findWebhooksByEvent(event: string, tenantId: string): Promise<WebhookSubscription[]> {
    const docs = await WebhookModel.find({
      ...this.base(tenantId), isActive: true, events: event,
    }).lean();
    return docs as unknown as WebhookSubscription[];
  }

  async updateWebhook(publicId: string, tenantId: string, patch: Partial<WebhookSubscription>): Promise<WebhookSubscription | null> {
    const doc = await WebhookModel.findOneAndUpdate(
      { ...this.base(tenantId), publicId },
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as WebhookSubscription | null;
  }

  async softDeleteWebhook(publicId: string, tenantId: string): Promise<void> {
    await WebhookModel.updateOne(
      { ...this.base(tenantId), publicId },
      { $set: { deletedAt: new Date(), isActive: false } },
    );
  }

  // ── Deliveries ─────────────────────────────────────────────────────────────

  async createDelivery(data: WebhookDelivery): Promise<void> {
    await DeliveryModel.create(data);
  }

  async findDeliveries(webhookId: string, tenantId: string): Promise<WebhookDelivery[]> {
    const docs = await DeliveryModel.find({ tenantId, webhookId }).sort({ deliveredAt: -1 }).limit(50).lean();
    return docs as unknown as WebhookDelivery[];
  }
}
