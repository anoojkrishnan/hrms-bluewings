# Schema

## Principles

Shared DB, shared collections, `tenantId` on every tenant-owned doc. `_id` internal only. Soft delete fields on business records. Compound indexes start with `tenantId`. Reference large/changing entities; embed small stable subdocs. Snapshot payroll/salary/approvals/policies. Transactions for critical multi-doc writes. Unique indexes scoped by tenant (`{ tenantId, employeeCode }`). Partial indexes for active records. No unbounded arrays — use child collections for logs/approvals/timeline. Encrypt PII + payroll-sensitive fields.

## Base Document

```typescript
interface BaseDocument {
  _id: ObjectId;
  publicId: string;
  tenantId: string;
  organizationId?: string;
  createdAt: Date; updatedAt: Date;
  createdBy: string; updatedBy: string;
  deletedAt: Date | null; deletedBy?: string; deletionReason?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}
```

## Collection Inventory (§47)

### Tenant & Access (§47.1)
`tenants tenant_settings tenant_modules subscription_plans tenant_subscriptions users user_tenant_memberships user_sessions roles permissions role_permissions user_roles delegation_rules audit_logs`

### Organization (§47.2)
`companies company_addresses departments designations grades bands locations work_locations cost_centers business_units org_units reporting_relationships`

### Employee (§47.3)
`employees employee_personal_details employee_contact_details employee_employment_details employee_bank_details employee_statutory_details employee_family_details employee_nominees employee_passport_visa_details employee_previous_employment employee_education employee_assets employee_documents employee_timeline_events employee_status_history employee_salary_history employee_contracts employee_separations employee_rehires`

### Leave (§47.4)
`leave_types leave_schemes leave_rules leave_balances leave_applications leave_approvals leave_transactions leave_encashments holiday_lists holidays weekend_policies`

### Attendance (§47.5)
`attendance_schemes attendance_policies attendance_rules shifts shift_assignments rosters attendance_logs raw_swipes attendance_summaries attendance_exceptions overtime_records comp_off_records device_masters biometric_mappings`

### Payroll (§47.6)
`payroll_cycles pay_groups salary_structures salary_components employee_salary_components payroll_inputs payroll_runs payroll_run_items payslips tax_declarations proof_of_investments statutory_settings reimbursement_claims loan_requests loan_schedules full_final_settlements`

### Operational (§47.7)
`projects clients timesheets timesheetApprovals expenseCategories travelRequests expenseClaims expenseApprovals complianceCalendars complianceTasks employeeCases compensationCycles compensationRecommendations headcountPlans scimConfigurations scimProvisioningLogs makerCheckerRequests tenantExports dataResidencySettings pwaSettings`

### Workflow & Rules (§47.8)
`workflows workflow_versions workflow_steps workflow_conditions workflow_instances workflow_actions rule_sets rules rule_versions formula_definitions`

### Documents & Communication (§47.9)
`document_templates generated_documents policy_documents policy_acknowledgements announcements faqs notifications notification_templates notification_events email_logs push_logs`

### Integration & Import (§47.10)
`api_clients api_keys webhook_subscriptions webhook_delivery_logs integration_configs integration_logs import_batches import_errors export_jobs`

### Added Platform Controls
`impersonationSessions sensitiveFieldAccessLogs employeeAcknowledgements payrollSimulations statutoryRuleVersions softDeleteRestoreLogs backgroundJobs userNotificationPreferences localizationResources directoryPrivacyConfigs`

### AI (§53.11)
`ai_assistant_settings ai_conversations ai_messages ai_tool_call_logs ai_action_drafts ai_action_audit_logs ai_knowledge_sources ai_document_indexes ai_usage_logs ai_rate_limits ai_feedback ai_blocked_requests ai_providers ai_provider_models tenant_ai_settings tenant_ai_model_entitlements ai_provider_usage_logs`

### Billing (§39.7)
`plans tenantSubscriptions subscriptionEvents billingInvoices billingPayments razorpayWebhookEvents usageCounters planFeatureMatrix`

---

## Key Document Shapes

