import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import './styles/styles.css';   // keep your CSS

/* ---------- Helpers ---------- */
const todayStamp = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
};

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);

  /* load any saved data */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* Backup / Restore */
  const filePicker = useRef(null);

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

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
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
      {/* Toolbar */}
      <header className="flex items-center justify-between gap-4 p-3 bg-slate-200 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Clock size={18} /> ABT Attendance Tracker <span className="text-xs">v4.3</span>
        </h1>

        <div className="flex items-center gap-2">
          <button
            className="rounded bg-sky-600 px-3 py-1 text-white"
            onClick={downloadBackup}
          >
            Backup ⭱
          </button>
          <button
            className="rounded bg-emerald-600 px-3 py-1 text-white"
            onClick={handleRestoreClick}
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

      {/* your existing UI goes here */}
      <main className="flex-grow p-6 text-sm text-gray-500">
        Import a backup JSON to populate employees and incidents.
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-2 bg-slate-100 text-xs text-gray-600">
        <span>© {new Date().getFullYear()} ABT</span>
        <span>{employees.length} employees • {incidents.length} incidents</span>
      </footer>
    </div>
  );
}
