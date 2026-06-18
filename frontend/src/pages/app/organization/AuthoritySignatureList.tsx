import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '@/lib/api/organization.api';
import { employeeApi } from '@/lib/api/employee.api';
import type { AuthoritySignature, CreateAuthoritySignatureDto } from '@/lib/api/organization.api';
import type { Employee } from '@/lib/api/employee.api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

// ── Employee search with debounce ─────────────────────────────────────────────

function useEmployeeSearch(query: string, enabled: boolean) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  return useQuery({
    queryKey: ['emp-search-sig', debounced],
    queryFn: () => employeeApi.list({ search: debounced, limit: '10', status: 'active' }),
    enabled: enabled && debounced.length >= 2,
    staleTime: 30_000,
  });
}

// ── Employee picker ───────────────────────────────────────────────────────────

interface EmployeePickerProps {
  selected: { publicId: string; name: string; code: string } | null;
  onSelect: (emp: Employee) => void;
  onClear: () => void;
  error?: string;
}

function EmployeePicker({ selected, onSelect, onClear, error }: EmployeePickerProps) {
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isFetching } = useEmployeeSearch(inputVal, !selected);

  const results: Employee[] = data?.data ?? [];

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (selected) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        border: '1px solid var(--color-border)', borderRadius: 8,
        padding: '8px 12px', background: 'var(--color-background)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{selected.code}</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1, padding: '2px 4px',
          }}
          title="Clear selection"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className={`input${error ? ' input-error' : ''}`}
        placeholder="Type name, employee code or email to search…"
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />

      {open && inputVal.length >= 2 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {isFetching && (
            <div style={{ padding: '14px 16px', color: 'var(--color-text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 16, height: 16, border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.7s linear infinite',
              }} />
              Searching…
            </div>
          )}
          {!isFetching && results.length === 0 && (
            <div style={{ padding: '14px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              No employees found for "{inputVal}"
            </div>
          )}
          {!isFetching && results.map((emp, idx) => (
            <div
              key={emp.publicId}
              onMouseDown={(e) => { e.preventDefault(); onSelect(emp); setInputVal(''); setOpen(false); }}
              style={{
                padding: '10px 16px', cursor: 'pointer',
                borderBottom: idx < results.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              <div style={{ fontWeight: 500, fontSize: 14 }}>{emp.firstName} {emp.lastName}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {emp.employeeCode}{emp.workEmail ? ` · ${emp.workEmail}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && inputVal.length < 2 && inputVal.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)',
        }}>
          Type at least 2 characters to search
        </div>
      )}
    </div>
  );
}

// ── Styled file upload zone ───────────────────────────────────────────────────

interface FileUploadZoneProps {
  file: File | null;
  preview: string | null;
  existingUrl?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
  error?: string;
}

function FileUploadZone({ file, preview, existingUrl, onChange, required, error }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('image/')) onChange(dropped);
  };

  const displayUrl = preview ?? existingUrl;
  const isExisting = !preview && !!existingUrl;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {displayUrl ? (
        <div style={{
          border: `2px solid var(--color-border)`,
          borderRadius: 10, padding: 16, background: 'var(--color-background)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <img
            src={displayUrl}
            alt="Signature preview"
            style={{ height: 60, maxWidth: 180, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 6, border: '1px solid var(--color-border)' }}
          />
          <div style={{ flex: 1 }}>
            {isExisting ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Current signature image</div>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 500 }}>{file?.name}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Saved'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 6,
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                cursor: 'pointer', color: 'var(--color-text-primary)',
              }}
            >
              Replace
            </button>
            {file && (
              <button
                type="button"
                onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
                style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 6,
                  border: '1px solid var(--color-danger)', background: 'transparent',
                  cursor: 'pointer', color: 'var(--color-danger)',
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${error ? 'var(--color-danger)' : dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 10,
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'var(--color-background)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--color-text-secondary)' }}>🖼</div>
          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Click to choose file{' '}
            <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>or drag & drop</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            PNG, JPEG or WebP · transparent background recommended · max 5 MB
          </div>
        </div>
      )}

      {required && !displayUrl && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>
          * Required for new signatures
        </p>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface SigForm {
  employeePublicId: string;
  employeeName: string;
  employeeCode: string;
  designationId: string;
}

interface SigFormErrors {
  employeePublicId?: string;
  signatureFile?: string;
}

const EMPTY_FORM: SigForm = { employeePublicId: '', employeeName: '', employeeCode: '', designationId: '' };

export default function AuthoritySignatureList() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuthoritySignature | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthoritySignature | null>(null);
  const [lightboxSig, setLightboxSig] = useState<AuthoritySignature | null>(null);

  const [form, setForm] = useState<SigForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<SigFormErrors>({});
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<{ publicId: string; name: string; code: string } | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['authority-signatures'],
    queryFn: () => organizationApi.listAuthoritySignatures(),
  });
  const signatures = data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (dto: CreateAuthoritySignatureDto) => organizationApi.createAuthoritySignature(dto),
    onSuccess: async (created) => {
      if (signatureFile) {
        try {
          await organizationApi.uploadAuthoritySignatureImage(created.publicId, signatureFile);
        } catch {
          // record created; image upload failed — user can re-upload via edit
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['authority-signatures'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ publicId, dto }: { publicId: string; dto: Partial<CreateAuthoritySignatureDto> }) => {
      const updated = await organizationApi.updateAuthoritySignature(publicId, dto);
      if (signatureFile) {
        return organizationApi.uploadAuthoritySignatureImage(publicId, signatureFile);
      }
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['authority-signatures'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => organizationApi.deleteAuthoritySignature(publicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['authority-signatures'] });
      setDeleteTarget(null);
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    createMutation.reset();
    updateMutation.reset();
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSignatureFile(null);
    setSignaturePreview(null);
    setSelectedEmployee(null);
    setModalOpen(true);
  };

  const openEdit = (sig: AuthoritySignature) => {
    createMutation.reset();
    updateMutation.reset();
    setEditTarget(sig);
    setForm({
      employeePublicId: sig.employeePublicId,
      employeeName: sig.employeeName,
      employeeCode: sig.employeeCode,
      designationId: '',
    });
    setFormErrors({});
    setSignatureFile(null);
    setSignaturePreview(null);
    setSelectedEmployee({ publicId: sig.employeePublicId, name: sig.employeeName, code: sig.employeeCode });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSignatureFile(null);
    setSignaturePreview(null);
    setSelectedEmployee(null);
  };

  const handleEmployeeSelect = (emp: Employee) => {
    const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
    setSelectedEmployee({ publicId: emp.publicId, name: name || emp.employeeCode, code: emp.employeeCode });
    setForm((f) => ({
      ...f,
      employeePublicId: emp.publicId,
      employeeName: name || emp.employeeCode,
      employeeCode: emp.employeeCode,
      designationId: emp.designationId ?? '',
    }));
    setFormErrors((er) => ({ ...er, employeePublicId: undefined }));
  };

  const handleEmployeeClear = () => {
    setSelectedEmployee(null);
    setForm((f) => ({ ...f, employeePublicId: '', employeeName: '', employeeCode: '', designationId: '' }));
  };

  const handleFileChange = (file: File | null) => {
    setSignatureFile(file);
    setFormErrors((er) => ({ ...er, signatureFile: undefined }));
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSignaturePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setSignaturePreview(null);
    }
  };

  const validate = () => {
    const errs: SigFormErrors = {};
    if (!form.employeePublicId) errs.employeePublicId = 'Please select an employee';
    if (!editTarget && !signatureFile) errs.signatureFile = 'Please upload a signature image';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ publicId: editTarget.publicId, dto: {} });
    } else {
      createMutation.mutate({
        employeePublicId: form.employeePublicId,
        employeeName: form.employeeName,
        employeeCode: form.employeeCode,
        designationId: form.designationId || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Authority Signatures</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4, fontSize: 14 }}>
            Manage authorised signatory signatures used in letters and documents.
            Each employee can have only one active signature.
          </p>
        </div>
        <div className="page-actions">
          <Button onClick={openAdd}>+ Add Signature</Button>
        </div>
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}><Skeleton height={64} /></div>
          ))}
        </div>
      )}

      {isError && (
        <div className="alert alert-danger">{getErrorMessage(error, 'Failed to load authority signatures.')}</div>
      )}

      {!isLoading && !isError && signatures.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
          <h3 style={{ marginBottom: 8, color: 'var(--color-text-primary)' }}>No authority signatures yet</h3>
          <p style={{ marginBottom: 24 }}>
            Add signatures for authorised personnel to use in generated documents and letters.
          </p>
          <Button onClick={openAdd}>+ Add First Signature</Button>
        </div>
      )}

      {!isLoading && !isError && signatures.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Signature</th>
                <th>Name</th>
                <th>Employee Code</th>
                <th>Designation</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {signatures.map((sig) => (
                <tr key={sig.publicId}>
                  <td>
                    {sig.signatureUrl ? (
                      <img
                        src={sig.signatureUrl}
                        alt={`${sig.employeeName} signature`}
                        onClick={() => setLightboxSig(sig)}
                        style={{ height: 48, maxWidth: 140, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: 4, padding: 4, background: '#fff', cursor: 'pointer' }}
                      />
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>No image</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{sig.employeeName}</td>
                  <td><code>{sig.employeeCode}</code></td>
                  <td>{sig.designationName ?? <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}</td>
                  <td>
                    <Badge variant={sig.isActive ? 'success' : 'default'}>
                      {sig.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-sm"
                        style={{
                          padding: '4px 12px', fontSize: 13, borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-primary)', cursor: 'pointer',
                        }}
                        onClick={() => openEdit(sig)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{
                          padding: '4px 12px', fontSize: 13, borderRadius: 6,
                          border: '1px solid var(--color-danger)',
                          background: 'transparent',
                          color: 'var(--color-danger)', cursor: 'pointer',
                        }}
                        onClick={() => setDeleteTarget(sig)}
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
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Authority Signature' : 'Add Authority Signature'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        {mutationError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>{getErrorMessage(mutationError)}</div>
        )}

        {/* Employee picker */}
        <div className="form-group">
          <label className="form-label">Employee *</label>
          {editTarget ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              border: '1px solid var(--color-border)', borderRadius: 8,
              padding: '10px 14px', background: 'var(--color-background)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{form.employeeName}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{form.employeeCode}</div>
              </div>
              <span style={{ marginLeft: 'auto' }}><Badge variant="default">Locked</Badge></span>
            </div>
          ) : (
            <EmployeePicker
              selected={selectedEmployee}
              onSelect={handleEmployeeSelect}
              onClear={handleEmployeeClear}
              error={formErrors.employeePublicId}
            />
          )}
          {!editTarget && formErrors.employeePublicId && (
            <span className="form-error">{formErrors.employeePublicId}</span>
          )}
          {!editTarget && (
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Only one active signature is allowed per employee.
            </p>
          )}
        </div>

        {/* Signature image upload */}
        <div className="form-group">
          <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
            Signature Image{' '}
            {!editTarget
              ? <span style={{ color: 'var(--color-danger)' }}>*</span>
              : <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: 13 }}>(leave blank to keep existing)</span>
            }
          </label>
          <FileUploadZone
            file={signatureFile}
            preview={signaturePreview}
            existingUrl={editTarget?.signatureUrl}
            onChange={handleFileChange}
            required={!editTarget}
            error={formErrors.signatureFile}
          />
        </div>
      </Modal>

      {/* ── Image lightbox ──────────────────────────────────────────────── */}
      {lightboxSig?.signatureUrl && (
        <div
          onClick={() => setLightboxSig(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              maxWidth: '80vw', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            }}
          >
            <img
              src={lightboxSig.signatureUrl}
              alt={`${lightboxSig.employeeName} signature`}
              style={{ maxWidth: '70vw', maxHeight: '60vh', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{lightboxSig.employeeName}</div>
              {lightboxSig.designationName && (
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{lightboxSig.designationName}</div>
              )}
            </div>
            <button
              onClick={() => setLightboxSig(null)}
              style={{
                padding: '6px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f8fafc', cursor: 'pointer', fontSize: 13,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Authority Signature"
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
          Soft-delete the authority signature for <strong>{deleteTarget?.employeeName}</strong>?
          The record will be deactivated and hidden from this list.
          You can add a new one for the same employee after deletion.
        </p>
      </Modal>
    </div>
  );
}
