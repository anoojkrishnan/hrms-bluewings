import { type Request, type Response, type NextFunction } from 'express';
import { RuleEngineService } from './rule-engine.service';
import { success, successList } from '@/shared/utils/response';
import { buildPaginationOptions } from '@/shared/utils/pagination';

export class RuleEngineController {
  private readonly service: RuleEngineService;

  constructor() {
    this.service = new RuleEngineService();
  }

  // ── RuleSets ──────────────────────────────────────────────────────────────

  listRuleSets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { page, limit } = buildPaginationOptions(req.query);
      const result = await this.service.listRuleSets(tenantId, page, limit);
      res.json(successList(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  };

  createRuleSet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const ruleSet = await this.service.createRuleSet(req.body, tenantId, userId);
      res.status(201).json(success(ruleSet));
    } catch (err) {
      next(err);
    }
  };

  updateRuleSet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const ruleSet = await this.service.updateRuleSet(req.params.publicId, req.body, tenantId, userId);
      res.json(success(ruleSet));
    } catch (err) {
      next(err);
    }
  };

  // ── Rules ─────────────────────────────────────────────────────────────────

  listRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const rules = await this.service.listRules(req.params.publicId, tenantId);
      res.json(successList(rules, {
        page: 1,
        limit: rules.length,
        total: rules.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }));
    } catch (err) {
      next(err);
    }
  };

  addRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const rule = await this.service.addRule(req.params.publicId, req.body, tenantId, userId);
      res.status(201).json(success(rule));
    } catch (err) {
      next(err);
    }
  };

  updateRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const rule = await this.service.updateRule(
        req.params.publicId,
        req.params.rulePublicId,
        req.body,
        tenantId,
        userId,
      );
      res.json(success(rule));
    } catch (err) {
      next(err);
    }
  };

  deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      await this.service.deleteRule(req.params.publicId, req.params.rulePublicId, tenantId, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // ── Simulate ──────────────────────────────────────────────────────────────

  simulate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { context, effectiveDate } = req.body as {
        context: Record<string, unknown>;
        effectiveDate?: string;
      };

      // Fetch the rule set to resolve its ruleType
      const ruleSet = await this.service.getRuleSet(req.params.publicId, tenantId);

      const result = await this.service.simulate(
        ruleSet.ruleType,
        context,
        tenantId,
        effectiveDate ? new Date(effectiveDate) : undefined,
      );

      res.json(success(result));
    } catch (err) {
      next(err);
    }
  };
}
