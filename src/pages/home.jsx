/*  src/pages/home.jsx  */

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import '../styles/styles.css';

/* helpers */
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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `attendance-backup-${todayStamp()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* component */
export default function Home() {
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);

  /* load any saved state */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* restore logic */
  const filePicker = useRef(null);
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* header */}
      <div className="text-center mb-6">
        <Clock size={22} className="inline-block mr-2" />
        <span className="text-2xl font-bold">ABT Center Attendance Tracker</span>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* original buttons */}
        <button className="btn btn-primary">Add New Employee</button>
        <button className="btn btn-secondary">Record Attendance Issue</button>
        <button className="btn btn-success">Export to Excel</button>

        {/* new buttons */}
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

        {/* existing search box */}
        <input
          type="text"
          placeholder="Search employees..."
          className="input input-bordered flex-grow md:flex-grow-0 md:w-64"
        />
      </div>

      {/* ---- rest of your existing UI stays untouched ---- */}
    </div>
  );
}
