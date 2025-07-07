import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Info,
  User,
  Calendar,
  Search,
  Download
} from 'lucide-react';

/**
 * This version adds:
 * 1) Edit Employee modal (allow changing name, position, center).
 * 2) Alphabetical order by last name in the employee list and dropdown.
 * 3) ABT logo at the top of the page.
 */

export default function App() {
  // Employees + Incidents from localStorage
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('abtEmployees');
    return saved ? JSON.parse(saved) : [];
  });
  const [incidents, setIncidents] = useState(() => {
    const saved = localStorage.getItem('abtIncidents');
    return saved ? JSON.parse(saved) : [];
  });

  // For new employee
  const [newEmployee, setNewEmployee] = useState({ name: '', position: '', center: 'Beachwood' });
  // For new incident
  const [newIncident, setNewIncident] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Late Arrival',
    notes: ''
  });

  // Modals + UI state
  const [showForm, setShowForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  // For notify modal
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyEmployee, setNotifyEmployee] = useState(null);
  const [notifyAction, setNotifyAction] = useState('');
  const [notifyDate, setNotifyDate] = useState(new Date().toISOString().split('T')[0]);

  // For editing an existing employee
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editCenter, setEditCenter] = useState('Beachwood');

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem('abtEmployees', JSON.stringify(employees));
    localStorage.setItem('abtIncidents', JSON.stringify(incidents));
  }, [employees, incidents]);

  // 1) Basic point definitions
  const pointValues = {
    'Unnotified Absence': 10,
    'Late Arrival': 2,
    'Early Departure': 2,
    'Planned Absence': 4,
    'Unexpected Illness/Last-Minute Emergency': 4
  };

  // 2) Corrective actions
  const correctiveActions = [
    { threshold: 4, action: 'Verbal Warning' },
    { threshold: 8, action: 'Written Warning' },
    { threshold: 12, action: 'Final Warning (PIP)' },
    { threshold: 15, action: 'Termination' }
  ];

  // HELPER: get last name from a name string
  // e.g. "John A. Smith Jr." => "Smith"
  function getLastName(fullName) {
    if (!fullName.trim()) return fullName;
    const parts = fullName.split(/\s+/);
    return parts[parts.length - 1];
  }

  // HELPER: group consecutive illness days
  const getConsecutiveIllnessGroups = (illnessIncidents) => {
    if (!illnessIncidents.length) return 0;
    const sorted = [...illnessIncidents].sort((a, b) => new Date(a.date) - new Date(b.date));
    let groupCount = 1;
    for (let i = 1; i < sorted.length; i++) {
      const currentDate = new Date(sorted[i].date);
      const prevDate = new Date(sorted[i - 1].date);
      const prevPlusOne = new Date(prevDate);
      prevPlusOne.setDate(prevPlusOne.getDate() + 1);
      if (currentDate.toDateString() !== prevPlusOne.toDateString()) {
        groupCount++;
      }
    }
    return groupCount;
  };

  // Calculate total points
  const calculatePoints = (employeeId) => {
    const employeeIncidents = incidents
      .filter((i) => i.employeeId === employeeId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!employeeIncidents.length) return 0;

    const illness = employeeIncidents.filter(
      (inc) => inc.type === 'Unexpected Illness/Last-Minute Emergency'
    );
    const nonIllness = employeeIncidents.filter(
      (inc) => inc.type !== 'Unexpected Illness/Last-Minute Emergency'
    );

    const illnessGroups = getConsecutiveIllnessGroups(illness);
    const illnessPoints = illnessGroups * 4;
    const otherPoints = nonIllness.reduce((sum, inc) => sum + (pointValues[inc.type] || 0), 0);

    return illnessPoints + otherPoints;
  };

  // Count no call/no shows last 12 mo
  const countNoCallNoShows = (employeeId) => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    return incidents.filter(
      (i) =>
        i.employeeId === employeeId &&
        i.type === 'Unnotified Absence' &&
        new Date(i.date) >= twelveMonthsAgo
    ).length;
  };

  // Based on points, get recommended action
  const getRecommendedAction = (employeeId) => {
    const points = calculatePoints(employeeId);
    let recommended = 'No Action Required';
    for (let i = correctiveActions.length - 1; i >= 0; i--) {
      if (points >= correctiveActions[i].threshold) {
        recommended = correctiveActions[i].action;
        break;
      }
    }

    // override with NCNS
    const noCallNoShows = countNoCallNoShows(employeeId);
    if (noCallNoShows === 1 && recommended === 'Verbal Warning') {
      recommended = 'Written Warning (No-Call/No-Show)';
    } else if (noCallNoShows >= 2) {
      recommended = 'Termination (Multiple No-Call/No-Shows)';
    }

    return { action: recommended, points };
  };

  // Show alerts
  const getAlerts = () => {
    return employees.reduce((acc, employee) => {
      if (!employee.notifications) employee.notifications = [];
      const { action, points } = getRecommendedAction(employee.id);
      if (action === 'No Action Required') return acc;
      const alreadyNotified = employee.notifications.some((n) => n.action === action);
      if (!alreadyNotified) {
        acc.push({ employee, action, points });
      }
      return acc;
    }, []);
  };

  const alerts = getAlerts();

  // Add new employee
  const addEmployee = () => {
    if (!newEmployee.name.trim()) return;
    const emp = {
      id: Date.now().toString(),
      name: newEmployee.name,
      position: newEmployee.position,
      center: newEmployee.center,
      hireDate: new Date().toISOString().split('T')[0],
      notifications: []
    };
    setEmployees([...employees, emp]);
    setNewEmployee({ name: '', position: '', center: 'Beachwood' });
    setShowEmployeeForm(false);
  };

  // Add new incident
  const addIncident = () => {
    if (!newIncident.employeeId) return;
    const inc = {
      id: Date.now().toString(),
      employeeId: newIncident.employeeId,
      date: newIncident.date,
      type: newIncident.type,
      notes: newIncident.notes
    };
    setIncidents([...incidents, inc]);
    setNewIncident({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Late Arrival',
      notes: ''
    });
    setShowForm(false);
  };

  // Delete employee or incident
  const deleteEmployee = (id) => {
    setEmployees(employees.filter((e) => e.id !== id));
    setIncidents(incidents.filter((i) => i.employeeId !== id));
  };

  const deleteIncident = (id) => {
    setIncidents(incidents.filter((i) => i.id !== id));
  };

  // Export CSV
  const exportToExcel = () => {
    try {
      let csvContent = '\uFEFF';
      const newLine = '\r\n';

      // 1) Employee summary
      csvContent += 'Employee Name,Position,Center,Current Points,Status,No-Call/No-Shows' + newLine;
      employees.forEach((employee) => {
        const { action, points } = getRecommendedAction(employee.id);
        const noCallNoShows = countNoCallNoShows(employee.id);
        const row = [
          `"${employee.name.replace(/"/g, '""')}"`,
          `"${employee.position.replace(/"/g, '""')}"`,
          `"${employee.center.replace(/"/g, '""')}"`,
          points,
          `"${action}"`,
          noCallNoShows
        ].join(',');
        csvContent += row + newLine;
      });

      // 2) Incidents
      csvContent += newLine + 'Attendance Incidents' + newLine;
      csvContent += 'Employee Name,Date,Issue Type,Points,Notes' + newLine;
      incidents.forEach((inc) => {
        const emp = employees.find((e) => e.id === inc.employeeId);
        const empName = emp ? emp.name : 'Unknown';
        const row = [
          `"${empName.replace(/"/g, '""')}"`,
          inc.date,
          `"${inc.type.replace(/"/g, '""')}"`,
          pointValues[inc.type] || 0,
          `"${(inc.notes || '').replace(/"/g, '""')}"`
        ].join(',');
        csvContent += row + newLine;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, 'ABT_Attendance_Report.csv');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ABT_Attendance_Report.csv';
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting CSV');
    }
  };

  // If older than 90 days
  const isOlderThan90 = (dateString) => {
    const incTime = new Date(dateString).getTime();
    const now = new Date().getTime();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return now - incTime > ninetyDays;
  };

  // Sort employees by last name
  const sortedEmployees = [...employees].sort((a, b) => {
    const aLast = getLastName(a.name).toLowerCase();
    const bLast = getLastName(b.name).toLowerCase();
    return aLast.localeCompare(bLast);
  });

  // Filter, then sort
  const filteredEmployees = sortedEmployees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.center.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // For the incident creation dropdown, also sorted
  const sortedEmployeeOptions = sortedEmployees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    center: emp.center
  }));

  // 'Notify' flow
  const handleNotifyClick = (employee, action) => {
    setNotifyEmployee(employee);
    setNotifyAction(action);
    setNotifyDate(new Date().toISOString().split('T')[0]);
    setShowNotifyModal(true);
  };

  const saveNotification = () => {
    if (!notifyEmployee) return;
    const pointsAtTime = calculatePoints(notifyEmployee.id);

    const updated = employees.map((emp) => {
      if (emp.id === notifyEmployee.id) {
        const newNote = {
          action: notifyAction,
          date: notifyDate,
          pointsAtTime,
          remark: ''
        };
        if (!emp.notifications) emp.notifications = [];
        emp.notifications.push(newNote);
      }
      return emp;
    });

    setEmployees(updated);
    setShowNotifyModal(false);
    setNotifyEmployee(null);
    setNotifyAction('');
    setNotifyDate(new Date().toISOString().split('T')[0]);
  };

  // Edit Employee flow
  const handleEditEmployeeClick = (employee) => {
    setEditEmployee(employee);
    setEditName(employee.name);
    setEditPosition(employee.position);
    setEditCenter(employee.center);
    setShowEditEmployeeModal(true);
  };

  const updateEmployee = () => {
    if (!editEmployee) return;
    const updated = employees.map((emp) => {
      if (emp.id === editEmployee.id) {
        return {
          ...emp,
          name: editName,
          position: editPosition,
          center: editCenter
        };
      }
      return emp;
    });
    setEmployees(updated);
    setShowEditEmployeeModal(false);
    setEditEmployee(null);
    setEditName('');
    setEditPosition('');
    setEditCenter('Beachwood');
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-4 bg-gray-50">
      {/* ABT Logo at the top */}
      <div className="flex justify-center mb-4">
        <img
          src="https://advancedabatherapy.com/wp-content/uploads/2021/02/HomeLogo.png"
          alt="ABT Logo"
          className="h-16 object-contain"
        />
      </div>

      {/* Notify Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Notify Employee of Points</h2>
              <button
                onClick={() => {
                  setShowNotifyModal(false);
                  setNotifyEmployee(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Notifying: <strong>{notifyEmployee?.name}</strong> about:{' '}
                <strong>{notifyAction}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Date
                </label>
                <input
                  type="date"
                  value={notifyDate}
                  onChange={(e) => setNotifyDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <button
                onClick={saveNotification}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Save Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Employee</h2>
              <button
                onClick={() => {
                  setShowEditEmployeeModal(false);
                  setEditEmployee(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Center</label>
                <select
                  value={editCenter}
                  onChange={(e) => setEditCenter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="Beachwood">Beachwood</option>
                  <option value="Columbus">Columbus</option>
                </select>
              </div>

              <button
                onClick={updateEmployee}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">ABT Center Attendance Tracker</h1>
        <p className="text-gray-600 mb-4">
          Track attendance points for staff members according to ABT Attendance Policy
        </p>

        {/* Alerts Section */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold flex items-center">
              <AlertTriangle className="text-orange-500 mr-2" size={20} />
              Alerts Requiring Action ({alerts.length})
            </h2>
            <button
              className="text-blue-600 text-sm"
              onClick={() => setAlertsExpanded(!alertsExpanded)}
            >
              {alertsExpanded ? 'Collapse' : 'Expand All'}
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-2">No alerts at this time</p>
          ) : (
            <div className={`space-y-2 ${alertsExpanded ? '' : 'max-h-40 overflow-y-auto'}`}>
              {alerts.map(({ employee, action, points }) => (
                <div
                  key={employee.id}
                  className="bg-white border border-orange-200 rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{employee.name}</span>
                    <div className="text-sm text-gray-600">
                      Points: <span className="font-medium">{points}</span> |{' '}
                      Action: <span className="font-medium text-red-600">{action}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNotifyClick(employee, action)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm px-2 py-1 rounded"
                  >
                    Notify
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowEmployeeForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          >
            <User className="mr-2" size={18} />
            Add New Employee
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center"
          >
            <Calendar className="mr-2" size={18} />
            Record Attendance Issue
          </button>

          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
          >
            <Download className="mr-2" size={18} />
            Export to Excel
          </button>

          <div className="flex-grow">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* New Employee Form */}
      {showEmployeeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Employee</h2>
              <button
                onClick={() => setShowEmployeeForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="E.g., RBT, BCBA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Center</label>
                <select
                  value={newEmployee.center}
                  onChange={(e) => setNewEmployee({ ...newEmployee, center: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="Beachwood">Beachwood</option>
                  <option value="Columbus">Columbus</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={addEmployee}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Add Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Incident Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Attendance Issue</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={newIncident.employeeId}
                  onChange={(e) => setNewIncident({ ...newIncident, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="">Select Employee</option>
                  {sortedEmployeeOptions.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.center})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newIncident.date}
                  onChange={(e) => setNewIncident({ ...newIncident, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                <select
                  value={newIncident.type}
                  onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  {Object.keys(pointValues).map((type) => (
                    <option key={type} value={type}>
                      {type} ({pointValues[type]} points)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Warnings, etc.)
                </label>
                <textarea
                  rows={3}
                  value={newIncident.notes}
                  onChange={(e) => setNewIncident({ ...newIncident, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Verbal or written warning details..."
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={addIncident}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                >
                  Record Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <h2 className="bg-gray-100 px-6 py-3 text-lg font-semibold">
          Employee Attendance Records
        </h2>

        {filteredEmployees.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {employees.length === 0
              ? 'No employees added yet. Add your first employee to get started.'
              : 'No employees match your search criteria.'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredEmployees.map((employee) => {
              const { action, points } = getRecommendedAction(employee.id);
              const employeeIncidents = incidents
                .filter((i) => i.employeeId === employee.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
              if (!employee.notifications) employee.notifications = [];

              return (
                <div key={employee.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{employee.name}</h3>
                      <p className="text-gray-600">
                        {employee.position} • {employee.center}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="mb-1">
                        <span className="font-semibold">Current Points: </span>
                        <span
                          className={`font-bold ${
                            points >= 12
                              ? 'text-red-600'
                              : points >= 8
                              ? 'text-orange-600'
                              : points >= 4
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {points}
                        </span>
                      </div>
                      {action !== 'No Action Required' && (
                        <div
                          className={`text-sm ${
                            action.includes('Termination')
                              ? 'text-red-600 font-bold'
                              : action.includes('Final Warning')
                              ? 'text-orange-600 font-semibold'
                              : action.includes('Written Warning')
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                          }`}
                        >
                          Status: {action}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employee actions */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleEditEmployeeClick(employee)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm"
                    >
                      Edit Employee
                    </button>
                    <button
                      onClick={() => deleteEmployee(employee.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm"
                    >
                      Delete Employee
                    </button>
                  </div>

                  {/* Notification History */}
                  {employee.notifications.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Notification History</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Action
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Points at Time
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Remark
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {employee.notifications.map((note, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 whitespace-nowrap">{note.date}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{note.action}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{note.pointsAtTime}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {note.remark || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Incidents Table */}
                  {employeeIncidents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Issue Type
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Points
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Notes
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employeeIncidents.map((incident) => {
                            const olderThan90 = isOlderThan90(incident.date);
                            return (
                              <tr key={incident.id}>
                                <td className="px-4 py-2 whitespace-nowrap">{incident.date}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{incident.type}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {pointValues[incident.type] || 0}
                                </td>
                                <td className="px-4 py-2 truncate max-w-xs">
                                  {incident.notes || '—'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                  {olderThan90 ? (
                                    <button
                                      onClick={() => deleteIncident(incident.id)}
                                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
                                    >
                                      Remove for Good Behavior
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => deleteIncident(incident.id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">No attendance issues recorded</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Policy Reference */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="text-blue-500 mt-1 mr-3 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-blue-800">ABT Attendance Policy Reference</h3>
            <p className="text-sm text-gray-600 mb-2">
              Point accumulation and corrective actions as per policy:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-1">Point Values:</h4>
                <ul className="space-y-1">
                  {Object.entries(pointValues).map(([type, val]) => (
                    <li key={type}>
                      • {type}: <span className="font-medium">{val} points</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-1">Corrective Actions:</h4>
                <ul className="space-y-1">
                  <li>
                    • 4-7 points: <span className="font-medium">Verbal Warning</span>
                  </li>
                  <li>
                    • 8-11 points: <span className="font-medium">Written Warning</span>
                  </li>
                  <li>
                    • 12-14 points: <span className="font-medium">Final Warning (PIP)</span>
                  </li>
                  <li>
                    • 15+ points: <span className="font-medium">Termination</span>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-gray-500">
                  Points reset logic is simplified here—consecutive Illness days count as a single
                  occurrence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
