import mongoose, { Schema } from 'mongoose';
import type { Company, Department, Designation, Grade, Location } from './organization.types';

// ─── Schemas (no generic Document extension to avoid tsc type explosion) ──────

const companySchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    name: { type: String, required: true },
    legalName: String,
    registrationNumber: String,
    cin: String,
    gstin: String,
    pan: String,
    tan: String,
    pfNumber: String,
    esiNumber: String,
    linNumber: String,
    country: { type: String, default: 'IN' },
    state: String,
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    financialYearStart: { type: String, enum: ['jan', 'apr'], default: 'apr' },
    logo: String,
    website: String,
    phone: String,
    email: String,
    address: { line1: String, line2: String, city: String, state: String, pincode: String, country: String },
    pfEnabled: { type: Boolean, default: false },
    esiEnabled: { type: Boolean, default: false },
    ptEnabled: { type: Boolean, default: false },
    lwfEnabled: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'companies', timestamps: true },
);
companySchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
companySchema.index({ tenantId: 1, deletedAt: 1 });

const departmentSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    code: String,
    parentDepartmentId: String,
    headEmployeeId: String,
    costCenterId: String,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'departments', timestamps: true },
);
departmentSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
departmentSchema.index({ tenantId: 1, organizationId: 1, deletedAt: 1 });

const designationSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: { type: String, required: true },
    name: { type: String, required: true },
    code: String,
    gradeId: String,
    bandId: String,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'designations', timestamps: true },
);
designationSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });

const gradeSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: { type: String, required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    level: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'grades', timestamps: true },
);
gradeSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
gradeSchema.index({ tenantId: 1, organizationId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

const locationSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: { type: String, required: true },
    name: { type: String, required: true },
    code: String,
    type: { type: String, enum: ['office', 'branch', 'remote', 'warehouse'], default: 'office' },
    address: { line1: String, line2: String, city: String, state: String, pincode: String, country: String },
    latitude: Number,
    longitude: Number,
    geofenceRadius: Number,
    timezone: { type: String, default: 'Asia/Kolkata' },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'locations', timestamps: true },
);
locationSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });

// ─── Models ────────────────────────────────────────────────────────────────

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const CompanyModel = getOrCreateModel('Company', companySchema);
const DepartmentModel = getOrCreateModel('Department', departmentSchema);
const DesignationModel = getOrCreateModel('Designation', designationSchema);
const GradeModel = getOrCreateModel('Grade', gradeSchema);
const LocationModel = getOrCreateModel('Location', locationSchema);

// ─── Repository ────────────────────────────────────────────────────────────

export class OrganizationRepository {
  private baseFilter(tenantId: string, organizationId?: string) {
    return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
  }

  // ── Companies ─────────────────────────────────────────────────────────

  async createCompany(data: Omit<Company, '_id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    const doc = await CompanyModel.create(data);
    return doc.toObject() as unknown as Company;
  }

  async findCompanyByPublicId(publicId: string, tenantId: string): Promise<Company | null> {
    const doc = await CompanyModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Company | null;
  }

  async findCompaniesByTenant(tenantId: string): Promise<Company[]> {
    const docs = await CompanyModel.find(this.baseFilter(tenantId)).sort({ name: 1 }).lean();
    return docs as unknown as Company[];
  }

  async updateCompany(publicId: string, tenantId: string, data: Partial<Company>): Promise<Company | null> {
    const doc = await CompanyModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Company | null;
  }

  async clearCompanyLogo(publicId: string, tenantId: string, updatedBy: string): Promise<Company | null> {
    const doc = await CompanyModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: { updatedBy }, $unset: { logo: '' } },
      { new: true },
    ).lean();
    return doc as unknown as Company | null;
  }

  async softDeleteCompany(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await CompanyModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // ── Departments ───────────────────────────────────────────────────────

  async createDepartment(data: Omit<Department, '_id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    const doc = await DepartmentModel.create(data);
    return doc.toObject() as unknown as Department;
  }

  async findDepartmentByPublicId(publicId: string, tenantId: string): Promise<Department | null> {
    const doc = await DepartmentModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Department | null;
  }

  async findDepartmentsByOrg(tenantId: string, organizationId: string): Promise<Department[]> {
    const docs = await DepartmentModel.find(this.baseFilter(tenantId, organizationId)).sort({ name: 1 }).lean();
    return docs as unknown as Department[];
  }

  async updateDepartment(publicId: string, tenantId: string, data: Partial<Department>): Promise<Department | null> {
    const doc = await DepartmentModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Department | null;
  }

  async softDeleteDepartment(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await DepartmentModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // ── Designations ──────────────────────────────────────────────────────

  async createDesignation(data: Omit<Designation, '_id' | 'createdAt' | 'updatedAt'>): Promise<Designation> {
    const doc = await DesignationModel.create(data);
    return doc.toObject() as unknown as Designation;
  }

  async findDesignationByPublicId(publicId: string, tenantId: string): Promise<Designation | null> {
    const doc = await DesignationModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Designation | null;
  }

  async findDesignationsByOrg(tenantId: string, organizationId: string): Promise<Designation[]> {
    const docs = await DesignationModel.find(this.baseFilter(tenantId, organizationId)).sort({ name: 1 }).lean();
    return docs as unknown as Designation[];
  }

  async updateDesignation(publicId: string, tenantId: string, data: Partial<Designation>): Promise<Designation | null> {
    const doc = await DesignationModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Designation | null;
  }

  async softDeleteDesignation(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await DesignationModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // ── Grades ────────────────────────────────────────────────────────────

  async createGrade(data: Omit<Grade, '_id' | 'createdAt' | 'updatedAt'>): Promise<Grade> {
    const doc = await GradeModel.create(data);
    return doc.toObject() as unknown as Grade;
  }

  async findGradeByPublicId(publicId: string, tenantId: string): Promise<Grade | null> {
    const doc = await GradeModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Grade | null;
  }

  async findGradesByOrg(tenantId: string, organizationId: string): Promise<Grade[]> {
    const docs = await GradeModel.find(this.baseFilter(tenantId, organizationId)).sort({ level: 1 }).lean();
    return docs as unknown as Grade[];
  }

  async updateGrade(publicId: string, tenantId: string, data: Partial<Grade>): Promise<Grade | null> {
    const doc = await GradeModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Grade | null;
  }

  async softDeleteGrade(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await GradeModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // ── Locations ─────────────────────────────────────────────────────────

  async createLocation(data: Omit<Location, '_id' | 'createdAt' | 'updatedAt'>): Promise<Location> {
    const doc = await LocationModel.create(data);
    return doc.toObject() as unknown as Location;
  }

  async findLocationByPublicId(publicId: string, tenantId: string): Promise<Location | null> {
    const doc = await LocationModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Location | null;
  }

  async findLocationsByOrg(tenantId: string, organizationId: string): Promise<Location[]> {
    const docs = await LocationModel.find(this.baseFilter(tenantId, organizationId)).sort({ name: 1 }).lean();
    return docs as unknown as Location[];
  }

  async updateLocation(publicId: string, tenantId: string, data: Partial<Location>): Promise<Location | null> {
    const doc = await LocationModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Location | null;
  }

  async softDeleteLocation(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await LocationModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }
}
