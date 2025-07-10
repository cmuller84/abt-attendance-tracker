import { useRef } from 'react';   // if not already there

/* ---------- Backup / Restore helpers ---------- */
const todayStamp = () => {
  const d = new Date();
  return d.getFullYear()
       + String(d.getMonth() + 1).padStart(2, '0')
       + String(d.getDate()).padStart(2, '0');
};
const downloadBackup = (emp, inc) => {
  const blob = new Blob([JSON.stringify({ employees: emp, incidents: inc }, null, 2)],
                        { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-backup-${todayStamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
const filePicker = useRef(null);

/*  src/pages/home.jsx  */

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import '../styles/styles.css';   // ✅ keep your stylesheet
import '../styles/styles.css';

/* ---------- Helpers ---------- */
/* helpers */
const todayStamp = () => {
const d = new Date();
return (
@@ -17,36 +19,33 @@ const downloadBackup = (employees, incidents) => {
[JSON.stringify({ employees, incidents }, null, 2)],
{ type: 'application/json' }
);
  const url = URL.createObjectURL(blob);
const a = document.createElement('a');
  a.href = url;
  a.href = URL.createObjectURL(blob);
a.download = `attendance-backup-${todayStamp()}.json`;
a.click();
  URL.revokeObjectURL(url);
  URL.revokeObjectURL(a.href);
};

/* ---------- Component ---------- */
/* component */
export default function Home() {
  /* your existing state */
const [employees, setEmployees] = useState([]);
const [incidents, setIncidents] = useState([]);

  /* load any saved data once */
  /* load any saved state */
useEffect(() => {
setEmployees(JSON.parse(localStorage.getItem('employees') ?? '[]'));
setIncidents(JSON.parse(localStorage.getItem('incidents') ?? '[]'));
}, []);

  /* Restore logic */
  /* restore logic */
const filePicker = useRef(null);

const handleImport = (e) => {
const file = e.target.files?.[0];
if (!file) return;
const reader = new FileReader();
    reader.onload = (ev) => {
    reader.onload = (evt) => {
try {
        const data = JSON.parse(ev.target.result);
        const data = JSON.parse(evt.target.result);
const emp = Array.isArray(data.employees) ? data.employees : [];
const inc = Array.isArray(data.incidents) ? data.incidents : [];
setEmployees(emp);
@@ -61,12 +60,11 @@ export default function Home() {
reader.readAsText(file);
};

  /* ---------- UI ---------- */
return (
<div className="container mx-auto px-4 py-6">
{/* header */}
<div className="text-center mb-6">
        <Clock size={24} className="inline-block mr-2" />
        <Clock size={22} className="inline-block mr-2" />
<span className="text-2xl font-bold">ABT Center Attendance Tracker</span>
</div>

@@ -77,7 +75,7 @@ export default function Home() {
<button className="btn btn-secondary">Record Attendance Issue</button>
<button className="btn btn-success">Export to Excel</button>

        {/* NEW buttons */}
        {/* new buttons */}
<button
className="btn btn-info"
onClick={() => downloadBackup(employees, incidents)}
@@ -99,18 +97,16 @@ export default function Home() {
onChange={handleImport}
style={{ display: 'none' }}
/>
      </div>

      {/* existing content */}
      <div className="alert alert-light mb-4">
        No employees added yet. Add your first employee to get started.
        {/* existing search box */}
        <input
          type="text"
          placeholder="Search employees..."
          className="input input-bordered flex-grow md:flex-grow-0 md:w-64"
        />
</div>

      {/* policy reference – unchanged */}
      <div className="p-4 bg-blue-50 rounded text-sm">
        <strong>ABT Attendance Policy Reference</strong>
        {/* … keep whatever content was here … */}
      </div>
      {/* ---- rest of your existing UI stays untouched ---- */}
</div>
);
}
