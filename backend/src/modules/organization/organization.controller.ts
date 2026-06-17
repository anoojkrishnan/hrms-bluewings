import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';
import { success, successList } from '@/shared/utils/response';

export class OrganizationController {
  private readonly service: OrganizationService;

  constructor() {
    this.service = new OrganizationService();
  }

  // ── Companies ─────────────────────────────────────────────────────────

  createCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const company = await this.service.createCompany(req.body, tenantId, userId);
      res.status(201).json(success(company));
    } catch (err) { next(err); }
  };

  listCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companies = await this.service.listCompanies(req.user.tenantId);
      res.json(successList(companies, { page: 1, limit: companies.length, total: companies.length, totalPages: 1, hasNext: false, hasPrev: false }));
    } catch (err) { next(err); }
  };

  getCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.service.getCompanyByPublicId(req.params.publicId, req.user.tenantId);
      res.json(success(company));
    } catch (err) { next(err); }
  };

  updateCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const company = await this.service.updateCompany(req.params.publicId, req.body, tenantId, userId);
      res.json(success(company));
    } catch (err) { next(err); }
  };

  deleteCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteCompany(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ message: 'Company deleted.' }));
    } catch (err) { next(err); }
  };

  presignLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const result = await this.service.presignLogoUpload(req.params.publicId, tenantId, req.body.mimeType as string);
      res.json(success(result));
    } catch (err) { next(err); }
  };

  confirmLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const company = await this.service.confirmLogoUpload(req.params.publicId, tenantId, req.body.s3Key as string, userId);
      res.json(success(company));
    } catch (err) { next(err); }
  };

  uploadLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request body must be an image file' } });
        return;
      }
      const mimeType = (req.headers['content-type'] as string)?.split(';')[0].trim() || 'image/png';
      const company = await this.service.uploadCompanyLogoBuffer(req.params.publicId, tenantId, req.body, mimeType, userId);
      res.json(success(company));
    } catch (err) { next(err); }
  };

  deleteLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteCompanyLogo(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ message: 'Logo removed.' }));
    } catch (err) { next(err); }
  };

  // ── Departments ───────────────────────────────────────────────────────

  createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const dept = await this.service.createDepartment(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(dept));
    } catch (err) { next(err); }
  };

  listDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const depts = await this.service.listDepartments(tenantId, organizationId);
      res.json(successList(depts, { page: 1, limit: depts.length, total: depts.length, totalPages: 1, hasNext: false, hasPrev: false }));
    } catch (err) { next(err); }
  };

  getDepartmentTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const tree = await this.service.getDepartmentTree(tenantId, organizationId);
      res.json(success(tree));
    } catch (err) { next(err); }
  };

  getDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dept = await this.service.getDepartmentByPublicId(req.params.publicId, req.user.tenantId);
      res.json(success(dept));
    } catch (err) { next(err); }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const dept = await this.service.updateDepartment(req.params.publicId, req.body, tenantId, userId);
      res.json(success(dept));
    } catch (err) { next(err); }
  };

  deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteDepartment(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ message: 'Department deleted.' }));
    } catch (err) { next(err); }
  };

  // ── Designations ──────────────────────────────────────────────────────

  createDesignation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const d = await this.service.createDesignation(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(d));
    } catch (err) { next(err); }
  };

  listDesignations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const list = await this.service.listDesignations(tenantId, organizationId);
      res.json(successList(list, { page: 1, limit: list.length, total: list.length, totalPages: 1, hasNext: false, hasPrev: false }));
    } catch (err) { next(err); }
  };

  getDesignation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const d = await this.service.getDesignationByPublicId(req.params.publicId, req.user.tenantId);
      res.json(success(d));
    } catch (err) { next(err); }
  };

  updateDesignation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const d = await this.service.updateDesignation(req.params.publicId, req.body, tenantId, userId);
      res.json(success(d));
    } catch (err) { next(err); }
  };

  deleteDesignation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteDesignation(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ message: 'Designation deleted.' }));
    } catch (err) { next(err); }
  };

  // ── Grades ────────────────────────────────────────────────────────────

  createGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const g = await this.service.createGrade(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(g));
    } catch (err) { next(err); }
  };

  listGrades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const list = await this.service.listGrades(tenantId, organizationId);
      res.json(successList(list, { page: 1, limit: list.length, total: list.length, totalPages: 1, hasNext: false, hasPrev: false }));
    } catch (err) { next(err); }
  };

  getGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const g = await this.service.getGradeByPublicId(req.params.publicId, req.user.tenantId);
      res.json(success(g));
    } catch (err) { next(err); }
  };

  updateGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const g = await this.service.updateGrade(req.params.publicId, req.body, tenantId, userId);
      res.json(success(g));
    } catch (err) { next(err); }
  };

  deleteGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteGrade(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ message: 'Grade deleted.' }));
    } catch (err) { next(err); }
  };

  // ── Locations ─────────────────────────────────────────────────────────

  createLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const l = await this.service.createLocation(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(l));
    } catch (err) { next(err); }
  };

  listLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const list = await this.service.listLocations(tenantId, organizationId);
      res.json(successList(list, { page: 1, limit: list.length, total: list.length, totalPages: 1, hasNext: false, hasPrev: false }));
    } catch (err) { next(err); }
  };

  getLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const l = await this.service.getLocationByPublicId(req.params.publicId, req.user.tenantId);
      res.json(success(l));
    } catch (err) { next(err); }
  };

  updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const l = await this.service.updateLocation(req.params.publicId, req.body, tenantId, userId);
      res.json(success(l));
    } catch (err) { next(err); }
  };

  deleteLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteLocation(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ message: 'Location deleted.' }));
    } catch (err) { next(err); }
  };
}
