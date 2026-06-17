import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { employeeApi, type Employee } from '@/lib/api/employee.api';
import { organizationApi } from '@/lib/api/organization.api';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/router/routes';

type Step = 'basic' | 'employment' | 'review';

interface FormData {
  firstName: string;
  lastName: string;
  companyId: string;
  workEmail: string;
  joiningDate: string;
  employmentType: string;
  departmentId: string;
  designationId: string;
  gradeId: string;
  locationId: string;
  reportingManagerId: string;
  probationEndDate: string;
  noticePeriodDays: string;
}

const INITIAL_FORM: FormData = {
  firstName: '',
  lastName: '',
  companyId: '',
  workEmail: '',
  joiningDate: '',
  employmentType: 'full_time',
  departmentId: '',
  designationId: '',
  gradeId: '',
  locationId: '',
  reportingManagerId: '',
  probationEndDate: '',
  noticePeriodDays: '30',
};

const STEPS: { id: Step; label: string }[] = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'employment', label: 'Employment' },
  { id: 'review', label: 'Review' },
];

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('basic');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => organizationApi.listDepartments({ limit: '100' }),
  });
  const { data: designationsData } = useQuery({
    queryKey: ['designations'],
    queryFn: () => organizationApi.listDesignations({ limit: '100' }),
  });
  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: () => organizationApi.listGrades({ limit: '100' }),
  });
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => organizationApi.listLocations({ limit: '100' }),
  });
  const { data: employeesData } = useQuery({
    queryKey: ['employees', '1', '', ''],
    queryFn: () => employeeApi.list({ limit: '200' }),
  });

  const companies = companiesData?.data ?? [];
  const departments = departmentsData?.data ?? [];
  const designations = designationsData?.data ?? [];
  const grades = gradesData?.data ?? [];
  const locations = locationsData?.data ?? [];
  const employees: Employee[] = employeesData?.data ?? [];

  const toIso = (date: string) => date ? new Date(date).toISOString() : undefined;

  const mutation = useMutation({
    mutationFn: () =>
      employeeApi.create({
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        companyId: form.companyId,
        workEmail: form.workEmail || undefined,
        joiningDate: toIso(form.joiningDate)!,
        employmentType: form.employmentType,
        departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
        gradeId: form.gradeId || undefined,
        locationId: form.locationId || undefined,
        reportingManagerId: form.reportingManagerId || undefined,
        probationEndDate: toIso(form.probationEndDate),
        noticePeriodDays: Number(form.noticePeriodDays),
      }),
    onSuccess: (emp) => {
      navigate(ROUTES.EMPLOYEE_DETAIL.replace(':employeeCode', emp.employeeCode));
    },
  });

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validateBasic = () => {
    const errs: Partial<FormData> = {};
    if (!form.companyId) errs.companyId = 'Required';
    if (!form.joiningDate) errs.joiningDate = 'Required';
    if (!form.employmentType) errs.employmentType = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (step === 'basic' && !validateBasic()) return;
    if (step === 'basic') setStep('employment');
    else if (step === 'employment') setStep('review');
  };

  const prevStep = () => {
    if (step === 'employment') setStep('basic');
    else if (step === 'review') setStep('employment');
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="page-container" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="page-title">Add Employee</h1>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: i <= stepIndex ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: i === stepIndex ? 600 : 400,
            }}
          >
            <span style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < stepIndex ? 'var(--color-primary)' : i === stepIndex ? 'var(--color-primary)' : 'var(--color-border)',
              color: i <= stepIndex ? '#fff' : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: 700,
            }}>
              {i < stepIndex ? '✓' : i + 1}
            </span>
            {s.label}
            {i < STEPS.length - 1 && <span style={{ color: 'var(--color-border)' }}>→</span>}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 32 }}>
        {step === 'basic' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Basic Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="input" value={form.firstName} onChange={set('firstName')} placeholder="First name" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="input" value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Company *</label>
              <select className="select" value={form.companyId} onChange={set('companyId')}>
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.publicId} value={c.publicId}>{c.name}</option>
                ))}
              </select>
              {errors.companyId && <span className="form-error">{errors.companyId}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input type="email" className="input" value={form.workEmail} onChange={set('workEmail')} placeholder="employee@company.com" />
              <span className="form-hint">Used to send the ESS portal login invite</span>
            </div>
            <div className="form-group">
              <label className="form-label">Joining Date *</label>
              <input type="date" className="input" value={form.joiningDate} onChange={set('joiningDate')} />
              {errors.joiningDate && <span className="form-error">{errors.joiningDate}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Employment Type *</label>
              <select className="select" value={form.employmentType} onChange={set('employmentType')}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>
          </div>
        )}

        {step === 'employment' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Employment Details</h2>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="select" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.publicId} value={d.publicId}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <select className="select" value={form.designationId} onChange={set('designationId')}>
                <option value="">None</option>
                {designations.map((d) => (
                  <option key={d.publicId} value={d.publicId}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <select className="select" value={form.gradeId} onChange={set('gradeId')}>
                <option value="">None</option>
                {grades.map((g) => (
                  <option key={g.publicId} value={g.publicId}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="select" value={form.locationId} onChange={set('locationId')}>
                <option value="">None</option>
                {locations.map((l) => (
                  <option key={l.publicId} value={l.publicId}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reporting Manager</label>
              <select className="select" value={form.reportingManagerId} onChange={set('reportingManagerId')}>
                <option value="">None</option>
                {employees.map((e) => (
                  <option key={e.publicId} value={e.publicId}>
                    {e.firstName || e.lastName ? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() : e.employeeCode} ({e.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Probation End Date</label>
              <input type="date" className="input" value={form.probationEndDate} onChange={set('probationEndDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Notice Period (days)</label>
              <input type="number" className="input" value={form.noticePeriodDays} onChange={set('noticePeriodDays')} min={0} />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Review</h2>
            <dl className="detail-list">
              {form.firstName && <><dt>First Name</dt><dd>{form.firstName}</dd></>}
              {form.lastName && <><dt>Last Name</dt><dd>{form.lastName}</dd></>}
              <dt>Company</dt><dd>{companies.find(c => c.publicId === form.companyId)?.name ?? form.companyId}</dd>
              {form.workEmail && <><dt>Work Email</dt><dd>{form.workEmail}</dd></>}
              <dt>Joining Date</dt><dd>{new Date(form.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</dd>
              <dt>Employment Type</dt><dd>{form.employmentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</dd>
              {form.departmentId && <><dt>Department</dt><dd>{departments.find(d => d.publicId === form.departmentId)?.name ?? form.departmentId}</dd></>}
              {form.designationId && <><dt>Designation</dt><dd>{designations.find(d => d.publicId === form.designationId)?.name ?? form.designationId}</dd></>}
              {form.locationId && <><dt>Location</dt><dd>{locations.find(l => l.publicId === form.locationId)?.name ?? form.locationId}</dd></>}
              {form.reportingManagerId && <><dt>Reports To</dt><dd>{employees.find(e => e.publicId === form.reportingManagerId)?.firstName
                ? `${employees.find(e => e.publicId === form.reportingManagerId)?.firstName ?? ''} ${employees.find(e => e.publicId === form.reportingManagerId)?.lastName ?? ''}`.trim()
                : form.reportingManagerId}</dd></>}
              <dt>Notice Period</dt><dd>{form.noticePeriodDays} days</dd>
            </dl>
            {mutation.isError && (
              <div className="alert alert-danger" style={{ marginTop: 16 }}>
                Failed to create employee. Please try again.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={step === 'basic' ? () => navigate(-1) : prevStep}>
            {step === 'basic' ? 'Cancel' : 'Back'}
          </Button>
          {step !== 'review' ? (
            <Button onClick={nextStep}>Next</Button>
          ) : (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Employee'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
