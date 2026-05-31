import mongoose, { Schema } from 'mongoose';
import type { Role, Permission, UserRole, DelegationRule } from './rbac.types';
import { DataScope } from '@/shared/types/common';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions, buildPaginationMeta } from '@/shared/utils/pagination';

const roleSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: { type: String },
    name: { type: String, required: true },
    code: { type: String, required: true },
    isSystemRole: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: true },
    dataScope: { type: String, enum: Object.values(DataScope), required: true },
    description: { type: String },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'roles', timestamps: true },
);
roleSchema.index({ tenantId: 1, code: 1 }, { unique: true });
roleSchema.index({ tenantId: 1, publicId: 1 });

const permissionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    module: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, default: '' },
    isSystemPermission: { type: Boolean, default: true },
  },
  { collection: 'permissions', timestamps: false },
);

const rolePermissionSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    rolePublicId: { type: String, required: true },
    permissionCode: { type: String, required: true },
    grantedAt: { type: Date, default: () => new Date() },
    grantedBy: { type: String, required: true },
  },
  { collection: 'role_permissions', timestamps: false },
);
rolePermissionSchema.index({ tenantId: 1, rolePublicId: 1 });
rolePermissionSchema.index({ tenantId: 1, rolePublicId: 1, permissionCode: 1 }, { unique: true });

const userRoleSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    organizationId: { type: String, required: true },
    userId: { type: String, required: true },
    rolePublicId: { type: String, required: true },
    assignedAt: { type: Date, default: () => new Date() },
    assignedBy: { type: String, required: true },
    expiresAt: { type: Date },
  },
  { collection: 'user_roles', timestamps: false },
);
userRoleSchema.index({ tenantId: 1, userId: 1, organizationId: 1 });
userRoleSchema.index({ tenantId: 1, userId: 1, rolePublicId: 1 }, { unique: true });

const delegationSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    delegatorId: { type: String, required: true },
    delegateeId: { type: String, required: true },
    permissionCodes: [{ type: String }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    auditLogId: { type: String },
  },
  { collection: 'delegation_rules', timestamps: true },
);
delegationSchema.index({ tenantId: 1, delegateeId: 1, isActive: 1 });

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const RoleModel = getOrCreateModel('Role', roleSchema);
const PermissionModel = getOrCreateModel('Permission', permissionSchema);
const RolePermissionModel = getOrCreateModel('RolePermission', rolePermissionSchema);
const UserRoleModel = getOrCreateModel('UserRole', userRoleSchema);
const DelegationModel = getOrCreateModel('DelegationRule', delegationSchema);

export class RbacRepository {
  // Roles
  async createRole(data: Omit<Role, '_id'>): Promise<Role> {
    const doc = await RoleModel.create(data);
    return doc.toObject() as unknown as Role;
  }

  async findRoleByPublicId(publicId: string, tenantId: string): Promise<Role | null> {
    const doc = await RoleModel.findOne({ publicId, tenantId, deletedAt: null }).lean();
    return doc as unknown as Role | null;
  }

  async findRolesByTenant(tenantId: string, page: number, limit: number): Promise<PaginatedResult<Role>> {
    const options = buildPaginationOptions({ page, limit });
    const filter = { tenantId, deletedAt: null };
    const [data, total] = await Promise.all([
      RoleModel.find(filter).sort(options.sort).skip(options.skip).limit(options.limit).lean(),
      RoleModel.countDocuments(filter),
    ]);
    return { data: data as unknown as Role[], meta: buildPaginationMeta(page, limit, total) };
  }

  async findSystemRoleByCode(code: string, tenantId: string): Promise<Role | null> {
    const doc = await RoleModel.findOne({ code, tenantId, isSystemRole: true, deletedAt: null }).lean();
    return doc as unknown as Role | null;
  }

