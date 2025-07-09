import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Clock } from 'lucide-react';
import './styles/styles.css';   // keep your existing CSS

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
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

/* ---------- Component ---------- */
export default function App() {
  /* state */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  /* preload from localStorage */
  useEffect(() => {
    const storedEmp = JSON.parse(localStorage.getItem('employees') ?? '[]');
    const storedInc = JSON.parse(localStorage.getItem('incidents') ?? '[]');
    if (storedEmp.length) setEmployees(storedEmp);
    if (storedInc.length) setIncidents(storedInc);
  }, []);

  /* Backup / Restore logic */
  const filePicker = useRef<HTMLInputElement | null>(null);

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify({ employees, incidents }, null, 2)], {
      type: 'application/json',
    });
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
        const empList = Array.isArray(data.employees) ? data.employees : [];
        const incList = Array.isArray(data.incidents) ? data.incidents : [];
        setEmployees(empList);
        setIncidents(incList);
        localStorage.setItem('employees', JSON.stringify(empList));
        localStorage.setItem('incidents', JSON.stringify(incList));
        alert('✅ Backup restored');
      } catch (err) {
        console.error(err);
        alert('❌ Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      {/* Toolbar */}
      <header className="flex items-center justify-between gap-4 p-3 bg-slate-200 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Clock size={18} />
          ABT Attendance Tracker <span className="text-xs">v4.3</span>
        </h1>

        <div className="flex items-center gap-2">
          <button
            className="rounded bg-sky-600 px-3 py-1 text-white hover:bg-sky-700 transition-colors"
            onClick={downloadBackup}
          >
            Backup ⭱
          </button>
          <button
            className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700 transition-colors"
            onClick={handleRestoreClick}
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
        </div>
      </header>

      {/* TODO: place your existing tables / alerts here */}
      <main className="flex-grow p-6">
        <p className="text-sm text-gray-500">
          Import a backup JSON to populate employees and incidents.
        </p>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-2 bg-slate-100 text-xs text-gray-600">
        <span>© {new Date().getFullYear()} ABT</span>
        <span>
          {employees.length} employees • {incidents.length} incidents
        </span>
      </footer>
    </div>
  );
}
