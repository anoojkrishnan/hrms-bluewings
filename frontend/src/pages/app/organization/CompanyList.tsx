import { useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '@/lib/api/organization.api';
import type { Company, CreateCompanyDto, CompanyAddress } from '@/lib/api/organization.api';
import { Modal } from '@/components/ui/Modal';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

// ── Static data ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
];

const INDIA_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

// ── Validation ──────────────────────────────────────────────────────────────────

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const TAN_RE = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
const CIN_RE = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const PF_RE = /^[A-Z]{2}[A-Z]{3}[0-9]{7}[0-9]{3}[0-9]{7}$|^[A-Z]{2}\/[A-Z]{3}\/[0-9]{7}\/[0-9]{3}\/[0-9]{7}$/;
const ESI_RE = /^[0-9]{17}$/;
const LIN_RE = /^[A-Z0-9]{14}$/;
const PHONE_RE = /^\+?[0-9\s\-()\\.]{7,15}$/;

// ── Form types ──────────────────────────────────────────────────────────────────

interface CompanyForm {
  // Basic
  name: string;
  legalName: string;
  cin: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  timezone: string;
  financialYearStart: 'jan' | 'apr';
  // Address
  addrLine1: string;
  addrLine2: string;
  addrCity: string;
  addrState: string;
  addrPincode: string;
  addrCountry: string;
  // Statutory
  gstin: string;
  pan: string;
  tan: string;
  pfNumber: string;
  esiNumber: string;
  linNumber: string;
  // Compliance
  pfEnabled: boolean;
  esiEnabled: boolean;
  ptEnabled: boolean;
  lwfEnabled: boolean;
}

type FormErrors = Partial<Record<keyof CompanyForm, string>>;

const INITIAL_FORM: CompanyForm = {
  name: '', legalName: '', cin: '', phone: '', email: '', website: '',
  currency: 'INR', timezone: 'Asia/Kolkata', financialYearStart: 'apr',
  addrLine1: '', addrLine2: '', addrCity: '', addrState: '', addrPincode: '', addrCountry: 'IN',
  gstin: '', pan: '', tan: '', pfNumber: '', esiNumber: '', linNumber: '',
  pfEnabled: false, esiEnabled: false, ptEnabled: false, lwfEnabled: false,
};

function formToDto(form: CompanyForm): CreateCompanyDto {
  const hasAddress = form.addrLine1 || form.addrCity;
  const address: CompanyAddress | undefined = hasAddress ? {
    line1: form.addrLine1,
    line2: form.addrLine2 || undefined,
    city: form.addrCity,
    state: form.addrState,
    pincode: form.addrPincode,
    country: form.addrCountry || 'IN',
  } : undefined;

  return {
    name: form.name.trim(),
    legalName: form.legalName.trim() || undefined,
    cin: form.cin.toUpperCase().trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    website: form.website.trim() || undefined,
    currency: form.currency,
    timezone: form.timezone,
    financialYearStart: form.financialYearStart,
    country: form.addrCountry || 'IN',
    state: form.addrState || undefined,
    address,
    gstin: form.gstin.toUpperCase().trim() || undefined,
    pan: form.pan.toUpperCase().trim() || undefined,
    tan: form.tan.toUpperCase().trim() || undefined,
    pfNumber: form.pfNumber.toUpperCase().trim() || undefined,
    esiNumber: form.esiNumber.trim() || undefined,
    linNumber: form.linNumber.toUpperCase().trim() || undefined,
    pfEnabled: form.pfEnabled,
    esiEnabled: form.esiEnabled,
    ptEnabled: form.ptEnabled,
    lwfEnabled: form.lwfEnabled,
  };
}

function companyToForm(c: Company): CompanyForm {
  return {
    name: c.name,
    legalName: c.legalName ?? '',
    cin: c.cin ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    website: c.website ?? '',
    currency: c.currency,
    timezone: c.timezone,
    financialYearStart: c.financialYearStart ?? 'apr',
    addrLine1: c.address?.line1 ?? '',
    addrLine2: c.address?.line2 ?? '',
    addrCity: c.address?.city ?? '',
    addrState: c.address?.state ?? c.state ?? '',
    addrPincode: c.address?.pincode ?? '',
    addrCountry: c.address?.country ?? c.country ?? 'IN',
    gstin: c.gstin ?? '',
    pan: c.pan ?? '',
    tan: c.tan ?? '',
    pfNumber: c.pfNumber ?? '',
    esiNumber: c.esiNumber ?? '',
    linNumber: c.linNumber ?? '',
    pfEnabled: c.pfEnabled,
    esiEnabled: c.esiEnabled,
    ptEnabled: c.ptEnabled,
    lwfEnabled: c.lwfEnabled,
  };
}