### tenants
```typescript
{ ...Base, name, slug /*unique*/, primaryContact, billingContact, country,
  defaultTimezone, defaultCurrency, defaultLanguage, branding,
  status: 'trial'|'active'|'suspended'|'archived', trialEndsAt?,
  employeeLimit, storageLimit }
// idx: { slug:1 } unique, { status:1 }
```

### users
```typescript
{ ...Base, email /*unique*/, passwordHash, name:{first,last}, phone?,
  status:'active'|'suspended'|'pending_verification', emailVerifiedAt?,
  lastLoginAt?, mfaEnabled, mfaSecret? /*enc*/, failedLoginAttempts, lockedUntil? }
// idx: { email:1 } unique
```

### roles / permissions / user_roles
```typescript
roles:        { ...Base, name, code /*unique per tenant*/, isSystemRole, isCustom, dataScope }
permissions:  { code /*unique*/, module, action, description, isSystemPermission }
user_roles:   { tenantId, organizationId, userId, roleId, assignedAt, assignedBy, expiresAt? }
```

### employees
```typescript
{ ...Base, employeeCode /*unique per tenant*/, companyId, status: EmployeeStatus,
  joiningDate, lastWorkingDate?, departmentId?, designationId?, gradeId?, locationId?,
  costCenterId?, businessUnitId?,
  employmentType:'full_time'|'part_time'|'contract'|'intern'|'consultant',
  probationEndDate?, confirmationDate?, noticePeriodDays, essEnabled, essInvitedAt? }
// EmployeeStatus: candidate|pre_onboarding|onboarding|active|probation|confirmed|
//   contract|intern|suspended|notice_period|separated|alumni|rehired
// idx: { tenantId:1, employeeCode:1 } unique, { tenantId:1, organizationId:1, status:1 }
```

### employee_bank_details (sensitive)
```typescript
{ tenantId, employeeId, accountNumber /*enc*/, ifscCode, bankName, branchName?,
  accountType:'savings'|'current', isPrimary, verifiedAt?, verifiedBy? }
```

### employee_documents
```typescript
{ ...Base, employeeId, documentType, documentName, s3Key /*never expose*/, mimeType,
  sizeBytes, checksum, expiryDate?, verificationStatus:'pending'|'verified'|'rejected',
  verifiedBy?, verifiedAt?, version, uploadedBy }
```

### leave_applications / leave_balances
```typescript
leave_applications: { ...Base, employeeId, companyId, leaveTypeId, startDate, endDate,
  totalDays, halfDayType?, reason?,
  status:'draft'|'pending'|'approved'|'rejected'|'cancelled'|'revoked',
  appliedBy, approvals:[ApprovalStep], attachmentPublicIds?, comments? }
leave_balances: { tenantId, organizationId, employeeId, leaveTypeId, leaveYear,
  openingBalance, accrued, granted, taken, encashed, lapsed, closingBalance, lastUpdatedAt }
// idx: { tenantId:1, employeeId:1, leaveTypeId:1, leaveYear:1 } unique
```

### attendance_logs / raw_swipes
```typescript
attendance_logs: { ...Base, employeeId, companyId, date, shiftId?, firstInTime?, lastOutTime?,
  totalHours?, status, isLate, isEarlyExit, overtimeHours?,
  source:'biometric'|'web_portal'|'manual'|'swipe_api'|'bulk_import',
  isException, exceptionType?, isLocked }
// idx: { tenantId:1, employeeId:1, date:1 } unique
raw_swipes: { tenantId, organizationId, employeeId?, biometricId?, deviceId, swipeTime,
  swipeType:'in'|'out'|'unknown', source, ipAddress?, userAgent?, latitude?, longitude?,
  locationAccuracy?, geofenceResult?, selfieS3Key?, ruleEvaluationResult?, isProcessed, processedAt? }
```

