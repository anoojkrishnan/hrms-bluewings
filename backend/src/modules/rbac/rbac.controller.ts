import { Request, Response, NextFunction } from 'express';
import { RbacService } from './rbac.service';
import { success, successList } from '@/shared/utils/response';
import { buildPaginationOptions } from '@/shared/utils/pagination';

export class RbacController {
  constructor(private readonly service: RbacService) {}

  listRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listRoles(req.user.tenantId, req.query);
      res.status(200).json(successList(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  };

  getRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await this.service.getRoleByPublicId(req.params['publicId'], req.user.tenantId);
      res.status(200).json(success(role));
    } catch (err) {
      next(err);
    }
  };

  createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await this.service.createRole(
        req.user.tenantId,
        req.body,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
        req.requestId,
      );
      res.status(201).json(success(role));
    } catch (err) {
      next(err);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await this.service.updateRole(
        req.params['publicId'],
        req.user.tenantId,
        req.body,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
        req.requestId,
      );
      res.status(200).json(success(role));
    } catch (err) {
      next(err);
    }
  };

  deleteRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteRole(
        req.params['publicId'],
        req.user.tenantId,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      res.status(200).json(success({ message: 'Role deleted' }));
    } catch (err) {
      next(err);
    }
  };

  getRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = await this.service.getRolePermissions(req.params['publicId'], req.user.tenantId);
      res.status(200).json(success(permissions));
    } catch (err) {
      next(err);
    }
  };

  setRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.setRolePermissions(
        req.params['publicId'],
        req.user.tenantId,
        (req.body as { permissionCodes: string[] }).permissionCodes,
        req.user.userId,
      );
      res.status(200).json(success({ message: 'Permissions updated' }));
    } catch (err) {
      next(err);
    }
  };

  listAllPermissions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = await this.service.listAllPermissions();
      res.status(200).json(success(permissions));
    } catch (err) {
      next(err);
    }
  };

  assignRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { rolePublicId } = req.body as { rolePublicId: string };
      await this.service.assignRoleToUser(
        userId,
        rolePublicId,
        req.user.tenantId,
        req.user.organizationId,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      res.status(200).json(success({ message: 'Role assigned' }));
    } catch (err) {
      next(err);
    }
  };

  revokeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, rolePublicId } = req.params;
      await this.service.revokeRoleFromUser(
        userId,
        rolePublicId,
        req.user.tenantId,
        req.user.userId,
      );
      res.status(200).json(success({ message: 'Role revoked' }));
    } catch (err) {
      next(err);
    }
  };

  listDelegations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const opts = buildPaginationOptions(req.query);
      const result = await this.service.listDelegations(req.user.tenantId, opts);
      res.status(200).json(successList(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  };

  createDelegation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const delegation = await this.service.createDelegation(
        { ...req.body, tenantId: req.user.tenantId } as Parameters<RbacService['createDelegation']>[0],
        req.user.userId,
      );
      res.status(201).json(success(delegation));
    } catch (err) {
      next(err);
    }
  };

  revokeDelegation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.revokeDelegation(req.params['publicId'], req.user.tenantId, req.user.userId);
      res.status(200).json(success({ message: 'Delegation revoked' }));
    } catch (err) {
      next(err);
    }
  };
}
