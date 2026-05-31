import { Router } from 'express';
import { RuleEngineController } from './rule-engine.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { RuleEnginePermissions as P } from './rule-engine.permissions';
import {
  createRuleSetSchema,
  updateRuleSetSchema,
  createRuleSchema,
  updateRuleSchema,
  simulateSchema,
} from './rule-engine.validator';

const router = Router();
const ctrl = new RuleEngineController();

router.use(requireAuth, requireTenantContext);

// ── Rule Sets ─────────────────────────────────────────────────────────────────

router.get('/rule-sets', requirePermission(P.VIEW), ctrl.listRuleSets);
router.post('/rule-sets', requirePermission(P.CONFIGURE), validate(createRuleSetSchema), ctrl.createRuleSet);
router.put('/rule-sets/:publicId', requirePermission(P.CONFIGURE), validate(updateRuleSetSchema), ctrl.updateRuleSet);

// ── Rules within a RuleSet ────────────────────────────────────────────────────

router.get('/rule-sets/:publicId/rules', requirePermission(P.VIEW), ctrl.listRules);
router.post('/rule-sets/:publicId/rules', requirePermission(P.CONFIGURE), validate(createRuleSchema), ctrl.addRule);
router.put('/rule-sets/:publicId/rules/:rulePublicId', requirePermission(P.CONFIGURE), validate(updateRuleSchema), ctrl.updateRule);
router.delete('/rule-sets/:publicId/rules/:rulePublicId', requirePermission(P.CONFIGURE), ctrl.deleteRule);

// ── Simulate ──────────────────────────────────────────────────────────────────

router.post('/rule-sets/:publicId/simulate', requirePermission(P.VIEW), validate(simulateSchema), ctrl.simulate);

export { router as ruleEngineRouter };
