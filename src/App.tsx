import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Clock } from 'lucide-react';
import './styles/styles.css';

/* ---------- Types ---------- */
interface Employee {
  id: number;
  first: string;
  last: string;
  center: string;
  title: string;
  pts: number;
}
interface Incident {
  id: number;
  employeeId: number;
  date: string;
  reason: string;
  pts: number;
  notes?: string;
}

/* ---------- Helpers ---------- */
const todayStamp = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
};

const downloadBackup = (employees: Employee[], incidents: Incident[]) => {
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

const exportCSV = (employees: Employee[], incidents: Incident[]) => {
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
  a.download = `attendance-${todayStamp()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------- Component ---------- */
export default function App() {
  /* state */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [search, setSearch] = useState('');

  /* modal toggles */
  const [showAdd, setShowAdd] = useState(false);
  const [showInc, setShowInc] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  /* form refs */
  const addRef = useRef({ first: '', last: '', center: '', title: '' });
  const incRef = useRef({ empId: '', date: '', reason: '', pts: 0, notes: '' });

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

  /* Restore logic */
  const filePicker = useRef<HTMLInputElement | null>(null);

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(String(ev.target?.result));
        const emp = Array.isArray(data.employees) ? data.employees : [];
        const inc = Array.isArray(data.incidents) ? data.incidents : [];
        setEmployees(emp);
        setIncidents(inc);
        alert('✅ Backup restored');
      } catch {
        alert('❌ Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  /* derived */
  const getActionLevel = (pts: number) => {
    if (pts >= 15) return { level: 'Termination', color: 'red' };
    if (pts >= 12) return { level: 'Final Warning (PIP)', color: 'orange' };
    if (pts >= 8) return { level: 'Written Warning', color: 'yellow' };
    if (pts >= 4) return { level: 'Verbal Warning', color: 'blue' };
    return { level: 'Good Standing', color: 'green' };
  };
  
  const alerts = employees.filter(e => e.pts >= 4);
  const visible = employees.filter(e =>
    `${e.first} ${e.last}`.toLowerCase().includes(search.toLowerCase())
  );

  /* handlers */
  const addEmployee = () => {
    const { first, last, center, title } = addRef.current;
    if (!first || !last) return;
    setEmployees(prev => [
      ...prev,
      { id: Date.now(), first, last, center, title, pts: 0 }
    ]);
    setShowAdd(false);
  };

  const addIncident = () => {
    const { empId, date, reason, pts, notes } = incRef.current;
    if (!empId || !reason) return;
    const id = Date.now();
    setIncidents(prev => [
      ...prev,
      { id, employeeId: Number(empId), date, reason, pts: Number(pts), notes }
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
        <img 
          src="/abt-logo.png" 
          alt="ABT Logo" 
          className="mx-auto mb-4 h-24 object-contain"
        />
        <div className="flex items-center justify-center">
          <Clock size={22} className="inline-block mr-2" />
          <h1 className="text-2xl font-bold">ABT Center Attendance Tracker</h1>
        </div>
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
              {alerts.map(a => {
                const action = getActionLevel(a.pts);
                return (
                  <li key={a.id}>
                    {a.first} {a.last} • {a.pts} pts • <strong>{action.level}</strong>
                  </li>
                );
              })}
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
                    <th className="p-2">Title</th>
                    <th className="p-2">Center</th>
                    <th className="p-2">Points</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(emp => {
                    const action = getActionLevel(emp.pts);
                    return (
                      <tr key={emp.id} className="border-t">
                        <td className="p-2">
                          {emp.first} {emp.last}
                        </td>
                        <td className="p-2">{emp.title || 'N/A'}</td>
                        <td className="p-2">{emp.center}</td>
                        <td className="p-2">{emp.pts}</td>
                        <td className="p-2">
                          <span className={`font-semibold ${
                            action.color === 'red' ? 'text-red-600' :
                            action.color === 'orange' ? 'text-orange-600' :
                            action.color === 'yellow' ? 'text-yellow-600' :
                            action.color === 'blue' ? 'text-blue-600' :
                            'text-green-600'
                          }`}>
                            {action.level}
                          </span>
                        </td>
                        <td className="p-2">
                          <button
                            className="btn btn-sm bg-blue-600 text-white px-2 py-1 text-xs"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setShowDetails(true);
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
            <select
              className="input border w-full px-3 py-2"
              onChange={e => (addRef.current.title = e.target.value)}
            >
              <option value="">Select job title…</option>
              <option value="BT">BT</option>
              <option value="RBT">RBT</option>
              <option value="RBTCA">RBTCA</option>
              <option value="BCBA">BCBA</option>
            </select>
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
              {[...employees]
                .sort((a, b) => a.first.localeCompare(b.first))
                .map(e => (
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
            <select
              className="input border w-full px-3 py-2"
              onChange={e => {
                const [reason, pts] = e.target.value.split('|');
                incRef.current.reason = reason;
                incRef.current.pts = parseFloat(pts);
              }}
            >
              <option value="">Select offense type…</option>
              <option value="No-Call/No-Show|10">No-Call/No-Show (10 pts)</option>
              <option value="Late Arrival|2">Late Arrival (2 pts)</option>
              <option value="Early Departure|2">Early Departure (2 pts)</option>
              <option value="Planned Absence (<24hr notice)|4">Planned Absence (&lt;24hr notice) (4 pts)</option>
              <option value="Unexpected Illness/Emergency (after 7AM)|4">Unexpected Illness/Emergency (after 7AM) (4 pts)</option>
              <option value="Other|0">Other (Custom Points)</option>
            </select>
            <input
              type="number"
              step="0.5"
              placeholder="Points"
              className="input border w-full px-3 py-2"
              onChange={e => (incRef.current.pts = e.target.value)}
            />
            <textarea
              placeholder="Notes (optional)"
              className="input border w-full px-3 py-2"
              onChange={e => (incRef.current.notes = e.target.value)}
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

      {/* ---------- Employee Details modal ---------- */}
      {showDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center overflow-y-auto">
          <div className="bg-white p-6 rounded shadow max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4 text-lg">
              {selectedEmployee.first} {selectedEmployee.last} - Details
            </h3>
            
            <div className="mb-4 p-3 bg-gray-100 rounded">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p><strong>Center:</strong> {selectedEmployee.center}</p>
                  <p><strong>Total Points:</strong> {selectedEmployee.pts}</p>
                </div>
                <div>
                  <p><strong>Job Title:</strong> 
                    <select
                      className="ml-2 input border px-2 py-1 text-xs"
                      value={selectedEmployee.title || ''}
                      onChange={e => {
                        const newTitle = e.target.value;
                        setEmployees(prev =>
                          prev.map(emp =>
                            emp.id === selectedEmployee.id
                              ? { ...emp, title: newTitle }
                              : emp
                          )
                        );
                        setSelectedEmployee({ ...selectedEmployee, title: newTitle });
                      }}
                    >
                      <option value="">Select...</option>
                      <option value="BT">BT</option>
                      <option value="RBT">RBT</option>
                      <option value="RBTCA">RBTCA</option>
                      <option value="BCBA">BCBA</option>
                    </select>
                  </p>
                  <p><strong>Status:</strong> <span className={`font-semibold ${
                    getActionLevel(selectedEmployee.pts).color === 'red' ? 'text-red-600' :
                    getActionLevel(selectedEmployee.pts).color === 'orange' ? 'text-orange-600' :
                    getActionLevel(selectedEmployee.pts).color === 'yellow' ? 'text-yellow-600' :
                    getActionLevel(selectedEmployee.pts).color === 'blue' ? 'text-blue-600' :
                    'text-green-600'
                  }`}>{getActionLevel(selectedEmployee.pts).level}</span></p>
                </div>
              </div>
            </div>

            <h4 className="font-semibold mb-2">Attendance History</h4>
            <div className="mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-left">Points</th>
                    <th className="p-2 text-left">Notes</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents
                    .filter(i => i.employeeId === selectedEmployee.id)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(incident => (
                      <tr key={incident.id} className="border-t">
                        <td className="p-2">{incident.date}</td>
                        <td className="p-2">{incident.reason}</td>
                        <td className="p-2">{incident.pts}</td>
                        <td className="p-2 text-xs text-gray-600">{incident.notes || '-'}</td>
                        <td className="p-2">
                          <button
                            className="text-red-600 hover:underline text-xs"
                            onClick={() => {
                              if (confirm('Remove this incident?')) {
                                setIncidents(prev => prev.filter(i => i.id !== incident.id));
                                setEmployees(prev =>
                                  prev.map(e =>
                                    e.id === selectedEmployee.id
                                      ? { ...e, pts: Math.max(0, e.pts - incident.pts) }
                                      : e
                                  )
                                );
                                setSelectedEmployee({
                                  ...selectedEmployee,
                                  pts: Math.max(0, selectedEmployee.pts - incident.pts)
                                });
                              }
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {incidents.filter(i => i.employeeId === selectedEmployee.id).length === 0 && (
                <p className="text-sm text-gray-500 p-2">No incidents recorded</p>
              )}
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Add Note / Adjustment</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Note (e.g., 'Verbal warning given', 'Points reset')"
                  className="input border flex-grow px-3 py-2"
                  id="note-input"
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="Points adjustment (+/-)"
                  className="input border w-32 px-3 py-2"
                  id="points-input"
                />
                <button
                  className="btn bg-green-600 text-white"
                  onClick={() => {
                    const noteInput = document.getElementById('note-input') as HTMLInputElement;
                    const pointsInput = document.getElementById('points-input') as HTMLInputElement;
                    const note = noteInput.value;
                    const points = parseFloat(pointsInput.value) || 0;
                    
                    if (note) {
                      const newIncident: Incident = {
                        id: Date.now(),
                        employeeId: selectedEmployee.id,
                        date: new Date().toISOString().split('T')[0],
                        reason: note,
                        pts: points
                      };
                      setIncidents(prev => [...prev, newIncident]);
                      setEmployees(prev =>
                        prev.map(e =>
                          e.id === selectedEmployee.id
                            ? { ...e, pts: Math.max(0, e.pts + points) }
                            : e
                        )
                      );
                      setSelectedEmployee({
                        ...selectedEmployee,
                        pts: Math.max(0, selectedEmployee.pts + points)
                      });
                      noteInput.value = '';
                      pointsInput.value = '';
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                className="btn btn-gray"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}