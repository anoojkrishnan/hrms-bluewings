import type { SetupGuideContent } from '@/components/ui/SetupGuide';

export const SETUP: Record<string, SetupGuideContent> = {

  // ── Organisation ─────────────────────────────────────────────────────────

  'companies': {
    icon: 'building',
    title: 'Set Up Your Company',
    tagline: 'Companies are the legal entities that employ your people. Everything else — payroll, leave, attendance — flows from here.',
    benefits: [
      { icon: 'table', text: 'Multi-entity support' },
      { icon: 'scale', text: 'Isolated payroll per entity' },
      { icon: 'clipboard', text: 'Statutory config per company' },
    ],
    steps: [
      { icon: 'identification', title: 'Name your entity', desc: 'Enter the legal company name, country, and state.' },
      { icon: 'users', title: 'Add structure', desc: 'Create departments, designations, and locations under this company.' },
      { icon: 'users', title: 'Onboard employees', desc: 'Assign employees to the company when adding them.' },
      { icon: 'currency', title: 'Run payroll', desc: 'Configure cycles, statutory settings, and salary structures.' },
    ],
    ctaLabel: 'Add Company',
  },

  'departments': {
    icon: 'table',
    title: 'Organise with Departments',
    tagline: 'Group your people by function. Departments power approval routing, access scoping, and workforce analytics.',
    benefits: [
      { icon: 'chart-bar', text: 'Department-level reports' },
      { icon: 'check', text: 'Scoped approvals' },
      { icon: 'funnel', text: 'Filtered employee views' },
    ],
    prerequisites: [
      { label: 'Company', route: '/settings/companies' },
    ],
    steps: [
      { icon: 'building', title: 'Create your company', desc: 'You need at least one company before adding departments.' },
      { icon: 'identification', title: 'Add departments', desc: 'Create top-level departments like Engineering, HR, Finance.' },
      { icon: 'stack', title: 'Add sub-departments', desc: 'Use the Parent Department dropdown to build a hierarchy.' },
      { icon: 'users', title: 'Assign employees', desc: 'Department shows on every employee profile and payslip.' },
    ],
    ctaLabel: 'Add Department',
  },

  'designations': {
    icon: 'identification',
    title: 'Define Job Titles',
    tagline: 'Designations are your official job titles. They appear on payslips, offer letters, and the employee directory.',
    benefits: [
      { icon: 'document', text: 'Consistent payslips' },
      { icon: 'identification', text: 'Standardised titles' },
      { icon: 'funnel', text: 'Filterable directory' },
    ],
    steps: [
      { icon: 'identification', title: 'Enter the title', desc: 'Add the official job title, e.g. "Software Engineer".' },
      { icon: 'clipboard', title: 'Set a code', desc: 'Short unique code used in reports, e.g. "SWE".' },
      { icon: 'users', title: 'Assign to employees', desc: 'Select this designation when creating or editing an employee record.' },
    ],
    ctaLabel: 'Add Designation',
  },

  'locations': {
    icon: 'map-pin',
    title: 'Add Office Locations',
    tagline: 'Locations define where your people work. Enable geofenced attendance and location-scoped access control.',
    benefits: [
      { icon: 'map-pin', text: 'Geofenced attendance' },
      { icon: 'funnel', text: 'Location-scoped access' },
      { icon: 'chart-bar', text: 'Location-wise reports' },
    ],
    steps: [
      { icon: 'map-pin', title: 'Name the location', desc: 'Add a name like "Bangalore HQ" and a short code.' },
      { icon: 'building', title: 'Enter address', desc: 'City, state, country and pincode for mapping.' },
      { icon: 'users', title: 'Assign to employees', desc: 'Location appears on employee profiles and enables geo-scoping.' },
    ],
    ctaLabel: 'Add Location',
  },

  // ── Employees ──────────────────────────────────────────────────────────────

  'employees': {
    icon: 'users',
    title: 'Add Your First Employee',
    tagline: 'Employees are the core of the HRMS. Every leave, attendance, payroll, and expense record is linked to an employee.',
    benefits: [
      { icon: 'currency', text: 'Auto payroll calculations' },
      { icon: 'calendar', text: 'Leave and attendance tracking' },
      { icon: 'identification', text: 'ESS self-service portal' },
    ],
    prerequisites: [
      { label: 'Company', route: '/settings/companies' },
    ],
    steps: [
      { icon: 'clipboard', title: '3-step wizard', desc: 'Enter basic info, employment details, and review.' },
      { icon: 'identification', title: 'Add personal details', desc: 'Fill name, date of birth, and contact info from the Personal tab.' },
      { icon: 'link', title: 'Invite to ESS', desc: 'Send a portal invite so they can view payslips and apply for leave.' },
      { icon: 'currency', title: 'Assign salary', desc: 'Open the employee and assign a salary structure.' },
    ],
    ctaLabel: 'Add Employee',
    ctaRoute: '/employees/new',
  },

  // ── Leave ──────────────────────────────────────────────────────────────────

  'leave-types': {
    icon: 'calendar',
    title: 'Configure Leave Types',
    tagline: 'Leave types define what kinds of time off your company offers — Annual, Sick, Casual, Maternity, and more.',
    benefits: [
      { icon: 'calendar', text: 'Annual entitlement tracking' },
      { icon: 'refresh', text: 'Carry-forward rules' },
      { icon: 'banknotes', text: 'Encashment at exit' },
    ],
    steps: [
      { icon: 'identification', title: 'Name the type', desc: 'E.g. "Annual Leave" with code "AL".' },
      { icon: 'calendar', title: 'Set entitlement', desc: 'How many days per year this type grants.' },
      { icon: 'wrench', title: 'Configure rules', desc: 'Paid/unpaid, carry-forward, encashable, document required.' },
      { icon: 'refresh', title: 'Initialise balances', desc: 'Go to Leave Balance and initialise to create records for all employees.' },
    ],
    ctaLabel: 'Add Leave Type',
  },

  'leave-applications': {
    icon: 'clipboard',
    title: 'Manage Leave Requests',
    tagline: 'Centralised leave management with real-time balance tracking, approval workflows, and team calendar visibility.',
    benefits: [
      { icon: 'check', text: 'Instant approvals' },
      { icon: 'chart-bar', text: 'Balance auto-deducted' },
      { icon: 'calendar', text: 'Team calendar view' },
    ],
    prerequisites: [
      { label: 'Leave Types', route: '/leave/types' },
      { label: 'Employees', route: '/employees' },
      { label: 'Balances initialised', route: '/leave/balance' },
    ],
    steps: [
      { icon: 'calendar', title: 'Create leave types', desc: 'Define what kinds of leave your company offers.' },
      { icon: 'refresh', title: 'Initialise balances', desc: 'Set opening balances for the current year.' },
      { icon: 'clipboard', title: 'Apply on behalf', desc: 'Click "Apply for Leave" and select any employee.' },
      { icon: 'check', title: 'Approve or reject', desc: 'One-click approve or reject with auto balance update.' },
    ],
    ctaLabel: 'Apply for Leave',
  },

  'leave-balance': {
    icon: 'scale',
    title: 'Leave Balance Management',
    tagline: 'Track every employee\'s leave entitlement, days taken, and remaining balance for the financial year.',
    benefits: [
      { icon: 'users', text: 'Per-employee per-type' },
      { icon: 'check', text: 'Auto-deducted on approval' },
      { icon: 'banknotes', text: 'Powers FnF encashment' },
    ],
    prerequisites: [
      { label: 'Leave Types', route: '/leave/types' },
      { label: 'Employees', route: '/employees' },
    ],
    steps: [
      { icon: 'calendar', title: 'Create leave types', desc: 'You need leave types before balances can exist.' },
      { icon: 'refresh', title: 'Initialise balances', desc: 'Click "Initialise Balances" to create zero-balance records for all active employees.' },
      { icon: 'clipboard', title: 'Set opening balances', desc: 'Use Manage Balances to set the starting entitlement per employee.' },
      { icon: 'chart-bar', title: 'Track usage', desc: 'Balances update automatically as applications are approved.' },
    ],
    ctaLabel: 'Initialise Balances',
  },

  // ── Attendance ──────────────────────────────────────────────────────────────

  'attendance-mark': {
    icon: 'clock',
    title: 'Web-Based Attendance',
    tagline: 'Employees punch in and out directly from their browser. Capture time, location, and shift compliance automatically.',
    benefits: [
      { icon: 'map-pin', text: 'Geolocation validation' },
      { icon: 'clock', text: 'Real-time status' },
      { icon: 'refresh', text: 'Auto-links to payroll LOP' },
    ],
    prerequisites: [
      { label: 'Employee with ESS access', route: '/employees' },
    ],
    steps: [
      { icon: 'link', title: 'Invite to ESS', desc: 'Employee needs portal access — invite from their profile page.' },
      { icon: 'sun', title: 'Assign a shift', desc: 'Assign a shift to enable late and early detection.' },
      { icon: 'check', title: 'Punch in and out', desc: 'Employee clicks Punch In at start and Punch Out at end of day.' },
      { icon: 'chart-bar', title: 'Review logs', desc: 'View all attendance entries under Attendance — Logs.' },
    ],
    ctaLabel: 'View Attendance Logs',
    ctaRoute: '/attendance/logs',
  },

  'attendance-logs': {
    icon: 'document',
    title: 'Attendance Log Overview',
    tagline: 'The daily record of present, absent, late, and on-leave entries. The source of truth for LOP and payroll.',
    benefits: [
      { icon: 'currency', text: 'Drives payroll LOP' },
      { icon: 'chart-bar', text: 'Downloadable reports' },
      { icon: 'wrench', text: 'Manual override for corrections' },
    ],
    prerequisites: [
      { label: 'Employees added', route: '/employees' },
    ],
    steps: [
      { icon: 'clock', title: 'Employees mark attendance', desc: 'Logs appear as employees punch in via the portal.' },
      { icon: 'calendar', title: 'Filter by date range', desc: 'Use the From and To filters to view a specific period.' },
      { icon: 'wrench', title: 'Manual override', desc: 'Click "Manual Override" to add or correct any entry.' },
      { icon: 'check', title: 'Lock the period', desc: 'Lock attendance before payroll to prevent changes.' },
    ],
    ctaLabel: 'Mark Attendance',
    ctaRoute: '/attendance',
  },

  'attendance-exceptions': {
    icon: 'exclamation',
    title: 'Attendance Exceptions',
    tagline: 'Automatically flagged when rules are broken — late arrivals, missed punches, out-of-location entries.',
    benefits: [
      { icon: 'refresh', text: 'Auto-generated by rules' },
      { icon: 'check', text: 'One-click regularisation' },
      { icon: 'document', text: 'Full audit trail' },
    ],
    prerequisites: [
      { label: 'Attendance logs present', route: '/attendance/logs' },
    ],
    steps: [
      { icon: 'clock', title: 'Auto-detection', desc: 'Exceptions raise automatically when attendance rules are violated.' },
      { icon: 'document', title: 'Review each flag', desc: 'See why it was raised — late, missed punch, wrong location.' },
      { icon: 'check', title: 'Approve to regularise', desc: 'Approval accepts the entry as valid.' },
      { icon: 'exclamation', title: 'Reject to keep flagged', desc: 'Rejection may impact LOP in the next payroll run.' },
    ],
    ctaLabel: 'View Logs',
    ctaRoute: '/attendance/logs',
  },

  'shifts': {
    icon: 'sun',
    title: 'Define Work Shifts',
    tagline: 'Shifts set expected working hours so the system knows when someone is late, early, or absent.',
    benefits: [
      { icon: 'clock', text: 'Accurate late marking' },
      { icon: 'sun', text: 'Night shift support' },
      { icon: 'users', text: 'Assign to multiple employees' },
    ],
    steps: [
      { icon: 'clock', title: 'Create the shift', desc: 'Set name, start/end time, and grace period in minutes.' },
      { icon: 'sun', title: 'Mark night shifts', desc: 'Toggle "Night Shift" for shifts that cross midnight.' },
      { icon: 'users', title: 'Assign employees', desc: 'Click Assign on any shift to select employees and an effective date.' },
      { icon: 'chart-bar', title: 'Monitor compliance', desc: 'Late and early entries appear automatically in Attendance Exceptions.' },
    ],
    ctaLabel: 'Add Shift',
  },

  'overtime': {
    icon: 'clock',
    title: 'Overtime and Comp-Off',
    tagline: 'Track and reward extra hours worked. Convert overtime to paid compensation or comp-off days off.',
    benefits: [
      { icon: 'banknotes', text: 'Paid OT or comp-off' },
      { icon: 'calendar', text: 'Comp-off expires in 90 days' },
      { icon: 'document', text: 'Audit trail per employee' },
    ],
    prerequisites: [
      { label: 'Employees added', route: '/employees' },
    ],
    steps: [
      { icon: 'clipboard', title: 'Submit OT request', desc: 'Employee submits the date, hours worked, and reason.' },
      { icon: 'check', title: 'HR approves', desc: 'Choose Approve for paid OT or convert to Comp-Off credit.' },
      { icon: 'calendar', title: 'Comp-off credited', desc: 'Credited days appear in the employee leave balance.' },
      { icon: 'calendar', title: 'Employee uses comp-off', desc: 'The employee applies for comp-off leave from the Leave module.' },
    ],
    ctaLabel: 'Submit Overtime',
  },

  // ── Payroll ─────────────────────────────────────────────────────────────────

  'salary-components': {
    icon: 'puzzle',
    title: 'Build Your Salary Components',
    tagline: 'Components are the building blocks of pay — Basic, HRA, PF, TDS. Define once, reuse across all salary structures.',
    benefits: [
      { icon: 'wrench', text: 'Formula engine built-in' },
      { icon: 'refresh', text: 'Reuse across structures' },
      { icon: 'check', text: 'Statutory auto-calculation' },
    ],
    steps: [
      { icon: 'banknotes', title: 'Create earnings', desc: 'Basic Salary, HRA, Special Allowance — type Earning.' },
      { icon: 'scale', title: 'Create deductions', desc: 'PF Employee, TDS, Professional Tax — type Deduction.' },
      { icon: 'wrench', title: 'Set formula type', desc: 'Fixed Amount, % of Basic, % of Gross, or Statutory auto.' },
      { icon: 'stack', title: 'Build a structure', desc: 'Group components into a Salary Structure to assign to employees.' },
    ],
    ctaLabel: 'Add Component',
  },

  'salary-structures': {
    icon: 'stack',
    title: 'Create Salary Structures',
    tagline: 'A structure bundles components into a reusable template. Assign one structure to many employees.',
    benefits: [
      { icon: 'refresh', text: 'One structure, many employees' },
      { icon: 'wrench', text: 'Override per employee' },
      { icon: 'document', text: 'Version history' },
    ],
    prerequisites: [
      { label: 'Salary Components', route: '/payroll/components' },
    ],
    steps: [
      { icon: 'puzzle', title: 'Create components first', desc: 'Basic, HRA, PF — go to Payroll — Salary.' },
      { icon: 'stack', title: 'Build the structure', desc: 'Name it and add your components.' },
      { icon: 'users', title: 'Assign to employees', desc: 'Employee — Salary — Assign Salary Structure.' },
      { icon: 'currency', title: 'Run payroll', desc: 'The structure drives all salary calculations.' },
    ],
    ctaLabel: 'Add Structure',
  },

  'payroll-cycles': {
    icon: 'refresh',
    title: 'Set Up Pay Cycles',
    tagline: 'Pay cycles define when salaries are paid and the deadline for entering adjustments each month.',
    benefits: [
      { icon: 'calendar', text: 'Configurable pay day' },
      { icon: 'check', text: 'Input cutoff lock' },
      { icon: 'building', text: 'Per-company config' },
    ],
    prerequisites: [
      { label: 'Company', route: '/settings/companies' },
    ],
    steps: [
      { icon: 'building', title: 'Select company', desc: 'Each company can have its own payroll schedule.' },
      { icon: 'calendar', title: 'Set pay day', desc: 'E.g. 28 means salaries credit on the 28th each month.' },
      { icon: 'check', title: 'Set input cutoff', desc: 'E.g. 25 — last day HR can enter LOP or bonuses.' },
      { icon: 'play', title: 'Create a payroll run', desc: 'Select this cycle when starting a new payroll run.' },
    ],
    ctaLabel: 'Add Cycle',
  },

  'payroll-runs': {
    icon: 'play',
    title: 'Run Your First Payroll',
    tagline: 'A payroll run calculates salaries, applies all deductions, and generates payslips — in one automated pipeline.',
    benefits: [
      { icon: 'wrench', text: 'Auto PF, ESI, PT, TDS' },
      { icon: 'document', text: 'Instant payslip generation' },
      { icon: 'refresh', text: 'Rollback before finalise' },
    ],
    prerequisites: [
      { label: 'Salary Components', route: '/payroll/components' },
      { label: 'Salary Structure', route: '/payroll/structures' },
      { label: 'Pay Cycle', route: '/payroll/cycles' },
      { label: 'Employees with salary assigned', route: '/employees' },
    ],
    steps: [
      { icon: 'refresh', title: 'Create a run', desc: 'Select company, pay cycle, month and year.' },
      { icon: 'clipboard', title: 'Enter inputs', desc: 'Add LOP days and bonuses via Manage Inputs.' },
      { icon: 'document', title: 'Preview', desc: 'See calculated results without locking anything.' },
      { icon: 'check', title: 'Process and finalise', desc: 'Process, approve, finalize, then publish payslips.' },
    ],
    ctaLabel: 'New Run',
  },

  'payslips': {
    icon: 'document',
    title: 'Employee Payslips',
    tagline: 'Payslips are auto-generated when a payroll run is published. Employees can view and download them from the portal.',
    benefits: [
      { icon: 'refresh', text: 'Auto-generated on publish' },
      { icon: 'identification', text: 'Employee self-download' },
      { icon: 'document', text: 'Full earnings breakdown' },
    ],
    prerequisites: [
      { label: 'Payroll Run finalized and published', route: '/payroll/runs' },
    ],
    steps: [
      { icon: 'play', title: 'Complete a payroll run', desc: 'Run — Process — Approve — Finalize.' },
      { icon: 'document', title: 'Publish payslips', desc: 'Click "Publish Payslips" on the finalized run.' },
      { icon: 'check', title: 'Payslips appear here', desc: 'One per employee per run, filterable by period.' },
      { icon: 'identification', title: 'Employee access', desc: 'Employees see their own payslips in the ESS portal.' },
    ],
    ctaLabel: 'Go to Payroll Runs',
    ctaRoute: '/payroll/runs',
  },

  'statutory-settings': {
    icon: 'scale',
    title: 'Configure Statutory Deductions',
    tagline: 'Set up PF, ESI, Professional Tax, and TDS — applied automatically in every payroll run.',
    benefits: [
      { icon: 'refresh', text: 'Auto-applied in payroll' },
      { icon: 'chart-bar', text: 'Wage-ceiling logic built in' },
      { icon: 'map-pin', text: 'State-wise PT slabs' },
    ],
    prerequisites: [
      { label: 'Company', route: '/settings/companies' },
    ],
    steps: [
      { icon: 'building', title: 'Select company', desc: 'Each company can have different statutory configuration.' },
      { icon: 'scale', title: 'Enable PF', desc: 'Set employee/employer rates (default 12%) and wage ceiling.' },
      { icon: 'check', title: 'Enable ESI', desc: 'Applies to employees earning below the configured wage ceiling.' },
      { icon: 'map-pin', title: 'Add PT slabs', desc: 'Enter your state\'s Professional Tax slabs.' },
    ],
    ctaLabel: 'Configure Statutory',
  },

  'loans': {
    icon: 'credit-card',
    title: 'Employee Loan Management',
    tagline: 'Salary loans with auto-generated EMI schedules. Monthly installments deducted directly in payroll.',
    benefits: [
      { icon: 'refresh', text: 'EMI auto-deducted in payroll' },
      { icon: 'calendar', text: 'Installment schedule' },
      { icon: 'chart-bar', text: 'Outstanding tracked at FnF' },
    ],
    prerequisites: [
      { label: 'Employees added', route: '/employees' },
    ],
    steps: [
      { icon: 'clipboard', title: 'Employee requests', desc: 'Submit amount, tenure, and purpose.' },
      { icon: 'check', title: 'HR approves', desc: 'System auto-generates the monthly EMI schedule.' },
      { icon: 'refresh', title: 'Auto-deducted', desc: 'EMI appears in every payroll run until fully paid.' },
      { icon: 'document', title: 'FnF recovery', desc: 'Outstanding balance auto-recovered at separation.' },
    ],
    ctaLabel: 'Request Loan',
  },

  'fnf': {
    icon: 'clipboard',
    title: 'Full and Final Settlement',
    tagline: 'Process all dues when an employee leaves — notice pay, gratuity, leave encashment, and loan recovery — in one screen.',
    benefits: [
      { icon: 'wrench', text: 'Auto-calculates all components' },
      { icon: 'scale', text: 'Gratuity after 5 years' },
      { icon: 'document', text: 'Downloadable settlement letter' },
    ],
    prerequisites: [
      { label: 'Employee with last working date', route: '/employees' },
      { label: 'Salary assigned', route: '/employees' },
    ],
    steps: [
      { icon: 'calendar', title: 'Set last working date', desc: 'Update the employee\'s record with their final day.' },
      { icon: 'play', title: 'Initiate FnF', desc: 'Select the employee — amounts are auto-calculated.' },
      { icon: 'document', title: 'Review breakdown', desc: 'See notice pay, leave encashment, gratuity, and loan recovery.' },
      { icon: 'check', title: 'Approve settlement', desc: 'Approve to finalise — creates the settlement record.' },
    ],
    ctaLabel: 'Initiate FnF',
  },

  'salary-assignment': {
    icon: 'currency',
    title: 'Assign Salary to Employee',
    tagline: 'Every employee needs a salary structure assigned before they can be included in payroll. Without it, they are skipped silently.',
    benefits: [
      { icon: 'calendar', text: 'Effective-dated revisions' },
      { icon: 'wrench', text: 'Per-employee overrides' },
      { icon: 'chart-bar', text: 'Full salary history' },
    ],
    prerequisites: [
      { label: 'Salary Structures', route: '/payroll/structures' },
    ],
    steps: [
      { icon: 'stack', title: 'Create a structure first', desc: 'Go to Payroll — Structures and build a salary template.' },
      { icon: 'users', title: 'Open the employee', desc: 'Navigate to the employee\'s profile page.' },
      { icon: 'currency', title: 'Assign the structure', desc: 'Assign with an effective date and CTC.' },
      { icon: 'play', title: 'Included in next run', desc: 'This employee will now appear in upcoming payroll runs.' },
    ],
    ctaLabel: 'Go to Salary Structures',
    ctaRoute: '/payroll/structures',
  },

  'payroll-inputs': {
    icon: 'clipboard',
    title: 'Monthly Payroll Inputs',
    tagline: 'Adjust LOP days, bonuses, and one-time payments before processing. Attendance LOP is auto-fetched but overrideable.',
    benefits: [
      { icon: 'refresh', text: 'LOP auto-fetched from attendance' },
      { icon: 'wrench', text: 'Manual override per employee' },
      { icon: 'banknotes', text: 'One-time bonus support' },
    ],
    prerequisites: [
      { label: 'Payroll Run in Draft or Preview', route: '/payroll/runs' },
    ],
    steps: [
      { icon: 'play', title: 'Open a payroll run', desc: 'Go to Payroll — Runs and open a Draft run.' },
      { icon: 'refresh', title: 'LOP pre-filled', desc: 'Absent days are pulled automatically from attendance logs.' },
      { icon: 'wrench', title: 'Adjust and add bonuses', desc: 'Override LOP days or add one-time bonus per employee.' },
      { icon: 'check', title: 'Save all inputs', desc: 'Click Save All then return to Preview or Process.' },
    ],
    ctaLabel: 'Go to Payroll Runs',
    ctaRoute: '/payroll/runs',
  },

  'accounting-mappings': {
    icon: 'scale',
    title: 'Accounting GL Mappings',
    tagline: 'Map salary components to GL accounts. Export Journal Vouchers for Tally, Zoho Books, QuickBooks, or any ERP.',
    benefits: [
      { icon: 'link', text: 'Direct ERP integration' },
      { icon: 'chart-bar', text: 'Debit/credit JV rows' },
      { icon: 'refresh', text: 'Auto-generated on finalise' },
    ],
    prerequisites: [
      { label: 'Salary Components', route: '/payroll/components' },
      { label: 'Company', route: '/settings/companies' },
    ],
    steps: [
      { icon: 'building', title: 'Select company', desc: 'GL chart is configured per company.' },
      { icon: 'link', title: 'Map each component', desc: 'Assign a GL code and description to Basic, HRA, PF, etc.' },
      { icon: 'check', title: 'Save mappings', desc: 'Mappings persist and apply to all future runs.' },
      { icon: 'document', title: 'Export JV', desc: 'After finalizing a run, click JV Export to download.' },
    ],
    ctaLabel: 'Go to Components',
    ctaRoute: '/payroll/components',
  },

  // ── Expense ────────────────────────────────────────────────────────────────

  'expense-claims': {
    icon: 'banknotes',
    title: 'Expense Reimbursements',
    tagline: 'Submit, review, and approve work-related expense claims. Full audit trail, category tracking, and payroll integration.',
    benefits: [
      { icon: 'clipboard', text: 'Receipt attachments' },
      { icon: 'check', text: 'Instant approval workflow' },
      { icon: 'currency', text: 'Payroll integration' },
    ],
    prerequisites: [
      { label: 'Employees added', route: '/employees' },
    ],
    steps: [
      { icon: 'clipboard', title: 'Create a claim', desc: 'Click New Claim and add expense line items.' },
      { icon: 'funnel', title: 'Categorise expenses', desc: 'Select category such as travel, meals, etc. per item.' },
      { icon: 'play', title: 'Submit for approval', desc: 'Submit to route to HR for review.' },
      { icon: 'check', title: 'HR approves', desc: 'Approved claims can be included in the next payroll.' },
    ],
    ctaLabel: 'New Claim',
  },

  // ── Configuration ──────────────────────────────────────────────────────────

  'workflows': {
    icon: 'arrows',
    title: 'Automate Approvals with Workflows',
    tagline: 'Define multi-level approval chains for leave, attendance, claims, and payroll — with conditions and escalation.',
    benefits: [
      { icon: 'arrows', text: 'Parallel and sequential steps' },
      { icon: 'clock', text: 'Auto-escalation on delay' },
      { icon: 'document', text: 'Full approval audit trail' },
    ],
    steps: [
      { icon: 'funnel', title: 'Choose module', desc: 'Select what you are automating: leave, attendance, payroll, etc.' },
      { icon: 'users', title: 'Add approvers', desc: 'Set approver roles for each step in the chain.' },
      { icon: 'arrows', title: 'Add conditions', desc: 'Route differently based on leave days, grade, or department.' },
      { icon: 'check', title: 'Activate', desc: 'New requests in that module automatically follow this workflow.' },
    ],
    ctaLabel: 'Create Workflow',
  },

  'rule-sets': {
    icon: 'funnel',
    title: 'Business Rule Engine',
    tagline: 'Configure your organisation\'s logic — accrual rates, late thresholds, OT eligibility — without writing any code.',
    benefits: [
      { icon: 'calendar', text: 'Effective-dated versioning' },
      { icon: 'beaker', text: 'Simulation before activate' },
      { icon: 'document', text: 'Audit history' },
    ],
    steps: [
      { icon: 'funnel', title: 'Choose module and type', desc: 'E.g. Attendance — Late Marking threshold.' },
      { icon: 'wrench', title: 'Define conditions', desc: 'If department equals X and grade is at least Y, apply rule Z.' },
      { icon: 'beaker', title: 'Simulate', desc: 'Test the rule against sample data before activating.' },
      { icon: 'check', title: 'Activate', desc: 'Rule applies on next trigger in that module.' },
    ],
    ctaLabel: 'Create Rule Set',
  },

  'forms': {
    icon: 'clipboard',
    title: 'Dynamic Form Builder',
    tagline: 'Build custom forms for onboarding, exit interviews, expense justification — linked to workflows and stored per employee.',
    benefits: [
      { icon: 'link', text: 'Linked to workflows' },
      { icon: 'chart-bar', text: 'Submissions reportable' },
      { icon: 'arrows', text: 'Conditional logic' },
    ],
    steps: [
      { icon: 'clipboard', title: 'Create a form', desc: 'Give it a name and select the module it belongs to.' },
      { icon: 'wrench', title: 'Add fields', desc: 'Text, date, dropdown, file upload, checkbox.' },
      { icon: 'arrows', title: 'Add conditions', desc: 'Show field B only if field A equals a specific value.' },
      { icon: 'link', title: 'Attach to workflow', desc: 'The form appears at the relevant stage for employees to fill.' },
    ],
    ctaLabel: 'Create Form',
  },

  // ── Reports ────────────────────────────────────────────────────────────────

  'reports': {
    icon: 'document',
    title: 'Generate HR Reports',
    tagline: 'One-click reports for every module — employee directory, payroll registers, leave summaries, and more. Download as CSV.',
    benefits: [
      { icon: 'play', text: 'Live data, instant generation' },
      { icon: 'document', text: 'CSV download' },
      { icon: 'calendar', text: 'Filterable by period' },
    ],
    steps: [
      { icon: 'funnel', title: 'Browse by category', desc: 'Filter by HR, Leave, Attendance, Payroll, or Finance.' },
      { icon: 'wrench', title: 'Fill parameters', desc: 'Select company, month/year, or status filter.' },
      { icon: 'play', title: 'Generate', desc: 'Data loads below the card in seconds.' },
      { icon: 'document', title: 'Download CSV', desc: 'Click the CSV button for a spreadsheet-ready export.' },
    ],
    ctaLabel: 'Browse Reports',
  },

  'analytics': {
    icon: 'chart-bar',
    title: 'Workforce Analytics',
    tagline: 'Real-time headcount, attrition rate, and payroll cost metrics — no setup required.',
    benefits: [
      { icon: 'refresh', text: 'Auto-updated from live data' },
      { icon: 'chart-bar', text: 'Key metrics at a glance' },
      { icon: 'building', text: 'Department breakdown' },
    ],
    steps: [
      { icon: 'users', title: 'Add employees', desc: 'Headcount and department charts populate automatically.' },
      { icon: 'currency', title: 'Run payroll', desc: 'Payroll cost metrics appear after the first processed run.' },
      { icon: 'chart-bar', title: 'View insights', desc: 'Total active, quarterly attrition, and cost breakdown.' },
    ],
    ctaLabel: 'Add Employees',
    ctaRoute: '/employees/new',
  },

  // ── Integrations ───────────────────────────────────────────────────────────

  'api-clients': {
    icon: 'key',
    title: 'API Access for Integrations',
    tagline: 'Give external tools and scripts secure, auditable access to your HRMS data via API keys.',
    benefits: [
      { icon: 'check', text: 'SHA-256 key hashing' },
      { icon: 'document', text: 'Usage audit trail' },
      { icon: 'refresh', text: 'One-click key rotation' },
    ],
    steps: [
      { icon: 'identification', title: 'Create a client', desc: 'Give it a descriptive name — e.g. Payroll Export Script.' },
      { icon: 'key', title: 'Copy the key', desc: 'The key is shown ONLY ONCE — store it securely.' },
      { icon: 'link', title: 'Use in API calls', desc: 'Set header: Authorization: Bearer your_key.' },
      { icon: 'refresh', title: 'Rotate if compromised', desc: 'Click Rotate Key to invalidate and generate a new one.' },
    ],
    ctaLabel: 'New API Client',
  },

  'webhooks': {
    icon: 'link',
    title: 'Real-Time Webhooks',
    tagline: 'Push event notifications to your systems the moment things happen — employee joined, payroll finalized, leave approved.',
    benefits: [
      { icon: 'play', text: 'Real-time delivery' },
      { icon: 'check', text: 'HMAC-SHA256 signed' },
      { icon: 'document', text: 'Delivery logs and retry' },
    ],
    steps: [
      { icon: 'link', title: 'Enter endpoint URL', desc: 'Your HTTPS endpoint that will receive the POST requests.' },
      { icon: 'key', title: 'Set a secret', desc: 'Used to sign payloads — verify signature to prevent spoofing.' },
      { icon: 'funnel', title: 'Choose events', desc: 'Subscribe only to the events you care about.' },
      { icon: 'beaker', title: 'Test delivery', desc: 'Click Test to confirm your endpoint is receiving correctly.' },
    ],
    ctaLabel: 'Add Webhook',
  },
};
