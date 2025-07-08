import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';                 // keep whatever icons you already use
import './styles.css';                                // keep your own CSS

/* ---------------------- Types ---------------------- */
interface TimeEntry {
  id: number;
  startTime: string;
  endTime: string;
  duration: number;           // minutes
  category: string;
  client: string;
  description: string;
}

/* -------------------- Helpers ---------------------- */
const minsBetween = (s: string, e: string) =>
  (!s || !e)
    ? 0
    : (new Date(`2000-01-01T${e}`).getTime() -
       new Date(`2000-01-01T${s}`).getTime()) / 60000;

/* ------------------- Main App ---------------------- */
function App() {
  /* ---------- state ---------- */
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);
  // ...any other state you already had (alerts, filters, etc.)

  /* ---------- backup / restore ---------- */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const downloadBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ employees, incidents }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(String(evt.target?.result));
        setEmployees(data.employees ?? []);
        setIncidents(data.incidents ?? []);
        alert(
          `Restored ${data.employees?.length ?? 0} employees and ` +
          `${data.incidents?.length ?? 0} incidents`
        );
      } catch (err) {
        console.error(err);
        alert('❌  Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  /* ---------- render ---------- */
  return (
    <div className="app-container">
      {/* ---------- header ---------- */}
      <header className="app-header">
        <h1>
          <Clock size={18} style={{ marginRight: 6 }} />
          ABT Attendance Tracker v4.3
        </h1>

        <div className="header-actions">
          <button className="btn-link" onClick={downloadBackup}>
            Download backup
          </button>
          <button className="btn-link" onClick={handleRestoreClick}>
            Restore backup
          </button>
          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      {/* ---------- rest of your existing UI ---------- */}
      {/* alerts list, employee table, modals, etc. */}
      {/* make sure any state setters point to employees / incidents above */}

      {/* ---------- footer ---------- */}
      <footer className="app-footer">
        <button className="btn-sm" onClick={downloadBackup}>Backup</button>
        <button className="btn-sm" onClick={handleRestoreClick}>Restore</button>
      </footer>
    </div>
  );
}

export default App;
