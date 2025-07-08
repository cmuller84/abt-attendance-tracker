import { useState, useRef, ChangeEvent } from 'react';
import { Clock } from 'lucide-react';
import './styles.css'; // keep your existing styles

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

/* ---------- Main ---------- */
export default function App() {
  // core state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  /* ----- Backup / Restore ----- */
  const filePicker = useRef<HTMLInputElement | null>(null);

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

  const handleRestoreClick = () => filePicker.current?.click();

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(String(ev.target?.result));
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
        alert('✅  Backup restored');
      } catch (err) {
        console.error(err);
        alert('❌  Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  /* ---------- UI ---------- */
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>
          <Clock size={18} style={{ marginRight: 6 }} />
          ABT Attendance Tracker v4.3
        </h1>

        <nav>
          <button className="btn-link" onClick={downloadBackup}>
            Download backup
          </button>
          <button className="btn-link" onClick={handleRestoreClick}>
            Restore backup
          </button>
          <input
            ref={filePicker}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </nav>
      </header>

      {/* TODO: the rest of your tracker UI (alerts, tables, modals, etc.) */}

      {/* Footer shortcuts */}
      <footer className="app-footer">
        <button className="btn-sm" onClick={downloadBackup}>Backup</button>
        <button className="btn-sm" onClick={handleRestoreClick}>Restore</button>
      </footer>
    </div>
  );
}
