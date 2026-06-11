import type { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { success } from '@/shared/utils/response';

const service = new ReportsService();

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => JSON.stringify(v ?? '');
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
}

export class ReportsController {

  listTemplates = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(success(service.listTemplates()));
    } catch (err) { next(err); }
  };

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const { job, rows, headers } = await service.generate(req.body, tenantId, organizationId, userId);

      if (req.query.format === 'csv') {
        const csv = rowsToCsv(headers, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${req.body.templateKey}-${Date.now()}.csv"`);
        res.send(csv);
      } else {
        res.json(success({ job, rows, headers }));
      }
    } catch (err) { next(err); }
  };

  listJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobs = await service.listJobs(req.user.tenantId, req.user.userId);
      res.json(success(jobs));
    } catch (err) { next(err); }
  };

  // ── Analytics ─────────────────────────────────────────────────────────────

  headcount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await service.headcountAnalytics(req.user.tenantId, req.user.organizationId);
      res.json(success(data));
    } catch (err) { next(err); }
  };

  attrition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { from, to } = req.query as Record<string, string>;
      const data = await service.attritionAnalytics(
        req.user.tenantId, req.user.organizationId,
        from ?? new Date(new Date().getFullYear(), 0, 1).toISOString(),
        to   ?? new Date().toISOString(),
      );
      res.json(success(data));
    } catch (err) { next(err); }
  };

  payrollCost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId, month, year } = req.query as Record<string, string>;
      const now = new Date();
      const data = await service.payrollCostAnalytics(
        req.user.tenantId,
        companyId ?? '',
        Number(month ?? now.getMonth() + 1),
        Number(year  ?? now.getFullYear()),
      );
      res.json(success(data));
    } catch (err) { next(err); }
  };
}
