import { type Request, type Response, type NextFunction } from 'express';
import { DynamicFormsService } from './dynamic-forms.service';
import { success, successList } from '@/shared/utils/response';

export class DynamicFormsController {
  private readonly service: DynamicFormsService;

  constructor() {
    this.service = new DynamicFormsService();
  }

  listForms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const result = await this.service.listForms(tenantId, req.query as Record<string, string>);
      res.json(successList(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  };

  createForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const form = await this.service.createForm(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(form));
    } catch (err) {
      next(err);
    }
  };

  getForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const form = await this.service.getForm(req.params.publicId, tenantId);
      res.json(success(form));
    } catch (err) {
      next(err);
    }
  };

  updateForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const form = await this.service.updateForm(req.params.publicId, req.body, tenantId, userId);
      res.json(success(form));
    } catch (err) {
      next(err);
    }
  };

  deleteForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      await this.service.deleteForm(req.params.publicId, tenantId, userId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  listSubmissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const result = await this.service.getSubmissions(
        req.params.publicId,
        tenantId,
        req.query as Record<string, string>,
      );
      res.json(successList(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  };

  submitForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const submission = await this.service.submitForm(
        req.params.publicId,
        req.body,
        userId,
        tenantId,
        organizationId,
      );
      res.status(201).json(success(submission));
    } catch (err) {
      next(err);
    }
  };

  getSubmission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const submission = await this.service.getSubmission(
        req.params.publicId,
        req.params.subPublicId,
        tenantId,
      );
      res.json(success(submission));
    } catch (err) {
      next(err);
    }
  };
}
