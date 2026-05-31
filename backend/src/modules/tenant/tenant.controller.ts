import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { success, successList } from '@/shared/utils/response';
import { buildPaginationOptions } from '@/shared/utils/pagination';

export class TenantController {
  constructor(private readonly service: TenantService) {}

  checkSlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = req.query['slug'] as string;
      const available = await this.service.checkSlugAvailable(slug);
      res.status(200).json(success({ available }));
    } catch (err) {
      next(err);
    }
  };

  listAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const opts = buildPaginationOptions(req.query);
      const result = await this.service.listAll(opts.page, opts.limit);
      res.status(200).json(successList(result.data, {
        page: opts.page,
        limit: opts.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / opts.limit),
        hasNext: opts.page * opts.limit < result.total,
        hasPrev: opts.page > 1,
      }));
    } catch (err) {
      next(err);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = await this.service.getTenantBySlug(req.params['slug']);
      res.status(200).json(success(tenant));
    } catch (err) {
      next(err);
    }
  };

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.signup(
        req.body,
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      res.status(201).json(success(result));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = await this.service.createTenant(
        req.body,
        req.user?.userId ?? 'system',
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      res.status(201).json(success(tenant));
    } catch (err) {
      next(err);
    }
  };

  suspend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantDto = await this.service.getTenantBySlug(req.params['slug']);
      await this.service.suspendTenant(
        tenantDto.publicId,
        (req.body as { reason?: string }).reason ?? '',
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      res.status(200).json(success({ message: 'Tenant suspended' }));
    } catch (err) {
      next(err);
    }
  };

  reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantDto = await this.service.getTenantBySlug(req.params['slug']);
      await this.service.reactivateTenant(
        tenantDto.publicId,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      res.status(200).json(success({ message: 'Tenant reactivated' }));
    } catch (err) {
      next(err);
    }
  };

  getUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantDto = await this.service.getTenantBySlug(req.params['slug']);
      const usage = await this.service.getUsageCounters(tenantDto.publicId);
      res.status(200).json(success(usage));
    } catch (err) {
      next(err);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await this.service.getSettings(req.user.tenantId);
      res.status(200).json(success(settings));
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await this.service.updateSettings(
        req.user.tenantId,
        req.body,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
        req.requestId,
      );
      res.status(200).json(success(settings));
    } catch (err) {
      next(err);
    }
  };

  getModules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modules = await this.service.getModules(req.user.tenantId);
      res.status(200).json(success(modules));
    } catch (err) {
      next(err);
    }
  };

  setModuleEnabled = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { moduleCode } = req.params;
      const { enabled } = req.body as { enabled: boolean };
      await this.service.setModuleEnabled(
        req.user.tenantId,
        moduleCode,
        enabled,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
        req.requestId,
      );
      res.status(200).json(success({ message: 'Module updated' }));
    } catch (err) {
      next(err);
    }
  };
}
