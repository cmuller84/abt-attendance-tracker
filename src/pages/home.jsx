import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import './styles/styles.css';            // keep your CSS

/* ---------- Helpers ---------- */
const todayStamp = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
};

const downloadBackup = (employees, incidents) => {
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
export default function Home() {
  /* ORIGINAL state */
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);

  /* Pre-load anything saved earlier */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* ---------- Restore handler ---------- */
  const filePicker = useRef(null);

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
    <div className="page-wrapper">
      {/* header / hero */}
      <div className="text-center my-6">
        <Clock size={22} className="inline-block mr-2" />
        <span className="text-2xl font-bold">ABT Center Attendance Tracker</span>
      </div>

      {/* TOOLBAR – original buttons + two new ones */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* original three buttons */}
        <button className="btn btn-primary">Add New Employee</button>
        <button className="btn btn-secondary">Record Attendance Issue</button>
        <button className="btn btn-success">Export to Excel</button>

        {/* NEW Backup / Restore */}
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

        {/* hidden file input */}
        <input
          ref={filePicker}
          type="file"
          accept="application/json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>

      {/* ---------- the rest of your existing UI ---------- */}
      {/* Alerts, tables, modals, search bar … all unchanged */}
    </div>
  );
}
