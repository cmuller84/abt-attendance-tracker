/*  src/pages/home.jsx  */
import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import '../styles/styles.css';

/* ---------- helpers inside same file ---------- */
const todayTag = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
};
const saveJSON = (employees, incidents) => {
  const blob = new Blob(
    [JSON.stringify({ employees, incidents }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-backup-${todayTag()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
const exportCSV = (employees, incidents) => {
  const header = 'Employee,Center,Date,Reason,Points\n';
  const rows = incidents
    .map(i => {
      const emp = employees.find(e => e.id === i.employeeId);
      if (!emp) return '';
      return `${emp.first} ${emp.last},${emp.center},${i.date},${i.reason},${i.pts}`;
    })
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-${todayTag()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
/* ---------------------------------------------- */

export default function Home() {
  /* ---------- state ---------- */
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState('');

  /* modal toggles */
  const [showAdd, setShowAdd] = useState(false);
  const [showInc, setShowInc] = useState(false);

  /* form refs */
  const addRef = useRef({ first: '', last: '', center: '' });
  const incRef = useRef({ empId: '', date: '', reason: '', pts: 0 });

  /* preload localStorage */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* persist on change */
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('incidents', JSON.stringify(incidents));
  }, [employees, incidents]);

  /* restore */
  const filePick = useRef(null);
  const handleRestore = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        setEmployees(Array.isArray(d.employees) ? d.employees : []);
        setIncidents(Array.isArray(d.incidents) ? d.incidents : []);
        alert('✅ Backup restored');
      } catch {
        alert('❌ Invalid backup file');
      }
    };
    r.readAsText(f);
  };

  /* derived */
  const alerts = employees.filter(e => e.pts >= 4);
  const visible = employees.filter(e =>
    `${e.first} ${e.last}`.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------- handlers ---------- */
  const addEmployee = () => {
    const { first, last, center } = addRef.current;
    if (!first || !last) return;
    setEmployees(prev => [
      ...prev,
      { id: Date.now(), first, last, center, pts: 0 }
    ]);
    setShowAdd(false);
  };
  const addIncident = () => {
    const { empId, date, reason, pts } = incRef.current;
    if (!empId || !reason) return;
    const id = Date.now();
    setIncidents(prev => [
      ...prev,
      { id, employeeId: Number(empId), date, reason, pts: Number(pts) }
    ]);
    setEmployees(prev =>
      prev.map(e =>
        e.id === Number(empId) ? { ...e, pts: e.pts + Number(pts) } : e
      )
    );
    setShowInc(false);
  };

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
          <button
            className="btn bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setShowAdd(true)}
          >
            Add New Employee
          </button>
          <button
            className="btn bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => setShowInc(true)}
          >
            Record Attendance Issue
          </button>
          <button
            className="btn bg-green-600 text-white hover:bg-green-700"
            onClick={() => exportCSV(employees, incidents)}
          >
            Export to Excel
          </button>
          <button
            className="btn bg-sky-600 text-white hover:bg-sky-700"
            onClick={() => saveJSON(employees, incidents)}
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

        {/* table */}
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
                      <td className="p-2">
                        {emp.first} {emp.last}
                      </td>
                      <td className="p-2">{emp.center}</td>
                      <td className="p-2">{emp.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ---------- Add Employee modal ---------- */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-80 space-y-3">
            <h3 className="font-semibold mb-2">Add New Employee</h3>
            <input
              placeholder="First name"
              className="input border w-full px-3 py-2"
              onChange={e => (addRef.current.first = e.target.value)}
            />
            <input
              placeholder="Last name"
              className="input border w-full px-3 py-2"
              onChange={e => (addRef.current.last = e.target.value)}
            />
            <input
              placeholder="Center"
              className="input border w-full px-3 py-2"
              onChange={e => (addRef.current.center = e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn bg-blue-600 text-white" onClick={addEmployee}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Record Incident modal ---------- */}
      {showInc && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-96 space-y-3">
            <h3 className="font-semibold mb-2">Record Attendance Issue</h3>
            <select
              className="input border w-full px-3 py-2"
              onChange={e => (incRef.current.empId = e.target.value)}
            >
              <option value="">Select employee…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.first} {e.last}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input border w-full px-3 py-2"
              onChange={e => (incRef.current.date = e.target.value)}
            />
            <input
              placeholder="Reason"
              className="input border w-full px-3 py-2"
              onChange={e => (incRef.current.reason = e.target.value)}
            />
            <input
              type="number"
              placeholder="Points"
              className="input border w-full px-3 py-2"
              onChange={e => (incRef.current.pts = e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn" onClick={() => setShowInc(false)}>
                Cancel
              </button>
              <button className="btn bg-indigo-600 text-white" onClick={addIncident}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