  async updateRole(publicId: string, tenantId: string, data: Partial<Role>): Promise<Role | null> {
    const doc = await RoleModel.findOneAndUpdate(
      { publicId, tenantId, deletedAt: null },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Role | null;
  }

  async softDeleteRole(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await RoleModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // Permissions
  async upsertPermission(perm: Permission): Promise<void> {
    await PermissionModel.findOneAndUpdate(
      { code: perm.code },
      { $set: perm },
      { upsert: true },
    );
  }

  async findAllPermissions(): Promise<Permission[]> {
    const docs = await PermissionModel.find().lean();
    return docs as unknown as Permission[];
  }

  // Role permissions
  async setRolePermissions(
    tenantId: string,
    rolePublicId: string,
    permissionCodes: string[],
    grantedBy: string,
  ): Promise<void> {
    await RolePermissionModel.deleteMany({ tenantId, rolePublicId });
    if (permissionCodes.length > 0) {
      const docs = permissionCodes.map((permissionCode) => ({
        tenantId,
        rolePublicId,
        permissionCode,
        grantedAt: new Date(),
        grantedBy,
      }));
      await RolePermissionModel.insertMany(docs);
    }
  }

  async addRolePermissions(
    tenantId: string,
    rolePublicId: string,
    permissionCodes: string[],
    grantedBy: string,
  ): Promise<void> {
    const docs = permissionCodes.map((permissionCode) => ({
      tenantId,
      rolePublicId,
      permissionCode,
      grantedAt: new Date(),
      grantedBy,
    }));
    await RolePermissionModel.insertMany(docs, { ordered: false }).catch(() => {
      // ignore duplicate key errors
    });
  }

  async findPermissionsByRoles(rolePublicIds: string[], tenantId: string): Promise<string[]> {
    if (rolePublicIds.length === 0) return [];
    const docs = await RolePermissionModel.find({
      tenantId,
      rolePublicId: { $in: rolePublicIds },
    }).lean();
    return [...new Set((docs as unknown as Array<{ permissionCode: string }>).map((d) => d.permissionCode))];
  }

  async getRolePermissions(tenantId: string, rolePublicId: string): Promise<string[]> {
    const docs = await RolePermissionModel.find({ tenantId, rolePublicId }).lean();
    return (docs as unknown as Array<{ permissionCode: string }>).map((d) => d.permissionCode);
  }

  // User roles
  async assignRole(data: UserRole): Promise<void> {
    await UserRoleModel.findOneAndUpdate(
      { tenantId: data.tenantId, userId: data.userId, rolePublicId: data.rolePublicId },
      { $set: data },
      { upsert: true },
    );
  }

  async revokeRole(userId: string, rolePublicId: string, tenantId: string): Promise<void> {
    await UserRoleModel.deleteOne({ userId, rolePublicId, tenantId });
  }

  async findRolesByUser(userId: string, tenantId: string, organizationId: string): Promise<Role[]> {
    const userRoles = await UserRoleModel.find({
      userId,
      tenantId,
      organizationId,
      $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
    }).lean();

    if (userRoles.length === 0) return [];

    const rolePublicIds = (userRoles as unknown as Array<{ rolePublicId: string }>).map((ur) => ur.rolePublicId);
    const docs = await RoleModel.find({
      publicId: { $in: rolePublicIds },
      tenantId,
      deletedAt: null,
    }).lean();
    return docs as unknown as Role[];
  }

  async getUserRoles(userId: string, tenantId: string): Promise<UserRole[]> {
    const docs = await UserRoleModel.find({ userId, tenantId }).lean();
    return docs as unknown as UserRole[];
  }

  async findFirstUserWithRolePublicId(rolePublicId: string, tenantId: string): Promise<UserRole | null> {
    const doc = await UserRoleModel.findOne({ rolePublicId, tenantId }).lean();
    return doc as unknown as UserRole | null;
  }

  // Delegations
  async createDelegation(data: DelegationRule): Promise<DelegationRule> {
    const doc = await DelegationModel.create(data);
    return doc.toObject() as unknown as DelegationRule;
  }

  async revokeDelegation(publicId: string, tenantId: string): Promise<void> {
    await DelegationModel.updateOne(
      { publicId, tenantId },
      { $set: { isActive: false } },
    );
  }

  async findActiveDelegations(delegateeId: string, tenantId: string): Promise<DelegationRule[]> {
    const now = new Date();
    const docs = await DelegationModel.find({
      delegateeId,
      tenantId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean();
    return docs as unknown as DelegationRule[];
  }

  async findDelegatedPermissions(userId: string, tenantId: string): Promise<string[]> {
    const delegations = await this.findActiveDelegations(userId, tenantId);
    const all = delegations.flatMap((d) => d.permissionCodes);
    return [...new Set(all)];
  }

  async listDelegations(tenantId: string, page: number, limit: number): Promise<PaginatedResult<DelegationRule>> {
    const options = buildPaginationOptions({ page, limit });
    const filter = { tenantId };
    const [data, total] = await Promise.all([
      DelegationModel.find(filter).sort(options.sort).skip(options.skip).limit(options.limit).lean(),
      DelegationModel.countDocuments(filter),
    ]);
    return { data: data as unknown as DelegationRule[], meta: buildPaginationMeta(page, limit, total) };
  }
}
