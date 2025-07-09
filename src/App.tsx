import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Clock } from 'lucide-react';
import './styles/styles.css';

/* ---------- Types ---------- */
export interface Employee {
  id: number;
  first: string;
  last: string;
  center: string;
  pts: number;
}
export interface Incident {
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

/* ---------- Component ---------- */
export default function App() {
  /* state (your original two hooks) */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  /* preload from localStorage once */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* Backup / Restore */
  const filePicker = useRef<HTMLInputElement | null>(null);

  const downloadBackup = () => {
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

  const handleRestoreClick = () => filePicker.current?.click();

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
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      {/* Header / toolbar – keeps your original buttons and adds two new ones */}
      <header className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <Clock size={20} />
          <h1 className="text-xl font-bold">ABT Center Attendance Tracker</h1>
        </div>
        <p className="text-sm text-gray-600">
          Track attendance points for staff members according to ABT Attendance Policy
        </p>

        {/* ORIGINAL toolbar buttons */}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary">Add New Employee</button>
          <button className="btn btn-secondary">Record Attendance Issue</button>
          <button className="btn btn-success">Export to Excel</button>

          {/* NEW buttons */}
          <button
            className="btn btn-info"
            onClick={downloadBackup}
            title="Download current data"
          >
            Backup ⭱
          </button>
          <button
            className="btn btn-warning"
            onClick={handleRestoreClick}
            title="Upload a backup JSON"
          >
            Restore ⭳
          </button>

          {/* hidden file input */}
          <input
            ref={filePicker}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      {/* ----- the rest of your original UI (alerts, tables, etc.) ----- */}
      <main className="flex-grow p-6">
        {/* existing components remain untouched */}
      </main>

      {/* simple footer */}
      <footer className="px-4 py-2 bg-slate-100 text-xs text-gray-600 flex justify-between">
        <span>© {new Date().getFullYear()} ABT</span>
        <span>{employees.length} employees • {incidents.length} incidents</span>
      </footer>
    </div>
  );
}