function validate(form: CompanyForm): FormErrors {
  const e: FormErrors = {};
  if (!form.name.trim()) e.name = 'Company name is required';
  else if (form.name.trim().length < 2) e.name = 'Must be at least 2 characters';

  if (form.cin && !CIN_RE.test(form.cin.toUpperCase())) e.cin = 'Invalid CIN (e.g. L17110MH1973PLC019786)';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
  if (form.phone && !PHONE_RE.test(form.phone)) e.phone = 'Invalid phone number';
  if (form.website && !/^https?:\/\/.+/.test(form.website)) e.website = 'URL must start with http:// or https://';

  if (form.addrLine1 && !form.addrCity) e.addrCity = 'City is required when address is provided';
  if (form.addrLine1 && !form.addrState) e.addrState = 'State is required when address is provided';
  if (form.addrPincode && form.addrCountry === 'IN' && !/^[0-9]{6}$/.test(form.addrPincode))
    e.addrPincode = 'Pincode must be 6 digits';

  if (form.gstin && !GSTIN_RE.test(form.gstin.toUpperCase())) e.gstin = 'Invalid GSTIN (e.g. 27AAAAA0000A1Z5)';
  if (form.pan && !PAN_RE.test(form.pan.toUpperCase())) e.pan = 'Invalid PAN (e.g. AAAPL1234C)';
  if (form.tan && !TAN_RE.test(form.tan.toUpperCase())) e.tan = 'Invalid TAN (e.g. PDES03028F)';
  if (form.pfNumber && !PF_RE.test(form.pfNumber.toUpperCase())) e.pfNumber = 'Invalid PF No. (e.g. MH/BAN/0010704/000/0014141)';
  if (form.esiNumber && !ESI_RE.test(form.esiNumber)) e.esiNumber = 'ESI number must be 17 digits';
  if (form.linNumber && !LIN_RE.test(form.linNumber.toUpperCase())) e.linNumber = 'LIN must be 14 alphanumeric characters';

  return e;
}

