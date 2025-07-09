import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Clock } from 'lucide-react';
import './styles/styles.css';

/* ---------- Types ---------- */
interface Employee {
  id: number;
  first: string;
  last: string;
  center: string;
  pts: number;
}
interface Incident {
  id: number;
  employeeId: number;
  date: string;
  reason: string;
  pts: number;
}

/* ---------- Helpers ---------- */
const todayStamp = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
};

const downloadBackup = (employees: Employee[], incidents: Incident[]) => {
  const blob = new Blob(
    [JSON.stringify({ employees, incidents }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-backup-${todayStamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------- Component ---------- */
export default function App() {
  /* original state */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  /* preload any saved data */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* Restore logic */
  const filePicker = useRef<HTMLInputElement | null>(null);

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(String(ev.target?.result));
        const emp = Array.isArray(data.employees) ? data.employees : [];
        const inc = Array.isArray(data.incidents) ? data.incidents : [];
        setEmployees(emp);
        setIncidents(inc);
        localStorage.setItem('employees', JSON.stringify(emp));
        localStorage.setItem('incidents', JSON.stringify(inc));
        alert('✅ Backup restored');
      } catch {
        alert('❌ Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  /* ---------- UI ---------- */
  return (
    <div className="container mx-auto px-4 py-6">
      {/* logo + title */}
      <div className="text-center mb-6">
        <Clock size={22} className="inline-block mr-2" />
        <span className="text-2xl font-bold">ABT Center Attendance Tracker</span>
      </div>

      {/* alerts banner – unchanged */}
      {/* ... your existing alerts component here ... */}

      {/* TOOLBAR (Add / Record / Export) + new Backup/Restore */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button className="btn btn-primary">Add New Employee</button>
        <button className="btn btn-secondary">Record Attendance Issue</button>
        <button className="btn btn-success">Export to Excel</button>

        {/* NEW buttons */}
        <button
          className="btn btn-info"
          onClick={() => downloadBackup(employees, incidents)}
        >
          Backup ⭱
        </button>
        <button
          className="btn btn-warning"
          onClick={() => filePicker.current?.click()}
        >
          Restore ⭳
        </button>

        {/* hidden file-picker */}
        <input
          ref={filePicker}
          type="file"
          accept="application/json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />

        {/* existing search box */}
        <input
          type="text"
          placeholder="Search employees..."
          className="input input-bordered flex-grow md:flex-grow-0 md:w-64"
        />
      </div>

      {/* ----- everything below is your original content ----- */}
      {/* employee table, policy reference, modals, etc. stay untouched */}
    </div>
  );
}
