import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, type Shift } from '@/lib/api/attendance.api';
import { employeeApi } from '@/lib/api/employee.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

interface ShiftForm {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  graceMinutes: string;
  isNightShift: boolean;
  isActive: boolean;
}

const EMPTY_FORM: ShiftForm = {
  name: '',
  code: '',
  startTime: '09:00',
  endTime: '18:00',
  graceMinutes: '10',
  isNightShift: false,
  isActive: true,
};

export default function ShiftList() {
  const qc = useQueryClient();
  const [open, setOpen]         = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<ShiftForm>(EMPTY_FORM);
  const [assignShiftId, setAssignShiftId] = useState<string | null>(null);
  const [assignEmployees, setAssignEmployees] = useState<string[]>([]);
  const [assignFrom, setAssignFrom] = useState('');

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => attendanceApi.listShifts(),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const dto = {
        name: form.name,
        code: form.code,
        startTime: form.startTime,
        endTime: form.endTime,
        graceMinutesIn: Number(form.graceMinutes),
        isNightShift: form.isNightShift,
        isActive: form.isActive,
      };
      return editId
        ? attendanceApi.updateShift(editId, dto)
        : attendanceApi.createShift(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditId(null);
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditId(shift.publicId);
    setForm({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: String(shift.graceMinutesIn ?? 10),
      isNightShift: shift.isNightShift,
      isActive: shift.isActive,
    });
    setOpen(true);
  };

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeApi.list({ limit: '200', status: 'active' }),
    enabled: !!assignShiftId,
  });
  const employees = employeesData?.data ?? [];

  const assignMutation = useMutation({
    mutationFn: () => attendanceApi.assignShift(assignShiftId!, {
      employeeIds: assignEmployees,
      effectiveFrom: new Date(assignFrom).toISOString(),
    }),
    onSuccess: () => { setAssignShiftId(null); setAssignEmployees([]); setAssignFrom(''); },
  });

  const set = (k: keyof ShiftForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const toggleEmployee = (empId: string) =>
    setAssignEmployees(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shifts</h1>
          <p className="page-subtitle">Define working shifts and time windows</p>
        </div>
        <Button onClick={openCreate}>+ Add Shift</Button>
      </div>

      {isLoading ? (
        <Skeleton height={240} />
      ) : !shifts?.length ? (
        <SetupGuide content={SETUP['shifts']} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Start</th>
                <th>End</th>
                <th>Grace (min)</th>
                <th>Night Shift</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => (
                <tr key={shift.publicId}>
                  <td style={{ fontWeight: 600 }}>{shift.name}</td>
                  <td><code style={{ fontSize: '0.8125rem' }}>{shift.code}</code></td>
                  <td>{shift.startTime}</td>
                  <td>{shift.endTime}</td>
                  <td>{shift.graceMinutesIn ?? 10}</td>
                  <td>{shift.isNightShift ? <Badge variant="info">Night</Badge> : '—'}</td>
                  <td>
                    <Badge variant={shift.isActive ? 'success' : 'default'}>
                      {shift.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(shift)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setAssignShiftId(shift.publicId)}>Assign</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shift Assignment Modal */}
      <Modal
        open={!!assignShiftId}
        onClose={() => setAssignShiftId(null)}
        title="Assign Shift to Employees"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setAssignShiftId(null)}>Cancel</Button>
            <Button loading={assignMutation.isPending} disabled={!assignEmployees.length || !assignFrom} onClick={() => assignMutation.mutate()}>
              Assign
            </Button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Effective From *</label>
          <input type="date" className="input" value={assignFrom} onChange={e => setAssignFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Select Employees *</label>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8, padding: 8 }}>
            {employees.map(emp => (
              <label key={emp.publicId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={assignEmployees.includes(emp.publicId)} onChange={() => toggleEmployee(emp.publicId)} style={{ accentColor: 'var(--color-primary)' }} />
                {emp.employeeCode}
              </label>
            ))}
          </div>
          <span className="form-hint">{assignEmployees.length} selected</span>
        </div>
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Edit Shift' : 'Add Shift'}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} disabled={!form.name || !form.code} onClick={() => saveMutation.mutate()}>
              {editId ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        {saveMutation.isError && (
          <div className="alert alert-danger">{getErrorMessage(saveMutation.error)}</div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Morning Shift" />
          </div>
          <div className="form-group">
            <label className="form-label">Code *</label>
            <input className="input" value={form.code} onChange={set('code')} placeholder="e.g. MORN" />
          </div>
          <div className="form-group">
            <label className="form-label">Start Time *</label>
            <input type="time" className="input" value={form.startTime} onChange={set('startTime')} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time *</label>
            <input type="time" className="input" value={form.endTime} onChange={set('endTime')} />
          </div>
          <div className="form-group">
            <label className="form-label">Grace Period (minutes)</label>
            <input type="number" className="input" value={form.graceMinutes} onChange={set('graceMinutes')} min={0} max={60} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.isNightShift} onChange={set('isNightShift')} style={{ accentColor: 'var(--color-primary)' }} />
            Night Shift
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} style={{ accentColor: 'var(--color-primary)' }} />
            Active
          </label>
        </div>
      </Modal>
    </div>
  );
}
