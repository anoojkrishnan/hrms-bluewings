import type { Request, Response, NextFunction } from 'express';
import { ExpenseService } from './expense.service';
import { success } from '@/shared/utils/response';

const service = new ExpenseService();

export class ExpenseController {

  // ── Categories ─────────────────────────────────────────────────────────

  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cats = await service.listCategories(req.user.tenantId);
      res.json(success(cats));
    } catch (err) { next(err); }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const cat = await service.createCategory(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(cat));
    } catch (err) { next(err); }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cat = await service.updateCategory(req.params.publicId, req.body, req.user.tenantId, req.user.userId);
      res.json(success(cat));
    } catch (err) { next(err); }
  };

  // ── Claims ─────────────────────────────────────────────────────────────

  listClaims = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, permissions, employeePublicId } = req.user;
      const isHr = permissions.includes('expense.claim.approve');
      const empId = isHr ? undefined : employeePublicId;
      const result = await service.listClaims(tenantId, req.query as Record<string, unknown>, empId);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (err) { next(err); }
  };

  getClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await service.getClaim(req.params.publicId, req.user.tenantId);
      res.json(success(claim));
    } catch (err) { next(err); }
  };

  createClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId, employeePublicId } = req.user;
      const empId = employeePublicId ?? userId;
      const claim = await service.createClaim(req.body, tenantId, organizationId, empId, userId);
      res.status(201).json(success(claim));
    } catch (err) { next(err); }
  };

  submitClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await service.submitClaim(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success(claim));
    } catch (err) { next(err); }
  };

  approveClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await service.approveClaim(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success(claim));
    } catch (err) { next(err); }
  };

  rejectClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await service.rejectClaim(
        req.params.publicId, req.body.rejectionReason ?? 'Rejected', req.user.tenantId, req.user.userId,
      );
      res.json(success(claim));
    } catch (err) { next(err); }
  };
}
