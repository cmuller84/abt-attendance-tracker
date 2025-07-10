import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import '../styles/styles.css';

/* helpers */
const stamp = () => {
  const d = new Date();
  return d.getFullYear()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0');
};

const saveJSON = (emp, inc) => {
  const blob = new Blob([JSON.stringify({ employees: emp, incidents: inc }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-backup-${stamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Home() {
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);

  /* preload any previous restore */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  const filePick = useRef(null);
  const restore = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        const emp = Array.isArray(d.employees) ? d.employees : [];
        const inc = Array.isArray(d.incidents) ? d.incidents : [];
        setEmployees(emp);
        setIncidents(inc);
        localStorage.setItem('employees', JSON.stringify(emp));
        localStorage.setItem('incidents', JSON.stringify(inc));
        alert('✅ Backup restored');
      } catch { alert('❌ Invalid backup file'); }
    };
    r.readAsText(f);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <Clock size={22} className="inline-block mr-2" />
        <span className="text-2xl font-bold">ABT Center Attendance Tracker</span>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button className="btn btn-primary">Add New Employee</button>
        <button className="btn btn-secondary">Record Attendance Issue</button>
        <button className="btn btn-success">Export to Excel</button>

        {/* new */}
        <button className="btn btn-info" onClick={() => saveJSON(employees, incidents)}>Backup ⭱</button>
        <button className="btn btn-warning" onClick={() => filePick.current?.click()}>Restore ⭳</button>
        <input ref={filePick} type="file" accept="application/json" onChange={restore} style={{ display: 'none' }} />

        <input type="text" placeholder="Search employees…" className="input input-bordered flex-grow md:w-64" />
      </div>

      {/* rest of your existing layout stays here */}
    </div>
  );
}
