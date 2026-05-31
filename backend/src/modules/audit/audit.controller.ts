import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { success, successList } from '@/shared/utils/response';

export class AuditController {
  constructor(private readonly service: AuditService) {}

  listByTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const result = await this.service.findByTenant(tenantId, req.query);
      res.status(200).json(successList(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  };

  listByEntity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { entityPublicId } = req.params;
      const logs = await this.service.findByEntity(tenantId, entityPublicId);
      res.status(200).json(success(logs));
    } catch (err) {
      next(err);
    }
  };
}
