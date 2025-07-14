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
  notificationCleared?: boolean;
  lastNotified?: string;
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
  const [editingIncident, setEditingIncident] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{reason: string; pts: string; notes: string}>({reason: '', pts: '0', notes: ''});
  const [editingTitle, setEditingTitle] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /* form refs */
  const addRef = useRef({ first: '', last: '', center: '', title: '' });
  const incRef = useRef({ empId: '', date: '', reason: '', pts: 0, notes: '' });
  const [incidentPts, setIncidentPts] = useState<number>(0);
  const [incidentNotes, setIncidentNotes] = useState<string>('');

  /* preload localStorage */
  useEffect(() => {
    try {
      const employeesData = localStorage.getItem('employees') ?? '[]';
      const incidentsData = localStorage.getItem('incidents') ?? '[]';
      setEmployees(JSON.parse(employeesData));
      setIncidents(JSON.parse(incidentsData));
      setAutoBackup(localStorage.getItem('auto-backup-enabled') === 'true');
      setHasUnsavedChanges(false);
    } catch (error) {
      setEmployees([]);
      setIncidents([]);
    }
  }, []);
  
  /* Auto backup toggle persistence */
  useEffect(() => {
    localStorage.setItem('auto-backup-enabled', autoBackup.toString());
  }, [autoBackup]);
  
  /* Warn before leaving page if unsaved changes */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !autoBackup) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Would you like to backup your data first?';
        return 'You have unsaved changes. Would you like to backup your data first?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, autoBackup]);

  /* persist on change */
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('incidents', JSON.stringify(incidents));
    setHasUnsavedChanges(true);
    
    // Auto backup if enabled
    if (autoBackup && (employees.length > 0 || incidents.length > 0)) {
      const backupData = { employees, incidents };
      localStorage.setItem('auto-backup', JSON.stringify(backupData));
      localStorage.setItem('auto-backup-timestamp', new Date().toISOString());
    }
  }, [employees, incidents, autoBackup]);

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
        setHasUnsavedChanges(false);
      } catch {
        alert('❌ Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  /* derived */
  const getActionLevel = (pts: number) => {
    if (pts >= 15) return { level: 'Removal from center schedule', color: 'red' };
    if (pts >= 12) return { level: 'Final Warning (PIP)', color: 'orange' };
    if (pts >= 8) return { level: 'Written Warning', color: 'yellow' };
    if (pts >= 4) return { level: 'Verbal Warning', color: 'blue' };
    return { level: 'Good Standing', color: 'green' };
  };
  
  const alerts = employees.filter(e => e.pts >= 4 && !e.notificationCleared);
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
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-orange-600">
              ⚠️ Alerts Requiring Action ({alerts.length})
            </h2>
            {alerts.length > 0 && (
              <button
                className="btn btn-sm bg-gray-500 text-white text-xs"
                onClick={() => {
                  if (confirm('Clear all current alerts? This will mark all employees as notified.')) {
                    const today = new Date().toISOString().split('T')[0];
                    setEmployees(prev =>
                      prev.map(e =>
                        e.pts >= 4 ? { ...e, notificationCleared: true, lastNotified: today } : e
                      )
                    );
                  }
                }}
              >
                Clear All
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-600">No alerts at this time</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => {
                const action = getActionLevel(a.pts);
                return (
                  <div key={a.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div className="text-sm">
                      <strong>{a.first} {a.last}</strong> • {a.pts} pts • <strong className={`${
                        action.color === 'red' ? 'text-red-600' :
                        action.color === 'orange' ? 'text-orange-600' :
                        action.color === 'yellow' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`}>{action.level}</strong>
                    </div>
                    <button
                      className="btn btn-sm bg-green-600 text-white text-xs px-2 py-1"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setEmployees(prev =>
                          prev.map(e =>
                            e.id === a.id ? { ...e, notificationCleared: true, lastNotified: today } : e
                          )
                        );
                      }}
                    >
                      Mark Notified
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Show recently cleared notifications */}
          {employees.filter(e => e.notificationCleared && e.pts >= 4).length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer">
                Recently Cleared Notifications ({employees.filter(e => e.notificationCleared && e.pts >= 4).length})
              </summary>
              <div className="mt-2 space-y-1">
                {employees
                  .filter(e => e.notificationCleared && e.pts >= 4)
                  .map(e => {
                    const action = getActionLevel(e.pts);
                    return (
                      <div key={e.id} className="flex justify-between items-center p-2 bg-gray-100 rounded text-sm">
                        <div>
                          <strong>{e.first} {e.last}</strong> • {e.pts} pts • {action.level}
                          {e.lastNotified && <span className="text-gray-500"> (Notified: {e.lastNotified})</span>}
                        </div>
                        <button
                          className="text-orange-600 hover:underline text-xs"
                          onClick={() => {
                            setEmployees(prev =>
                              prev.map(emp =>
                                emp.id === e.id ? { ...emp, notificationCleared: false, lastNotified: undefined } : emp
                              )
                            );
                          }}
                        >
                          Restore Alert
                        </button>
                      </div>
                    );
                  })}
              </div>
            </details>
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
            onClick={() => {
              downloadBackup(employees, incidents);
              setHasUnsavedChanges(false);
            }}
          >
            Backup ⭱
          </button>
          
          {!autoBackup && hasUnsavedChanges && (
            <button
              className="btn bg-red-500 text-white hover:bg-red-600 animate-pulse"
              onClick={() => {
                downloadBackup(employees, incidents);
                setHasUnsavedChanges(false);
              }}
            >
              ⚠️ Backup Unsaved Changes
            </button>
          )}
          <button
            className="btn bg-yellow-500 text-white hover:bg-yellow-600"
            onClick={() => filePicker.current?.click()}
          >
            Restore ⭳
          </button>
          
          <div className="flex items-center gap-2 ml-4">
            <input
              type="checkbox"
              id="auto-backup"
              checked={autoBackup}
              onChange={(e) => setAutoBackup(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="auto-backup" className="text-sm font-medium">
              Auto-backup enabled
            </label>
          </div>
          
          {autoBackup && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <span>✅ Auto-backup active</span>
              <button
                className="text-blue-600 hover:underline"
                onClick={() => {
                  const backup = localStorage.getItem('auto-backup');
                  const timestamp = localStorage.getItem('auto-backup-timestamp');
                  if (backup && timestamp) {
                    const date = new Date(timestamp).toLocaleString();
                    alert(`Last auto-backup: ${date}`);
                  } else {
                    alert('No auto-backup found');
                  }
                }}
              >
                (check last backup)
              </button>
            </div>
          )}
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

        {/* Policy Reference */}
        <section className="border border-gray-200 bg-gray-50 rounded p-4 shadow mt-6">
          <h2 className="font-semibold text-gray-800 mb-3">ABT Center Attendance Policy Reference</h2>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2 text-gray-700">Point System</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>No-Call/No-Show:</strong> 10 points</li>
                <li>• <strong>Late Arrival:</strong> 2 points</li>
                <li>• <strong>Early Departure:</strong> 2 points</li>
                <li>• <strong>Planned Absence (&lt;24hr notice):</strong> 4 points</li>
                <li>• <strong>Unexpected Illness/Emergency (after 7AM):</strong> 4 points</li>
              </ul>

              <h3 className="font-semibold mb-2 mt-4 text-gray-700">Communication Requirements</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Planned absences: 24+ hours advance notice</li>
                <li>• PTO requests: 1+ week advance notice</li>
                <li>• Unexpected illness: By 7:00 AM same day</li>
                <li>• Email: center@advancedabatherapy.com (Beachwood)</li>
                <li>• Email: centercol@advancedabatherapy.com (Columbus)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-gray-700">Corrective Actions</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• <span className="text-blue-600 font-semibold">4-7 Points:</span> Verbal Warning</li>
                <li>• <span className="text-yellow-600 font-semibold">8-11 Points:</span> Written Warning</li>
                <li>• <span className="text-orange-600 font-semibold">12-14 Points:</span> Final Warning (PIP)</li>
                <li>• <span className="text-red-600 font-semibold">15+ Points:</span> Removal from center schedule</li>
              </ul>

              <h3 className="font-semibold mb-2 mt-4 text-gray-700">Special Considerations</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Single NCNS = automatic written warning minimum</li>
                <li>• Second NCNS within 12 months = immediate removal</li>
                <li>• First 90 days: First NCNS = immediate removal</li>
                <li>• Points reset annually on Jan 1 (with conditions)</li>
                <li>• Consecutive days for same illness = single occurrence</li>
                <li>• Medical absences 2+ days require doctor's note</li>
              </ul>
            </div>
          </div>
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
                const pointValue = parseFloat(pts);
                incRef.current.pts = pointValue;
                setIncidentPts(pointValue);
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
              value={incidentPts}
              className="input border w-full px-3 py-2"
              onChange={e => {
                const value = parseFloat(e.target.value) || 0;
                setIncidentPts(value);
                incRef.current.pts = value;
              }}
            />
            <textarea
              placeholder="Notes (optional)"
              value={incidentNotes}
              className="input border w-full px-3 py-2"
              onChange={e => {
                setIncidentNotes(e.target.value);
                incRef.current.notes = e.target.value;
              }}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn" onClick={() => {
                incRef.current = { empId: '', date: '', reason: '', pts: 0, notes: '' };
                setIncidentPts(0);
                setIncidentNotes('');
                setShowInc(false);
              }}>
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
        <div className="w-full max-w-6xl mt-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-2xl border-2 border-blue-500 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                {selectedEmployee.first} {selectedEmployee.last} - Details
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                onClick={() => setShowDetails(false)}
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-100 rounded">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p><strong>Center:</strong> {selectedEmployee.center}</p>
                  <p><strong>Total Points:</strong> {selectedEmployee.pts}</p>
                </div>
                <div>
                  <p><strong>Job Title:</strong> 
                    {editingTitle ? (
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
                          setEditingTitle(false);
                        }}
                        onBlur={() => setEditingTitle(false)}
                      >
                        <option value="">Select...</option>
                        <option value="BT">BT</option>
                        <option value="RBT">RBT</option>
                        <option value="RBTCA">RBTCA</option>
                        <option value="BCBA">BCBA</option>
                      </select>
                    ) : (
                      <span 
                        className="ml-2 text-blue-600 hover:underline cursor-pointer"
                        onClick={() => setEditingTitle(true)}
                      >
                        {selectedEmployee.title || 'Click to set'}
                      </span>
                    )}
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
                        <td className="p-2">
                          {editingIncident === incident.id ? (
                            <input
                              type="text"
                              value={editValues.reason}
                              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onChange={(e) => setEditValues({...editValues, reason: e.target.value})}
                              tabIndex={0}
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm">{incident.reason}</span>
                          )}
                        </td>
                        <td className="p-2">
                          {editingIncident === incident.id ? (
                            <input
                              type="text"
                              value={editValues.pts}
                              placeholder="0.5, 1, 2, etc."
                              className="w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setEditValues({...editValues, pts: value});
                                }
                              }}
                              tabIndex={0}
                            />
                          ) : (
                            <span className="text-sm">{incident.pts}</span>
                          )}
                        </td>
                        <td className="p-2">
                          {editingIncident === incident.id ? (
                            <input
                              type="text"
                              value={editValues.notes}
                              placeholder="Add notes..."
                              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onChange={(e) => setEditValues({...editValues, notes: e.target.value})}
                              tabIndex={0}
                            />
                          ) : (
                            <span className="text-xs text-gray-600">{incident.notes || '-'}</span>
                          )}
                        </td>
                        <td className="p-2">
                          {editingIncident === incident.id ? (
                            <div className="flex gap-2">
                              <button
                                className="text-green-600 hover:underline text-xs px-1"
                                onClick={() => {
                                  const hasChanges = 
                                    editValues.reason !== incident.reason ||
                                    parseFloat(editValues.pts) !== incident.pts ||
                                    editValues.notes !== (incident.notes || '');
                                  
                                  if (hasChanges && confirm('Save changes to this incident?')) {
                                    const pointDifference = parseFloat(editValues.pts) - incident.pts;
                                    
                                    setIncidents(prev =>
                                      prev.map(i =>
                                        i.id === incident.id ? {
                                          ...i,
                                          reason: editValues.reason,
                                          pts: parseFloat(editValues.pts),
                                          notes: editValues.notes
                                        } : i
                                      )
                                    );
                                    
                                    setEmployees(prev =>
                                      prev.map(e =>
                                        e.id === selectedEmployee.id
                                          ? { ...e, pts: Math.max(0, e.pts + pointDifference) }
                                          : e
                                      )
                                    );
                                    
                                    setSelectedEmployee({
                                      ...selectedEmployee,
                                      pts: Math.max(0, selectedEmployee.pts + pointDifference)
                                    });
                                  }
                                  
                                  setEditingIncident(null);
                                  setEditValues({reason: '', pts: '0', notes: ''});
                                }}
                              >
                                Save
                              </button>
                              <button
                                className="text-gray-600 hover:underline text-xs px-1"
                                onClick={() => {
                                  setEditingIncident(null);
                                  setEditValues({reason: '', pts: '0', notes: ''});
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                className="text-blue-600 hover:underline text-xs px-1"
                                onClick={() => {
                                  setEditingIncident(incident.id);
                                  setEditValues({
                                    reason: incident.reason,
                                    pts: incident.pts.toString(),
                                    notes: incident.notes || ''
                                  });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="text-red-600 hover:underline text-xs px-1"
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
                            </div>
                          )}
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
              <h4 className="font-semibold mb-2">Quick Actions</h4>
              <div className="space-y-2">
                {/* Bulk Point Adjustment */}
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium w-24">Adjust Total:</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Set total points"
                    className="input border w-24 px-2 py-1 text-sm"
                    id="bulk-points-input"
                  />
                  <button
                    className="btn btn-sm bg-orange-600 text-white"
                    onClick={() => {
                      const bulkInput = document.getElementById('bulk-points-input') as HTMLInputElement;
                      const newTotal = parseFloat(bulkInput.value);
                      
                      if (!isNaN(newTotal) && newTotal >= 0) {
                        if (confirm(`Set ${selectedEmployee.first} ${selectedEmployee.last}'s total points to ${newTotal}?`)) {
                          const adjustment = newTotal - selectedEmployee.pts;
                          const adjustmentNote = adjustment > 0 ? `Manual point increase (+${adjustment})` : `Manual point reduction (${adjustment})`;
                          
                          // Add adjustment record
                          const newIncident: Incident = {
                            id: Date.now(),
                            employeeId: selectedEmployee.id,
                            date: new Date().toISOString().split('T')[0],
                            reason: 'Point Adjustment',
                            pts: adjustment,
                            notes: adjustmentNote
                          };
                          
                          setIncidents(prev => [...prev, newIncident]);
                          setEmployees(prev =>
                            prev.map(e =>
                              e.id === selectedEmployee.id ? { ...e, pts: newTotal } : e
                            )
                          );
                          setSelectedEmployee({ ...selectedEmployee, pts: newTotal });
                          bulkInput.value = '';
                        }
                      }
                    }}
                  >
                    Set Total
                  </button>
                </div>

                {/* Add Note/Incident */}
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
                    placeholder="Points (+/-)"
                    className="input border w-24 px-3 py-2"
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
                          pts: points,
                          notes: note
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
            </div>

            <div className="flex justify-between">
              <button
                className="btn bg-red-600 text-white"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedEmployee.first} ${selectedEmployee.last}? This will permanently remove their employee record and ALL attendance history. This action cannot be undone.`)) {
                    // Remove all incidents for this employee
                    setIncidents(prev => prev.filter(i => i.employeeId !== selectedEmployee.id));
                    // Remove the employee
                    setEmployees(prev => prev.filter(e => e.id !== selectedEmployee.id));
                    // Close the modal
                    setShowDetails(false);
                    alert(`${selectedEmployee.first} ${selectedEmployee.last} has been deleted.`);
                  }
                }}
              >
                Delete Employee
              </button>
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