import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 10);

export const generatePublicId = (prefix?: string, length = 10): string => {
  const id = customAlphabet(alphabet, length)();
  return prefix ? `${prefix}_${id}` : id;
};

export const generateTenantPublicId = () => nanoid();
export const generateUserPublicId = () => nanoid();
export const generateEmployeePublicId = () => generatePublicId('emp');
export const generateRolePublicId = () => generatePublicId('role');
export const generatePermissionPublicId = () => generatePublicId('perm');
export const generateAuditPublicId = () => generatePublicId('aud');
export const generateLeavePublicId = () => generatePublicId('leave');
export const generateDocumentPublicId = () => generatePublicId('doc');
export const generateReportPublicId = () => generatePublicId('rpt');
export const generateImportPublicId = () => generatePublicId('imp');
export const generateWorkflowPublicId = () => generatePublicId('wf');
export const generateApiClientPublicId = () => generatePublicId('apiclient');
export const generateSessionPublicId = () => nanoid();
export const generateJobPublicId = () => generatePublicId('job');
export const generateCompanyPublicId = () => nanoid();
export const generateDepartmentPublicId = () => nanoid();
export const generateDesignationPublicId = () => nanoid();
export const generateGradePublicId = () => nanoid();
export const generateLocationPublicId = () => nanoid();
export const generateAttendancePublicId = () => generatePublicId('att');
export const generateHolidayPublicId = () => generatePublicId('hol');
export const generateHolidayListPublicId = () => generatePublicId('hlist');
export const generateShiftPublicId = () => generatePublicId('shift');
export const generateExceptionPublicId    = () => generatePublicId('exc');
export const generateRuleSetPublicId      = () => generatePublicId('rs');
export const generateRulePublicId         = () => generatePublicId('rule');
export const generateFormPublicId         = () => generatePublicId('form');
export const generateSubmissionPublicId   = () => generatePublicId('sub');
export const generateNotificationPublicId = () => generatePublicId('ntf');
