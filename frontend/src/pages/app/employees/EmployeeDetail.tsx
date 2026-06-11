import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '@/lib/api/employee.api';
import { organizationApi } from '@/lib/api/organization.api';
import type { EmployeePersonalDetails, EmployeeBankDetails } from '@/lib/api/employee.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { ROUTES } from '@/router/routes';

type Tab = 'overview' | 'personal' | 'bank' | 'documents' | 'timeline';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'personal',  label: 'Personal' },
  { id: 'bank',      label: 'Bank Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline',  label: 'Timeline' },
];

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern', 'consultant'];
const ACCOUNT_TYPES = ['savings', 'current'] as const;
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

function toIso(d: string) { return d ? new Date(d).toISOString() : undefined; }
function toDateInput(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().split('T')[0];
}

// ── Shared styles ──────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
  padding: 24,
  marginBottom: 16,
};

const sectionHead: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
        {value || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
      </span>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 32px' }}>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EmployeeDetail() {
  const { employeeCode } = useParams<{ employeeCode: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editOverviewOpen, setEditOverviewOpen] = useState(false);
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);
  const [editBankOpen, setEditBankOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['employee', employeeCode],
    queryFn: () => employeeApi.get(employeeCode!),
    enabled: !!employeeCode,
  });

  const { data: personal } = useQuery({
    queryKey: ['employee-personal', employeeCode],
    queryFn: () => employeeApi.getPersonal(employeeCode!),
    enabled: !!employeeCode && (activeTab === 'personal' || editPersonalOpen),
  });

  const { data: bankDetails } = useQuery({
    queryKey: ['employee-bank', employeeCode],
    queryFn: () => employeeApi.getBankDetails(employeeCode!),
    enabled: !!employeeCode && activeTab === 'bank',
  });

  const { data: documents } = useQuery({
    queryKey: ['employee-documents', employeeCode],
    queryFn: () => employeeApi.getDocuments(employeeCode!),
    enabled: !!employeeCode && activeTab === 'documents',
  });

  const { data: timeline } = useQuery({
    queryKey: ['employee-timeline', employeeCode],
    queryFn: () => employeeApi.getTimeline(employeeCode!),
    enabled: !!employeeCode && activeTab === 'timeline',
  });

  const { data: companiesData }    = useQuery({ queryKey: ['companies'],    queryFn: () => organizationApi.listCompanies({ limit: '100' }) });
  const { data: departmentsData }  = useQuery({ queryKey: ['departments'],  queryFn: () => organizationApi.listDepartments({ limit: '100' }) });
  const { data: designationsData } = useQuery({ queryKey: ['designations'], queryFn: () => organizationApi.listDesignations({ limit: '100' }) });
  const { data: locationsData }    = useQuery({ queryKey: ['locations'],    queryFn: () => organizationApi.listLocations({ limit: '100' }) });

  const companies    = companiesData?.data ?? [];
  const departments  = departmentsData?.data ?? [];
  const designations = designationsData?.data ?? [];
  const locations    = locationsData?.data ?? [];

  // ── Overview form ────────────────────────────────────────────────────────

  const [ov, setOv] = useState({
    companyId: '', workEmail: '', employmentType: 'full_time', departmentId: '',
    designationId: '', locationId: '', reportingManagerId: '', noticePeriodDays: '30', probationEndDate: '',
  });

  const openOverview = () => {
    if (!employee) return;
    setOv({
      companyId: employee.companyId ?? '',
      workEmail: employee.workEmail ?? '',
      employmentType: employee.employmentType ?? 'full_time',
      departmentId: employee.departmentId ?? '',
      designationId: employee.designationId ?? '',
      locationId: employee.locationId ?? '',
      reportingManagerId: employee.reportingManagerId ?? '',
      noticePeriodDays: String(employee.noticePeriodDays ?? 30),
      probationEndDate: toDateInput(employee.probationEndDate),
    });
    setEditOverviewOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: () => employeeApi.update(employeeCode!, {
      companyId: ov.companyId || undefined,
      workEmail: ov.workEmail || undefined,
      employmentType: ov.employmentType || undefined,
      departmentId: ov.departmentId || undefined,
      designationId: ov.designationId || undefined,
      locationId: ov.locationId || undefined,
      reportingManagerId: ov.reportingManagerId || undefined,
      noticePeriodDays: ov.noticePeriodDays ? Number(ov.noticePeriodDays) : undefined,
      probationEndDate: toIso(ov.probationEndDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee', employeeCode] }); setEditOverviewOpen(false); },
  });

  // ── Personal form ────────────────────────────────────────────────────────

  const [pf, setPf] = useState<Partial<EmployeePersonalDetails & { dateOfBirthInput: string }>>({});

  const openPersonal = () => {
    setPf({
      firstName: personal?.firstName ?? '',
      lastName: personal?.lastName ?? '',
      middleName: personal?.middleName ?? '',
      dateOfBirthInput: toDateInput(personal?.dateOfBirth),
      gender: personal?.gender ?? '',
      maritalStatus: personal?.maritalStatus ?? '',
      nationality: personal?.nationality ?? '',
      bloodGroup: personal?.bloodGroup ?? '',
      panNumber: personal?.panNumber ?? '',
      aadhaarNumber: personal?.aadhaarNumber ?? '',
    });
    setEditPersonalOpen(true);
  };

  const updatePersonalMutation = useMutation({
    mutationFn: () => employeeApi.updatePersonal(employeeCode!, {
      firstName: pf.firstName || undefined,
      lastName: pf.lastName || undefined,
      middleName: pf.middleName || undefined,
      dateOfBirth: toIso((pf as { dateOfBirthInput?: string }).dateOfBirthInput ?? ''),
      gender: pf.gender || undefined,
      maritalStatus: pf.maritalStatus || undefined,
      nationality: pf.nationality || undefined,
      bloodGroup: pf.bloodGroup || undefined,
      panNumber: pf.panNumber || undefined,
      aadhaarNumber: pf.aadhaarNumber || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-personal', employeeCode] });
      qc.invalidateQueries({ queryKey: ['employee', employeeCode] });
      setEditPersonalOpen(false);
    },
  });

  // ── Bank form ────────────────────────────────────────────────────────────

  const [bf, setBf] = useState<Partial<EmployeeBankDetails>>({
    accountNumber: '', ifscCode: '', bankName: '', branchName: '', accountType: 'savings', isPrimary: true,
  });

  const openBank = (existing?: EmployeeBankDetails) => {
    setBf(existing ?? { accountNumber: '', ifscCode: '', bankName: '', branchName: '', accountType: 'savings', isPrimary: true });
    setEditBankOpen(true);
  };

  const upsertBankMutation = useMutation({
    mutationFn: () => employeeApi.upsertBankDetails(employeeCode!, {
      accountNumber: bf.accountNumber!,
      ifscCode: bf.ifscCode!,
      bankName: bf.bankName!,
      branchName: bf.branchName || undefined,
      accountType: bf.accountType ?? 'savings',
      isPrimary: bf.isPrimary ?? true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-bank', employeeCode] });
      setEditBankOpen(false);
    },
  });

  // ── ESS ──────────────────────────────────────────────────────────────────

  const inviteEssMutation = useMutation({
    mutationFn: () => employeeApi.inviteEss(employeeCode!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee', employeeCode] }),
  });

  const disableEssMutation = useMutation({
    mutationFn: () => employeeApi.disableEss(employeeCode!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee', employeeCode] }),
  });

  // ── Document upload ──────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeCode) return;
    setUploadError('');
    setUploading(true);
    try {
      const { uploadUrl, s3Key } = await employeeApi.presignUpload(employeeCode, file.name, file.type);
      const putRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) throw new Error('Upload failed');

      const buffer = await file.arrayBuffer();
      const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
      const checksum = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

      await employeeApi.confirmUpload(employeeCode, {
        s3Key,
        documentType: 'general',
        documentName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        checksum,
      });
      qc.invalidateQueries({ queryKey: ['employee-documents', employeeCode] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteDocMutation = useMutation({
    mutationFn: (docPublicId: string) => employeeApi.deleteDocument(employeeCode!, docPublicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-documents', employeeCode] }),
  });

  // ── Loading / error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 8 }}><Skeleton height={28} width={160} /></div>
        <div style={{ marginBottom: 24 }}><Skeleton height={20} width={100} /></div>
        <Skeleton height={180} />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="page-container">
        <EmptyState title="Employee not found" description="This employee doesn't exist or you don't have access." />
      </div>
    );
  }

  const essPending = inviteEssMutation.isPending || disableEssMutation.isPending;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-container">

      {/* Header */}
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--color-primary-light)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.04em',
            }}>
              {personal
                ? `${personal.firstName?.charAt(0) ?? ''}${personal.lastName?.charAt(0) ?? ''}`.toUpperCase() || employee.employeeCode.slice(0, 2).toUpperCase()
                : employee.employeeCode.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="page-title">
                {personal ? `${personal.firstName ?? ''} ${personal.lastName ?? ''}`.trim() || employee.employeeCode : employee.employeeCode}
              </h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <Badge variant={employee.status === 'active' ? 'success' : employee.status === 'probation' ? 'warning' : 'default'}>
                  {employee.status.replace(/_/g, ' ')}
                </Badge>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {employee.employmentType.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="page-actions">
          {employee.essEnabled ? (
            <Button variant="secondary" onClick={() => disableEssMutation.mutate()} disabled={essPending}>
              {disableEssMutation.isPending ? 'Disabling…' : 'Disable ESS'}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => inviteEssMutation.mutate()} disabled={essPending}>
              {inviteEssMutation.isPending ? 'Sending…' : 'Invite to ESS'}
            </Button>
          )}
          <Button onClick={openOverview}>Edit Employment</Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '9px 18px',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: activeTab === t.id ? 600 : 500,
              color: activeTab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              marginBottom: '-1px',
              transition: 'color 0.12s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={cardStyle}>
            <div style={sectionHead}>
              <h3 style={{ margin: 0 }}>Employment</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <PermissionGuard permission="employee.salary.view">
                  <Link
                    to={ROUTES.EMPLOYEE_SALARY.replace(':employeeCode', employee.employeeCode)}
                    className="btn btn-ghost btn-sm"
                  >
                    💰 Salary
                  </Link>
                </PermissionGuard>
                <button className="btn btn-ghost btn-sm" onClick={openOverview}>Edit</button>
              </div>
            </div>
            <FieldGrid>
              <Field label="Work Email"      value={
                employee.workEmail
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {employee.workEmail}
                      {employee.essEnabled
                        ? <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-green)', background: 'var(--color-green-bg)', padding: '1px 8px', borderRadius: 99 }}>ESS Active</span>
                        : <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-amber)', background: 'var(--color-amber-bg)', padding: '1px 8px', borderRadius: 99 }}>Invite Pending</span>
                      }
                    </span>
                  : <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>Not set — add email to enable ESS</span>
              } />
              <Field label="Type"            value={employee.employmentType.replace(/_/g, ' ')} />
              <Field label="Joining Date"    value={new Date(employee.joiningDate).toLocaleDateString('en-IN')} />
              <Field label="Notice Period"   value={`${employee.noticePeriodDays} days`} />
              {employee.probationEndDate && (
                <Field label="Probation End" value={new Date(employee.probationEndDate).toLocaleDateString('en-IN')} />
              )}
            </FieldGrid>
          </div>
          <div style={cardStyle}>
            <div style={sectionHead}>
              <h3 style={{ margin: 0 }}>Assignment</h3>
              <button className="btn btn-ghost btn-sm" onClick={openOverview}>Edit</button>
            </div>
            <FieldGrid>
              <Field label="Company"     value={companies.find(c => c.publicId === employee.companyId)?.name ?? employee.companyId} />
              <Field label="Department"  value={departments.find(d => d.publicId === employee.departmentId)?.name ?? employee.departmentId} />
              <Field label="Designation" value={designations.find(d => d.publicId === employee.designationId)?.name ?? employee.designationId} />
              <Field label="Location"    value={locations.find(l => l.publicId === employee.locationId)?.name ?? employee.locationId} />
              <Field label="Reports To"  value={employee.reportingManagerId} />
            </FieldGrid>
          </div>
        </div>
      )}

      {/* ── Personal ── */}
      {activeTab === 'personal' && (
        <div style={cardStyle}>
          <div style={sectionHead}>
            <h3 style={{ margin: 0 }}>Personal Details</h3>
            <Button onClick={openPersonal}>{personal ? 'Edit' : 'Add Details'}</Button>
          </div>
          {personal ? (
            <FieldGrid>
              <Field label="First Name"     value={personal.firstName} />
              <Field label="Last Name"      value={personal.lastName} />
              <Field label="Middle Name"    value={personal.middleName} />
              <Field label="Date of Birth"  value={personal.dateOfBirth ? new Date(personal.dateOfBirth).toLocaleDateString('en-IN') : undefined} />
              <Field label="Gender"         value={personal.gender} />
              <Field label="Marital Status" value={personal.maritalStatus} />
              <Field label="Nationality"    value={personal.nationality} />
              <Field label="Blood Group"    value={personal.bloodGroup} />
              <Field label="PAN"            value={personal.panNumber} />
              <Field label="Aadhaar"        value={personal.aadhaarNumber ? `XXXX XXXX ${personal.aadhaarNumber.slice(-4)}` : undefined} />
            </FieldGrid>
          ) : (
            <EmptyState
              title="No personal details"
              description="Add personal details for this employee."
              cta={<Button onClick={openPersonal}>Add Details</Button>}
            />
          )}
        </div>
      )}

      {/* ── Bank Details ── */}
      {activeTab === 'bank' && (
        <div style={cardStyle}>
          <div style={sectionHead}>
            <h3 style={{ margin: 0 }}>Bank Details</h3>
            <Button onClick={() => openBank()}>
              {bankDetails && bankDetails.length > 0 ? 'Edit' : 'Add Account'}
            </Button>
          </div>
          {bankDetails && bankDetails.length > 0 ? (
            <div>
              {bankDetails.map((b, i) => (
                <div key={i} style={{ padding: '16px 0', borderBottom: i < bankDetails.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <FieldGrid>
                      <Field label="Bank Name"      value={b.bankName} />
                      <Field label="Account Number" value={`XXXX XXXX ${b.accountNumber.slice(-4)}`} />
                      <Field label="IFSC Code"      value={b.ifscCode} />
                      <Field label="Account Type"   value={b.accountType} />
                      {b.branchName && <Field label="Branch" value={b.branchName} />}
                    </FieldGrid>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {b.isPrimary && <Badge variant="success">Primary</Badge>}
                      <button className="btn btn-ghost btn-sm" onClick={() => openBank(b)}>Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No bank account"
              description="Add a bank account for salary disbursement."
              cta={<Button onClick={() => openBank()}>Add Account</Button>}
            />
          )}
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === 'documents' && (
        <div>
          <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0 }}>Documents</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                Upload ID proofs, certificates, and other documents.
              </p>
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
              />
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload Document'}
              </Button>
            </div>
          </div>

          {uploadError && (
            <div className="alert alert-danger">{uploadError}</div>
          )}

          {documents && documents.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Expiry</th>
                    <th>Uploaded</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.publicId}>
                      <td style={{ fontWeight: 500 }}>{doc.documentName}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{doc.documentType}</td>
                      <td>
                        <Badge variant={
                          doc.verificationStatus === 'verified' ? 'success' :
                          doc.verificationStatus === 'rejected' ? 'danger' : 'warning'
                        }>
                          {doc.verificationStatus}
                        </Badge>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-red)' }}
                            onClick={() => { if (confirm('Delete this document?')) deleteDocMutation.mutate(doc.publicId); }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !uploading && (
              <EmptyState
                title="No documents"
                description="Upload ID proofs, certificates, or other relevant documents."
                cta={<Button onClick={() => fileRef.current?.click()}>Upload Document</Button>}
              />
            )
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {activeTab === 'timeline' && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 20 }}>Status History</h3>
          {timeline && timeline.length > 0 ? (
            <div>
              {timeline.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 16, paddingBottom: 20,
                  borderBottom: i < timeline.length - 1 ? '1px solid var(--color-border)' : 'none',
                  marginBottom: i < timeline.length - 1 ? 20 : 0,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge variant="default">{entry.fromStatus.replace(/_/g, ' ')}</Badge>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
                        <Badge variant="success">{entry.toStatus.replace(/_/g, ' ')}</Badge>
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        {new Date(entry.changedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {entry.reason && (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{entry.reason}</p>
                    )}
                    {entry.changedBy && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Changed by: {entry.changedBy}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No history" description="Status changes will appear here." />
          )}
        </div>
      )}

      {/* ── Edit Employment Modal ── */}
      <Modal
        open={editOverviewOpen}
        onClose={() => setEditOverviewOpen(false)}
        title="Edit Employment Details"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setEditOverviewOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>Save Changes</Button>
          </div>
        }
      >
        {updateMutation.isError && <div className="alert alert-danger">Failed to save. Please try again.</div>}
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Work Email</label>
            <input className="input" type="email" value={ov.workEmail} onChange={e => setOv(p => ({ ...p, workEmail: e.target.value }))} placeholder="employee@company.com" />
            <span className="form-hint">Used for ESS portal login invite</span>
          </div>
          <div className="form-group">
            <label className="form-label">Company</label>
            <select className="select" value={ov.companyId} onChange={e => setOv(p => ({ ...p, companyId: e.target.value }))}>
              <option value="">Select company</option>
              {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Employment Type</label>
            <select className="select" value={ov.employmentType} onChange={e => setOv(p => ({ ...p, employmentType: e.target.value }))}>
              {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="select" value={ov.departmentId} onChange={e => setOv(p => ({ ...p, departmentId: e.target.value }))}>
              <option value="">None</option>
              {departments.map(d => <option key={d.publicId} value={d.publicId}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <select className="select" value={ov.designationId} onChange={e => setOv(p => ({ ...p, designationId: e.target.value }))}>
              <option value="">None</option>
              {designations.map(d => <option key={d.publicId} value={d.publicId}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <select className="select" value={ov.locationId} onChange={e => setOv(p => ({ ...p, locationId: e.target.value }))}>
              <option value="">None</option>
              {locations.map(l => <option key={l.publicId} value={l.publicId}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reporting Manager ID</label>
            <input className="input" value={ov.reportingManagerId} onChange={e => setOv(p => ({ ...p, reportingManagerId: e.target.value }))} placeholder="Employee public ID" />
          </div>
          <div className="form-group">
            <label className="form-label">Notice Period (days)</label>
            <input className="input" type="number" min={0} value={ov.noticePeriodDays} onChange={e => setOv(p => ({ ...p, noticePeriodDays: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Probation End Date</label>
            <input className="input" type="date" value={ov.probationEndDate} onChange={e => setOv(p => ({ ...p, probationEndDate: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Edit Personal Modal ── */}
      <Modal
        open={editPersonalOpen}
        onClose={() => setEditPersonalOpen(false)}
        title="Personal Details"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setEditPersonalOpen(false)}>Cancel</Button>
            <Button onClick={() => updatePersonalMutation.mutate()} loading={updatePersonalMutation.isPending}>Save</Button>
          </div>
        }
      >
        {updatePersonalMutation.isError && <div className="alert alert-danger">Failed to save. Please try again.</div>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input className="input" value={pf.firstName ?? ''} onChange={e => setPf(p => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input className="input" value={pf.lastName ?? ''} onChange={e => setPf(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Middle Name</label>
            <input className="input" value={pf.middleName ?? ''} onChange={e => setPf(p => ({ ...p, middleName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="input" type="date" value={(pf as { dateOfBirthInput?: string }).dateOfBirthInput ?? ''} onChange={e => setPf(p => ({ ...p, dateOfBirthInput: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="select" value={pf.gender ?? ''} onChange={e => setPf(p => ({ ...p, gender: e.target.value }))}>
              <option value="">Select</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Marital Status</label>
            <select className="select" value={pf.maritalStatus ?? ''} onChange={e => setPf(p => ({ ...p, maritalStatus: e.target.value }))}>
              <option value="">Select</option>
              {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nationality</label>
            <input className="input" value={pf.nationality ?? ''} onChange={e => setPf(p => ({ ...p, nationality: e.target.value }))} placeholder="e.g. Indian" />
          </div>
          <div className="form-group">
            <label className="form-label">Blood Group</label>
            <select className="select" value={pf.bloodGroup ?? ''} onChange={e => setPf(p => ({ ...p, bloodGroup: e.target.value }))}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">PAN Number</label>
            <input className="input" value={pf.panNumber ?? ''} onChange={e => setPf(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} />
          </div>
          <div className="form-group">
            <label className="form-label">Aadhaar Number</label>
            <input className="input" value={pf.aadhaarNumber ?? ''} onChange={e => setPf(p => ({ ...p, aadhaarNumber: e.target.value }))} placeholder="12-digit number" maxLength={12} />
          </div>
        </div>
      </Modal>

      {/* ── Edit Bank Modal ── */}
      <Modal
        open={editBankOpen}
        onClose={() => setEditBankOpen(false)}
        title="Bank Account Details"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setEditBankOpen(false)}>Cancel</Button>
            <Button onClick={() => upsertBankMutation.mutate()} loading={upsertBankMutation.isPending}>Save</Button>
          </div>
        }
      >
        {upsertBankMutation.isError && <div className="alert alert-danger">Failed to save. Please try again.</div>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Bank Name *</label>
            <input className="input" value={bf.bankName ?? ''} onChange={e => setBf(p => ({ ...p, bankName: e.target.value }))} placeholder="State Bank of India" />
          </div>
          <div className="form-group">
            <label className="form-label">Branch Name</label>
            <input className="input" value={bf.branchName ?? ''} onChange={e => setBf(p => ({ ...p, branchName: e.target.value }))} placeholder="Main Branch" />
          </div>
          <div className="form-group">
            <label className="form-label">Account Number *</label>
            <input className="input" value={bf.accountNumber ?? ''} onChange={e => setBf(p => ({ ...p, accountNumber: e.target.value }))} placeholder="000000000000" />
          </div>
          <div className="form-group">
            <label className="form-label">IFSC Code *</label>
            <input className="input" value={bf.ifscCode ?? ''} onChange={e => setBf(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))} placeholder="SBIN0000001" maxLength={11} />
          </div>
          <div className="form-group">
            <label className="form-label">Account Type *</label>
            <select className="select" value={bf.accountType ?? 'savings'} onChange={e => setBf(p => ({ ...p, accountType: e.target.value as typeof ACCOUNT_TYPES[number] }))}>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
            <input type="checkbox" id="isPrimary" checked={bf.isPrimary ?? true} onChange={e => setBf(p => ({ ...p, isPrimary: e.target.checked }))} style={{ accentColor: 'var(--color-primary)', width: 16, height: 16 }} />
            <label htmlFor="isPrimary" className="form-label" style={{ margin: 0 }}>Primary Account</label>
          </div>
        </div>
      </Modal>

    </div>
  );
}
