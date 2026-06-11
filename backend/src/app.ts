import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { globalLimiter } from './middleware/rateLimiter.middleware';

import { tenantRouter } from './modules/tenant/tenant.routes';
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/user/user.routes';
import { rbacRouter } from './modules/rbac/rbac.routes';
import { organizationRouter } from './modules/organization/organization.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { employeeRouter } from './modules/employee/employee.routes';
import { leaveRouter } from './modules/leave/leave.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { ruleEngineRouter } from './modules/rule-engine/rule-engine.routes';
import { workflowRouter } from './modules/workflow/workflow.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { notificationService } from './modules/notifications/notification.service';
import { dynamicFormsRouter } from './modules/dynamic-forms/dynamic-forms.routes';
import { payrollRouter } from './modules/payroll/payroll.routes';
import { expenseRouter } from './modules/expense/expense.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { integrationsRouter } from './modules/integrations/integrations.routes';
import { LeaveService } from './modules/leave/leave.service';

export function createApp(): express.Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Organization-ID'],
      exposedHeaders: ['X-Request-ID'],
    }),
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request ID + structured logging
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  );

  // Global rate limiter
  app.use(globalLimiter);

  // Health check — no auth required
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/', tenantRouter);      // includes /public/signup, /tenant/settings, /platform/tenants
  api.use('/', userRouter);
  api.use('/', rbacRouter);
  api.use('/', organizationRouter);
  api.use('/', auditRouter);
  api.use('/', employeeRouter);
  api.use('/', leaveRouter);
  api.use('/', attendanceRouter);
  api.use('/', ruleEngineRouter);
  api.use('/', workflowRouter);
  api.use('/', notificationRouter);
  api.use('/', dynamicFormsRouter);
  api.use('/', payrollRouter);
  api.use('/', expenseRouter);
  api.use('/', reportsRouter);
  api.use('/', integrationsRouter);

  // Register cross-module event listeners
  notificationService.registerEventListeners();
  new LeaveService().registerWorkflowListeners();

  app.use('/api/v1', api);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Central error handler — must be last
  app.use(errorHandler);

  return app;
}
