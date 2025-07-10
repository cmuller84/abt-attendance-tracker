/*  src/pages/home.jsx  */
import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import '../styles/styles.css';          // your Tailwind css

export default function Home() {
  /* ---------- state ---------- */
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch]       = useState('');

  /* ---------- preload localStorage ---------- */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* ---------- backup / restore ---------- */
  const filePick = useRef(null);

  /** download JSON backup */
  const handleBackup = () => {
    const d   = new Date();
    const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const blob = new Blob(
      [JSON.stringify({ employees, incidents }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `attendance-backup-${tag}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** restore from JSON backup */
  const handleRestore = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d   = JSON.parse(ev.target.result);
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

  /* ---------- derived values ---------- */
  const alerts   = employees.filter(e => e.pts >= 4);
  const visible  = employees.filter(e =>
    `${e.first} ${e.last}`.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6">
      {/* header */}
      <header className="text-center mb-6">
        <Clock size={22} className="inline-block mr-2" />
        <h1 className="text-2xl font-bold">ABT Center Attendance Tracker</h1>
      </header>

      <div className="w-full max-w-6xl space-y-6">
        {/* alerts */}
        <section className="border border-orange-200 bg-orange-50 rounded p-4 shadow">
          <h2 className="font-semibold text-orange-600 mb-2">
            ⚠️ Alerts Requiring Action ({alerts.length})
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-600">No alerts at this time</p>
          ) : (
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {alerts.map(a => (
                <li key={a.id}>
                  {a.first} {a.last} • {a.pts} pts
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* toolbar */}
        <div className="flex flex-wrap gap-2 items-start">
          <button className="btn bg-blue-600 text-white hover:bg-blue-700">
            Add New Employee
          </button>
          <button className="btn bg-indigo-600 text-white hover:bg-indigo-700">
            Record Attendance Issue
          </button>
          <button className="btn bg-green-600 text-white hover:bg-green-700">
            Export to Excel
          </button>

          <button
            className="btn bg-sky-600 text-white hover:bg-sky-700"
            onClick={handleBackup}
          >
            Backup ⭱
          </button>
          <button
            className="btn bg-yellow-500 text-white hover:bg-yellow-600"
            onClick={() => filePick.current?.click()}
          >
            Restore ⭳
          </button>
          <input
            ref={filePick}
            type="file"
            accept="application/json"
            onChange={handleRestore}
            style={{ display: 'none' }}
          />

          <input
            type="text"
            placeholder="Search employees…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input border border-gray-300 rounded px-3 py-2 flex-grow md:w-64"
          />
        </div>

        {/* employee table */}
        <section className="border border-gray-300 bg-white rounded p-4 shadow">
          <h2 className="font-semibold text-gray-800 mb-3">
            Employee Attendance Records
          </h2>

          {employees.length === 0 ? (
            <p className="text-sm text-gray-600">
              No employees added yet. Add your first employee to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Center</th>
                    <th className="p-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(emp => (
                    <tr key={emp.id} className="border-t">
                      <td className="p-2">{emp.first} {emp.last}</td>
                      <td className="p-2">{emp.center}</td>
                      <td className="p-2">{emp.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* policy */}
        <section className="border border-blue-100 bg-blue-50 rounded p-4 text-sm shadow">
          <h3 className="font-semibold text-blue-600 mb-2">
            ABT Attendance Policy Reference
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-1">
              <li>• Unnotified Absence: 10 pts</li>
              <li>• Late Arrival: 2 pts</li>
              <li>• Early Departure: 2 pts</li>
              <li>• Planned Absence: 4 pts</li>
              <li>• Unexpected Illness: 4 pts</li>
            </ul>
            <ul className="space-y-1">
              <li>• 4-7 pts: Verbal Warning</li>
              <li>• 8-11 pts: Written Warning</li>
              <li>• 12-14 pts: Final Warning (PIP)</li>
              <li>• 15+ pts: Termination</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
