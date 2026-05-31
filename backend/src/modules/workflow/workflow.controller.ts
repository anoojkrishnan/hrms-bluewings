import { type Request, type Response, type NextFunction } from 'express';
import { WorkflowService } from './workflow.service';
import { WorkflowStatus } from './workflow.types';
import { success, successList } from '@/shared/utils/response';
import { buildPaginationOptions } from '@/shared/utils/pagination';

export class WorkflowController {
  private readonly service: WorkflowService;

  constructor() {
    this.service = new WorkflowService();
  }

  // ── Workflows ─────────────────────────────────────────────────────────

  listWorkflows = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { page, limit } = buildPaginationOptions(req.query);
      const result = await this.service.listWorkflows(tenantId, page, limit);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  createWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const workflow = await this.service.createWorkflow(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(workflow));
    } catch (err) { next(err); }
  };

  updateWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { publicId } = req.params;
      const workflow = await this.service.updateWorkflow(publicId, req.body, tenantId, userId);
      res.json(success(workflow));
    } catch (err) { next(err); }
  };

  deleteWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { publicId } = req.params;
      await this.service.deleteWorkflow(publicId, tenantId, userId);
      res.status(204).send();
    } catch (err) { next(err); }
  };

  // ── Workflow Instances ────────────────────────────────────────────────

  listInstances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { status, module: mod, approverId, ...rest } = req.query as Record<string, string>;
      const result = await this.service.listInstances(
        tenantId,
        {
          ...(status && { status: status as WorkflowStatus }),
          ...(mod && { module: mod }),
          ...(approverId && { approverId }),
        },
        rest,
      );
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  getApprovalQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const result = await this.service.getApprovalQueue(userId, tenantId, req.query);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  getInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { publicId } = req.params;
      const instance = await this.service.getInstance(publicId, tenantId);
      res.json(success(instance));
    } catch (err) { next(err); }
  };

  approveInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { publicId } = req.params;
      const { comment } = req.body as { comment?: string };
      const instance = await this.service.approve(publicId, userId, comment, tenantId);
      res.json(success(instance));
    } catch (err) { next(err); }
  };

  rejectInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { publicId } = req.params;
      const { reason } = req.body as { reason: string };
      const instance = await this.service.reject(publicId, userId, reason, tenantId);
      res.json(success(instance));
    } catch (err) { next(err); }
  };

  cancelInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { publicId } = req.params;
      const instance = await this.service.cancel(publicId, userId, tenantId);
      res.json(success(instance));
    } catch (err) { next(err); }
  };
}
