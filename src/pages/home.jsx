/*  src/pages/home.jsx  */
import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import '../styles/styles.css';                // keep your Tailwind sheet

/* ---------- Types (plain JS) ---------- */
const blankEmployee = { id: 0, first: '', last: '', center: '', pts: 0 };
const blankIncident = { id: 0, employeeId: 0, date: '', reason: '', pts: 0 };

/* ---------- Backup helpers ---------- */
const stamp = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
};
const downloadBackup = (emp, inc) => {
  const blob = new Blob(
    [JSON.stringify({ employees: emp, incidents: inc }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-backup-${stamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Home() {
  /* ---------- State ---------- */
  const [employees, setEmployees] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState('');

  /* load any saved data once */
  useEffect(() => {
    setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
    setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
  }, []);

  /* ---------- Restore handler ---------- */
  const filePicker = useRef(null);
  const handleImport = (e) => {
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
      } catch {
        alert('❌ Invalid backup file');
      }
    };
    r.readAsText(f);
  };

  /* ---------- Derived lists ---------- */
  const filtered = employees.filter((e) =>
    `${e.first} ${e.last}`.toLowerCase().includes(search.toLowerCase())
  );

  const alerts = employees.filter((e) => e.pts >= 4); // sample logic

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6">
      {/* logo & title */}
      <header className="text-center mb-6">
        <Clock size={22} className="inline-block mr-2" />
        <h1 className="text-2xl font-bold">ABT Center Attendance Tracker</h1>
      </header>

      {/* outer card */}
      <div className="w-full max-w-6xl space-y-6">

        {/* Alerts panel */}
        <section className="border border-orange-200 bg-orange-50 rounded p-4 shadow">
          <h2 className="font-semibold text-orange-500 mb-2">
            ⚠️ Alerts Requiring Action ({alerts.length})
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-600">No alerts at this time</p>
          ) : (
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {alerts.map((emp) => (
                <li key={emp.id}>
                  {emp.first} {emp.last} • {emp.pts} pts
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Toolbar */}
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

          {/* NEW buttons */}
          <button
            className="btn bg-sky-600 text-white hover:bg-sky-700"
            onClick={() => downloadBackup(employees, incidents)}
          >
            Backup ⭱
          </button>
          <button
            className="btn bg-yellow-500 text-white hover:bg-yellow-600"
            onClick={() => filePicker.current?.click()}
          >
            Restore ⭳
          </button>
          <input
            ref={filePicker}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />

          {/* Search */}
          <input
            type="text"
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input border border-gray-300 rounded px-3 py-2 flex-grow md:w-64"
          />
        </div>

        {/* Employee table */}
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
                  {filtered.map((emp) => (
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

        {/* Policy reference */}
        <section className="border border-blue-100 bg-blue-50 rounded p-4 text-sm shadow">
          <h3 className="font-semibold text-blue-600 mb-2">
            ABT Attendance Policy Reference
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-1">
              <li>• Unnotified Absence: <strong>10 points</strong></li>
              <li>• Late Arrival: <strong>2 points</strong></li>
              <li>• Early Departure: <strong>2 points</strong></li>
              <li>• Planned Absence: <strong>4 points</strong></li>
              <li>• Unexpected Illness / Emergency: <strong>4 points</strong></li>
            </ul>
            <ul className="space-y-1">
              <li>• 4-7 pts: <strong>Verbal Warning</strong></li>
              <li>• 8-11 pts: <strong>Written Warning</strong></li>
              <li>• 12-14 pts: <strong>Final Warning (PIP)</strong></li>
              <li>• 15+ pts: <strong>Termination</strong></li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