// ── Section heading component ──────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <div style={{ margin: '20px 0 12px', borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
        {title}
      </span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function CompanyList() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const [form, setForm] = useState<CompanyForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemove, setLogoRemove] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────

  const { data, isLoading, isError, error: listError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });

  const companies = data?.data ?? [];
  const activeCount = companies.filter((c) => c.isActive).length;

  // ── Mutations ──────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (dto: CreateCompanyDto) => organizationApi.createCompany(dto),
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, dto }: { publicId: string; dto: CreateCompanyDto }) =>
      organizationApi.updateCompany(publicId, dto),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => organizationApi.deleteCompany(publicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeleteTarget(null);
    },
  });

  const logoDeleteMutation = useMutation({
    mutationFn: (publicId: string) => organizationApi.deleteCompanyLogo(publicId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });

  // ── Logo upload helper ─────────────────────────────────────────────────

  const uploadLogo = useCallback(async (companyPublicId: string, file: File): Promise<void> => {
    setLogoUploading(true);
    try {
      await organizationApi.uploadLogo(companyPublicId, file);
    } finally {
      setLogoUploading(false);
    }
  }, []);

  // ── Modal helpers ──────────────────────────────────────────────────────

  const openAdd = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemove(false);
    setModalOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditTarget(company);
    setForm(companyToForm(company));
    setFormErrors({});
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemove(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoRemove(false);
    createMutation.reset();
    updateMutation.reset();
  };

  // ── Form field setter ──────────────────────────────────────────────────

  const set = (field: keyof CompanyForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setFormErrors((err) => ({ ...err, [field]: undefined }));
  };

  // ── Logo file select ───────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoRemove(false);
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const dto = formToDto(form);

    try {
      if (editTarget) {
        // Handle logo removal first
        if (logoRemove && editTarget.logoUrl) {
          await logoDeleteMutation.mutateAsync(editTarget.publicId);
        }
        await updateMutation.mutateAsync({ publicId: editTarget.publicId, dto });
        if (logoFile) {
          await uploadLogo(editTarget.publicId, logoFile);
        }
      } else {
        const created = await createMutation.mutateAsync(dto);
        if (logoFile) {
          const companyPublicId = (created as unknown as { data: Company }).data?.publicId ?? (created as unknown as Company).publicId;
          if (companyPublicId) await uploadLogo(companyPublicId, logoFile);
        }
      }

      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    } catch {
      // error shown via mutation.error
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || logoUploading;
  const mutError = createMutation.error ?? updateMutation.error;

  const currentLogoUrl = logoRemove ? null : (logoPreview ?? editTarget?.logoUrl ?? null);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Companies</h1>
        <div className="page-actions">
          <Button onClick={openAdd}>+ Add Company</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Companies</div>
          <div className="stat-value">{companies.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>

      {isLoading && Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8 }}><Skeleton height={56} /></div>
      ))}

      {isError && (
        <div className="alert alert-danger">{getErrorMessage(listError, 'Failed to load companies.')}</div>
      )}

      {!isLoading && !isError && companies.length === 0 && (
        <SetupGuide content={SETUP['companies']} />
      )}

      {!isLoading && !isError && companies.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Name</th>
                <th>Legal Name</th>
                <th>GSTIN</th>
                <th>PAN</th>
                <th>State</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.publicId}>
                  <td>
                    {c.logoUrl ? (
                      <button
                        onClick={() => setLightboxUrl(c.logoUrl!)}
                        title="Click to view full size"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'zoom-in', display: 'block' }}
                      >
                        <img src={c.logoUrl} alt={c.name} style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--color-border)', display: 'block' }} />
                      </button>
                    ) : (
                      <div style={{ height: 32, width: 32, borderRadius: 4, background: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.legalName ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.gstin ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.pan ?? '—'}</td>
                  <td>{c.address?.state ?? c.state ?? '—'}</td>
                  <td>
                    <Badge variant={c.isActive ? 'success' : 'default'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(c)}>✎</button>
                      <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteTarget(c)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? `Edit — ${editTarget.name}` : 'Add Company'}
        size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>Cancel</Button>
            <Button onClick={() => void handleSubmit()} disabled={isPending}>
              {isPending ? (logoUploading ? 'Uploading logo…' : 'Saving…') : editTarget ? 'Save Changes' : 'Create Company'}
            </Button>
          </div>
        }
      >
        {mutError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            {getErrorMessage(mutError)}
          </div>
        )}

        {/* ── BASIC INFORMATION ── */}
        <Section title="Basic Information" />
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Company Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Acme India Pvt Ltd" />
            {formErrors.name && <span className="form-error">{formErrors.name}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Legal / Registered Name</label>
            <input className="input" value={form.legalName} onChange={set('legalName')} placeholder="Acme Technologies Private Limited" />
          </div>
          <div className="form-group">
            <label className="form-label">CIN <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(Corporate Identity Number)</span></label>
            <input className="input" value={form.cin} onChange={set('cin')} placeholder="L17110MH1973PLC019786" style={{ textTransform: 'uppercase' }} />
            {formErrors.cin && <span className="form-error">{formErrors.cin}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            {formErrors.phone && <span className="form-error">{formErrors.phone}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="hr@acme.com" />
            {formErrors.email && <span className="form-error">{formErrors.email}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input className="input" value={form.website} onChange={set('website')} placeholder="https://acme.com" />
            {formErrors.website && <span className="form-error">{formErrors.website}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="select" value={form.currency} onChange={set('currency')}>
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="SGD">SGD — Singapore Dollar</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <select className="select" value={form.timezone} onChange={set('timezone')}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Financial Year Start</label>
            <select className="select" value={form.financialYearStart} onChange={set('financialYearStart')}>
              <option value="apr">April (India standard)</option>
              <option value="jan">January (Calendar year)</option>
            </select>
          </div>
        </div>

        {/* ── ADDRESS ── */}
        <Section title="Registered Address" />
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address Line 1</label>
            <input className="input" value={form.addrLine1} onChange={set('addrLine1')} placeholder="Building / Floor / Street" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address Line 2</label>
            <input className="input" value={form.addrLine2} onChange={set('addrLine2')} placeholder="Area / Landmark (optional)" />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <select className="select" value={form.addrCountry} onChange={set('addrCountry')}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">State / Province {formErrors.addrState && <span className="form-error" style={{ marginLeft: 4 }}>{formErrors.addrState}</span>}</label>
            {form.addrCountry === 'IN' ? (
              <select className="select" value={form.addrState} onChange={set('addrState')}>
                <option value="">Select state…</option>
                {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className="input" value={form.addrState} onChange={set('addrState')} placeholder="State / Province" />
            )}
          </div>
          <div className="form-group">
            <label className="form-label">City {formErrors.addrCity && <span className="form-error" style={{ marginLeft: 4 }}>{formErrors.addrCity}</span>}</label>
            <input className="input" value={form.addrCity} onChange={set('addrCity')} placeholder="Mumbai" />
          </div>
          <div className="form-group">
            <label className="form-label">Pincode / ZIP {formErrors.addrPincode && <span className="form-error" style={{ marginLeft: 4 }}>{formErrors.addrPincode}</span>}</label>
            <input className="input" value={form.addrPincode} onChange={set('addrPincode')} placeholder={form.addrCountry === 'IN' ? '400001' : 'Postal code'} maxLength={form.addrCountry === 'IN' ? 6 : 10} />
          </div>
        </div>

        {/* ── STATUTORY & TAX ── */}
        <Section title="Statutory & Tax Numbers" />
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label className="form-label">GSTIN</label>
            <input className="input" value={form.gstin} onChange={set('gstin')} placeholder="27AAAAA0000A1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
            {formErrors.gstin
              ? <span className="form-error">{formErrors.gstin}</span>
              : <span className="form-hint">15-character GST Identification Number</span>}
          </div>
          <div className="form-group">
            <label className="form-label">PAN Number</label>
            <input className="input" value={form.pan} onChange={set('pan')} placeholder="AAAPL1234C" maxLength={10} style={{ textTransform: 'uppercase' }} />
            {formErrors.pan
              ? <span className="form-error">{formErrors.pan}</span>
              : <span className="form-hint">10-character Permanent Account Number</span>}
          </div>
          <div className="form-group">
            <label className="form-label">TAN Number</label>
            <input className="input" value={form.tan} onChange={set('tan')} placeholder="PDES03028F" maxLength={10} style={{ textTransform: 'uppercase' }} />
            {formErrors.tan
              ? <span className="form-error">{formErrors.tan}</span>
              : <span className="form-hint">10-character Tax Deduction Account Number</span>}
          </div>
          <div className="form-group">
            <label className="form-label">PF Number <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(EPF)</span></label>
            <input className="input" value={form.pfNumber} onChange={set('pfNumber')} placeholder="MH/BAN/0010704/000/0014141" style={{ textTransform: 'uppercase' }} />
            {formErrors.pfNumber
              ? <span className="form-error">{formErrors.pfNumber}</span>
              : <span className="form-hint">EPFO establishment code</span>}
          </div>
          <div className="form-group">
            <label className="form-label">ESI Number</label>
            <input className="input" value={form.esiNumber} onChange={set('esiNumber')} placeholder="31000100120000001" maxLength={17} />
            {formErrors.esiNumber
              ? <span className="form-error">{formErrors.esiNumber}</span>
              : <span className="form-hint">17-digit ESI Employer Code</span>}
          </div>
          <div className="form-group">
            <label className="form-label">LIN Number <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(Labour ID)</span></label>
            <input className="input" value={form.linNumber} onChange={set('linNumber')} placeholder="MHBCD01234ABCD" maxLength={14} style={{ textTransform: 'uppercase' }} />
            {formErrors.linNumber
              ? <span className="form-error">{formErrors.linNumber}</span>
              : <span className="form-hint">14-character Labour Identification Number</span>}
          </div>
        </div>

        {/* ── COMPLIANCE SETTINGS ── */}
        <Section title="Compliance Settings" />
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 16px' }}>
          {(
            [
              { key: 'pfEnabled', label: 'PF Enabled' },
              { key: 'esiEnabled', label: 'ESI Enabled' },
              { key: 'ptEnabled', label: 'PT Enabled' },
              { key: 'lwfEnabled', label: 'LWF Enabled' },
            ] as { key: keyof CompanyForm; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 0' }}>
              <input
                type="checkbox"
                checked={form[key] as boolean}
                onChange={set(key)}
                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem' }}>{label}</span>
            </label>
          ))}
        </div>

        {/* ── COMPANY LOGO ── */}
        <Section title="Company Logo" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Preview */}
          <div style={{ width: 72, height: 72, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {currentLogoUrl ? (
              <img src={currentLogoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>No logo</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {currentLogoUrl && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setLogoFile(null);
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    setLogoPreview(null);
                    setLogoRemove(true);
                  }}
                  disabled={isPending}
                >
                  Remove
                </Button>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              JPEG, PNG, WebP or SVG. Recommended 200×200px.
            </span>
            {logoFile && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
                {logoFile.name} selected
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      </Modal>

      {/* ── Logo lightbox ── */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)', borderRadius: 12, padding: 24,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: '90vw', maxHeight: '90vh',
            }}
          >
            <img
              src={lightboxUrl}
              alt="Company logo"
              style={{ maxWidth: '70vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setLightboxUrl(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Company"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.publicId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      >
        <p>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
        {deleteMutation.isError && (
          <div className="alert alert-danger" style={{ marginTop: 12 }}>
            {getErrorMessage(deleteMutation.error)}
          </div>
        )}
      </Modal>
    </div>
  );
}
