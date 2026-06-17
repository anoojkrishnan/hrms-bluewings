import { type Request, type Response, type NextFunction } from 'express';
import { EmployeeService } from './employee.service';
import { success, successList } from '@/shared/utils/response';

export class EmployeeController {
  private readonly service: EmployeeService;

  constructor() {
    this.service = new EmployeeService();
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const employee = await this.service.createEmployee(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(employee));
    } catch (err) { next(err); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const { status, departmentId, locationId, search, ...query } = req.query as Record<string, string>;
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (departmentId) filter.departmentId = departmentId;
      if (locationId) filter.locationId = locationId;
      if (search) filter._search = search;
      const result = await this.service.listEmployees(tenantId, organizationId, filter, query, req.user);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.service.getEmployee(req.params.employeeCode, req.user.tenantId);
      res.json(success(employee));
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const employee = await this.service.updateEmployee(req.params.employeeCode, req.body, tenantId, userId);
      res.json(success(employee));
    } catch (err) { next(err); }
  };

  changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const employee = await this.service.changeStatus(req.params.employeeCode, req.body, tenantId, userId);
      res.json(success(employee));
    } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteEmployee(req.params.employeeCode, req.user.tenantId, req.user.userId);
      res.json(success({ message: 'Employee deleted.' }));
    } catch (err) { next(err); }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await this.service.getTimeline(req.params.employeeCode, req.user.tenantId);
      res.json(success(history));
    } catch (err) { next(err); }
  };

  getPersonalDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const details = await this.service.getPersonalDetails(req.params.employeeCode, req.user.tenantId);
      res.json(success(details));
    } catch (err) { next(err); }
  };

  updatePersonalDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      await this.service.updatePersonalDetails(req.params.employeeCode, req.body, tenantId, userId);
      res.json(success({ message: 'Personal details updated.' }));
    } catch (err) { next(err); }
  };

  getBankDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const details = await this.service.getBankDetails(req.params.employeeCode, req.user.tenantId);
      res.json(success(details));
    } catch (err) { next(err); }
  };

  upsertBankDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      await this.service.upsertBankDetails(req.params.employeeCode, req.body, tenantId, userId);
      res.json(success({ message: 'Bank details updated.' }));
    } catch (err) { next(err); }
  };

  getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const docs = await this.service.getDocuments(req.params.employeeCode, req.user.tenantId);
      res.json(success(docs));
    } catch (err) { next(err); }
  };

  uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const buffer = req.body as Buffer;
      const fileName = decodeURIComponent((req.headers['x-file-name'] as string) || 'document');
      const mimeType = (req.headers['content-type'] as string) || 'application/octet-stream';
      const sizeBytes = parseInt((req.headers['x-file-size'] as string) || '0', 10);
      const documentType = req.headers['x-document-type'] as string | undefined;
      const documentName = req.headers['x-document-name'] ? decodeURIComponent(req.headers['x-document-name'] as string) : undefined;
      const expiryDate = req.headers['x-expiry-date'] as string | undefined;
      const doc = await this.service.uploadDocument(
        req.params.employeeCode, tenantId, tenantId, userId, organizationId,
        fileName, mimeType, sizeBytes, buffer, documentType, documentName, expiryDate,
      );
      res.status(201).json(success(doc));
    } catch (err) { next(err); }
  };

  updateDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const doc = await this.service.updateDocument(
        req.params.docPublicId, req.params.employeeCode, tenantId, userId, req.body,
      );
      res.json(success(doc));
    } catch (err) { next(err); }
  };

  presignDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const tenantPublicId = tenantId;
      const { fileName, mimeType } = req.body as { fileName: string; mimeType: string };
      const result = await this.service.uploadDocumentPresign(
        req.params.employeeCode, tenantId, tenantPublicId, userId, fileName, mimeType,
      );
      res.json(success(result));
    } catch (err) { next(err); }
  };

  confirmDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const doc = await this.service.confirmDocumentUpload(req.params.employeeCode, req.body, tenantId, organizationId, userId);
      res.status(201).json(success(doc));
    } catch (err) { next(err); }
  };

  downloadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const result = await this.service.getDocumentDownloadUrl(
        req.params.docPublicId, req.params.employeeCode, tenantId,
      );
      res.json(success(result));
    } catch (err) { next(err); }
  };

  deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      await this.service.deleteDocument(req.params.docPublicId, req.params.employeeCode, tenantId, userId);
      res.json(success({ message: 'Document deleted.' }));
    } catch (err) { next(err); }
  };

  inviteEss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const employee = await this.service.inviteEss(req.params.employeeCode, tenantId, organizationId, userId);
      res.json(success(employee));
    } catch (err) { next(err); }
  };

  disableEss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const employee = await this.service.disableEss(req.params.employeeCode, tenantId, userId);
      res.json(success(employee));
    } catch (err) { next(err); }
  };
}
