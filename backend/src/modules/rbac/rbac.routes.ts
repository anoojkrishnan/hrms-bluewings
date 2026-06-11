import { Router } from 'express';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { validate } from '@/shared/validators/common.schemas';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import {
  createRoleSchema,
  updateRoleSchema,
  setPermissionsSchema,
  assignRoleSchema,
  createDelegationSchema,
} from './rbac.validator';

const service = new RbacService();
const controller = new RbacController(service);

export const rbacRouter = Router();

rbacRouter.use(requireAuth, requireTenantContext);

// Roles
rbacRouter.get('/roles', requirePermission('rbac.role.view'), (req, res, next) => { void controller.listRoles(req, res, next); });
rbacRouter.get('/roles/:publicId', requirePermission('rbac.role.view'), (req, res, next) => { void controller.getRole(req, res, next); });
rbacRouter.post('/roles', requirePermission('rbac.role.create'), validate(createRoleSchema), (req, res, next) => { void controller.createRole(req, res, next); });
rbacRouter.put('/roles/:publicId', requirePermission('rbac.role.edit'), validate(updateRoleSchema), (req, res, next) => { void controller.updateRole(req, res, next); });
rbacRouter.delete('/roles/:publicId', requirePermission('rbac.role.delete'), (req, res, next) => { void controller.deleteRole(req, res, next); });

// Role permissions
rbacRouter.get('/roles/:publicId/permissions', requirePermission('rbac.role.view'), (req, res, next) => { void controller.getRolePermissions(req, res, next); });
rbacRouter.put('/roles/:publicId/permissions', requirePermission('rbac.permission.assign'), validate(setPermissionsSchema), (req, res, next) => { void controller.setRolePermissions(req, res, next); });

// All system permissions (for role editor UI)
rbacRouter.get('/permissions', requirePermission('rbac.role.view'), (req, res, next) => { void controller.listAllPermissions(req, res, next); });

// User role assignment
rbacRouter.post('/users/:userId/roles', validate(assignRoleSchema), (req, res, next) => { void controller.assignRole(req, res, next); });
rbacRouter.delete('/users/:userId/roles/:rolePublicId', (req, res, next) => { void controller.revokeRole(req, res, next); });

// Delegations
rbacRouter.get('/delegations', (req, res, next) => { void controller.listDelegations(req, res, next); });
rbacRouter.post('/delegations', validate(createDelegationSchema), (req, res, next) => { void controller.createDelegation(req, res, next); });
rbacRouter.delete('/delegations/:publicId', (req, res, next) => { void controller.revokeDelegation(req, res, next); });