### payroll_runs / payslips
```typescript
payroll_runs: { ...Base, companyId, payGroupId?, month, year,
  status:'draft'|'preview'|'locked'|'approved'|'finalized'|'rolled_back',
  isSimulation, totalEmployees, totalGross?, totalDeductions?, totalNetPay?,
  processedAt?, finalizedAt?, finalizedBy?, payslipsPublishedAt?, snapshotData? }
payslips: { ...Base, employeeId, payrollRunId, month, year, earnings:[], deductions:[],
  grossPay, totalDeductions, netPay, lopDays, workingDays, paidDays, tds, pfEmployee,
  pfEmployer, esi?, pt?, isPublished, publishedAt?, s3Key?, snapshotAt }
```

### workflows / workflow_instances / rule_sets
```typescript
workflows: { ...Base, name, module, triggerEvent, isActive, steps:[WorkflowStep], version }
workflow_instances: { ...Base, workflowId, workflowVersion, module, entityType, entityPublicId,
  requestedBy, status:'pending'|'approved'|'rejected'|'cancelled'|'escalated',
  currentStepIndex, steps:[WorkflowInstanceStep], completedAt? }
rule_sets: { ...Base, name, module, ruleType, isActive, effectiveFrom, effectiveTo?, version, rules:[Rule] }
```

### makerCheckerRequests
```typescript
{ ...Base, actionType, module, entityType, entityPublicId, oldValue, newValue,
  status:'pending_review'|'approved'|'rejected'|'correction_requested',
  makerId, checkerId?, checkerLevels?, reviewedAt?, appliedAt?, comments? }
```

### Billing
```typescript
plans: { publicId, name, code:'free'|'starter'|'growth'|'business', employeeLimit,
  storageLimit, featureMatrix, monthlyPrice?, yearlyPrice?, currency, isActive }
tenantSubscriptions: { tenantId /*unique*/, planCode,
  status:'active'|'cancelled'|'expired'|'grace_period'|'suspended',
  billingCycle:'monthly'|'yearly', currentPeriodStart, currentPeriodEnd, gracePeriodEndsAt?,
  razorpayCustomerId?, razorpaySubscriptionId?, cancelledAt?, updatedAt }
```

### AI
```typescript
ai_providers: { providerCode:'openrouter'|'openai', displayName, isGloballyEnabled,
  supportedFeatures, defaultModelCode, sortOrder }
ai_provider_models: { providerCode, modelCode, displayName, description?, isGloballyEnabled,
  isFreeModel, isDefaultForProvider, maxContextLimit?, supportedUseCases, planAvailability, sortOrder }
tenant_ai_settings: { tenantId, organizationId, isAiEnabled, activeProviderCode, activeModelCode,
  enabledModules, monthlyUsageLimit?, conversationRetentionDays, allowConversationHistory,
  updatedBy, updatedAt }  // idx: { tenantId:1, organizationId:1 } unique
tenant_ai_model_entitlements: { tenantId, organizationId, providerCode, modelCode, isEnabled,
  enabledBy, enabledAt, disabledAt?, reason? }
ai_usage_logs: { tenantId, organizationId, userId, conversationId?, providerCode, modelCode,
  promptTokens?, completionTokens?, totalTokens?, estimatedCost?,
  status:'success'|'error'|'blocked', blockedReason?, requestedAt, responseMs? }
ai_document_indexes: { tenantId, organizationId, documentPublicId, version, accessScope, vectorRef, ... }
```

### audit_logs (append-only)
```typescript
{ tenantId, organizationId?, actorId, actorType:'user'|'system'|'ai'|'api_client',
  action, module, entityType, entityPublicId, oldValue?, newValue?,
  ipAddress, userAgent, requestId, timestamp }
// idx: { tenantId:1, timestamp:-1 }, { tenantId:1, entityPublicId:1 }
```

## Encrypt at Rest
`employee_personal_details.{panNumber,aadhaarNumber,passportNumber}`, `employee_bank_details.accountNumber`, `users.mfaSecret`, AI provider API keys (backend config, not tenant collections).

## Index Strategy
```javascript
{ tenantId:1, publicId:1 }                      // unique lookup
{ tenantId:1, organizationId:1, status:1 }      // filtered list
{ tenantId:1, employeeId:1, date:1 }            // employee+date
{ tenantId:1, createdAt:-1 }                    // recent
{ tenantId:1, status:1 } partial:{ deletedAt:null }  // active only
```
