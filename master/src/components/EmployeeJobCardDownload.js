import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  Spinner,
  Alert,
} from "react-bootstrap";
import axios from "axios";

import * as XLSX from "xlsx";
import { DateTime } from 'luxon';
import Select from "react-select";
import '../styles/UserShiftUpload.css';
import emvLogo from '../pictures/emvlogo.png';

const EmployeeJobCardDownload = () => {
  const [employeeName, setEmployeeName] = useState("");
  const [JobDataData, setJobDataData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const MAX_OPTIONS = 100; // Limit displayed options for performance



function formatDateforbackend(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}



const formatDates = (dateStr) => {
  if (!dateStr) return dateStr;
  
  // Try parsing strictly as dd-MM-yyyy first (common in your data)
  let dt = DateTime.fromFormat(dateStr, 'dd-MM-yyyy');
  
  if (!dt.isValid) {
      // Try parsing as ISO yyyy-MM-dd
      dt = DateTime.fromISO(dateStr);
  }
  
  if (!dt.isValid) {
      // Try parsing as JS Date (last resort)
      const jsDate = new Date(dateStr);
      if (!isNaN(jsDate.getTime())) {
          return DateTime.fromJSDate(jsDate).toFormat('dd-MM-yyyy');
      }
      return "N/A";
  }

  return dt.toFormat('dd-MM-yyyy');
};

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await axios.get("http192.168.2.54/api/employees");

        if (Array.isArray(res.data)) {
          const formatted = res.data
            .map((emp) => ({
              value: emp.userid,
              label: `${emp.userid} - ${emp.name}`,
              name: emp.name
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
          setAllEmployees(formatted);
        }
      } catch (err) {
        console.error("Error fetching employee list:", err);
        setError("Failed to load employees. Please refresh the page.");
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  // Debounce search input to prevent lag
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(employeeIdInput);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [employeeIdInput]);

  // Memoized filtered employee options (optimized for performance)
  const employeeOptions = useMemo(() => {
    // Don't show options until user starts typing (prevents rendering thousands of items)
    if (!debouncedInput || debouncedInput.trim() === "") {
      return [];
    }
    
    const searchLower = debouncedInput.toLowerCase();
    const filtered = [];
    
    // Limit results for performance - stop once we hit MAX_OPTIONS
    for (let i = 0; i < allEmployees.length && filtered.length < MAX_OPTIONS; i++) {
      if (allEmployees[i].label.toLowerCase().includes(searchLower)) {
        filtered.push(allEmployees[i]);
      }
    }
    
    return filtered;
  }, [debouncedInput, allEmployees]);

  // Memoized selected employee - search in all employees, not just filtered
  const selectedEmployee = useMemo(() => {
    if (!employeeId) return null;
    return allEmployees.find((opt) => opt.value === employeeId) || null;
  }, [allEmployees, employeeId]);

  // Optimized handlers with useCallback
  const handleEmployeeChange = useCallback((selected) => {
    setEmployeeId(selected ? selected.value : "");
    setEmployeeName(selected ? selected.name : "");
  }, []);

  const handleSearchInputChange = useCallback((val) => {
    setEmployeeIdInput(val);
  }, []);

  // Custom message for better UX
  const noOptionsMessage = useCallback(() => {
    if (!debouncedInput || debouncedInput.trim() === "") {
      return "Type to search employees...";
    }
    return employeeOptions.length >= MAX_OPTIONS 
      ? `Showing first ${MAX_OPTIONS} results. Type more to refine search.`
      : "No employees found";
  }, [debouncedInput, employeeOptions.length]);

  const fetchJobData = async () => {
    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!fromDate || !toDate) {
      setError("Please select From Date and To Date.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http192.168.2.54/api/employee-Jobreport",
        {
          fromDate: formatDateforbackend(fromDate),
          toDate: formatDateforbackend(toDate),
          employeeId: employeeId, // ✅ send employeeId instead of name
        },
        { timeout: 330000 }
      );
      console.log(response.data);

      if (response.data && Array.isArray(response.data.records)) {
        // Sort by RawDate (YYYY-MM-DD) which is safer than Date (DD/MM/YYYY)
        const sortedRecords = response.data.records.sort((a, b) => {
            const dateA = new Date(a.RawDate || a.Date.split('/').reverse().join('-'));
            const dateB = new Date(b.RawDate || b.Date.split('/').reverse().join('-'));
            return dateA - dateB;
        });
        setJobDataData(sortedRecords);

        if (response.data.records.length === 0) {
          setError("No JobData found for the selected filters.");
        }
      } else {
        setError("Invalid response format from server.");
      }
    } catch (error) {
      console.error("Error fetching Employee Job Card Data:", error);
      if (error.code === "ECONNABORTED") {
        setError("Request timeout. Please try again.");
      } else if (error.response) {
        setError(
          `Server error: ${error.response.data || error.response.statusText}`
        );
      } else if (error.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setJobDataData([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!Array.isArray(JobDataData) || JobDataData.length === 0) {
      setError("No JobData data to export.");
      return;
    }

    try {
      // Sort data by Date
      // Sort data by Date (using sortedData from state should be enough, but ensuring here too)
      const sortedData = [...JobDataData].sort((a, b) => {
         const dateA = new Date(a.RawDate || a.Date.split('/').reverse().join('-'));
         const dateB = new Date(b.RawDate || b.Date.split('/').reverse().join('-'));
         return dateA - dateB;
      });
      const count = sortedData.length || 1; // Avoid division by zero

      // Calculate totals for numeric columns
      const totalTarget = sortedData.reduce(
        (sum, item) => sum + (item.Target || 0),
        0
      );
      const totalActual = sortedData.reduce(
        (sum, item) => sum + (item.Actual || 0),
        0
      );
      
      const totalRejections = sortedData.reduce(
        (sum, item) => sum + (item.Rejections || 0),
        0
      );
      
      const totalPerformancePoints = sortedData.reduce(
        (sum, item) => sum + (item.Performance || 0),
        0
      );

      // Percentage Formula for Performance: (Total Points / (Count * 50)) * 100
      const performancePercentage = count > 0 
        ? ((totalPerformancePoints / (count * 50)) * 100).toFixed(2) + "%" 
        : "0%";

      // Calculate Totals for Attendance and Punctuality for Percentage Formula
      const totalAttendancePoints = sortedData.reduce((sum, item) => sum + (item.Attendance === 5 ? 5 : (item.Attendance || 0)), 0);
      const totalPunctualityPoints = sortedData.reduce((sum, item) => sum + (item.Punctuality || 0), 0);

      const attendancePercentage = count > 0 ? ((totalAttendancePoints / (count * 5)) * 100).toFixed(2) + "%" : "0%";
      const punctualityPercentage = count > 0 ? ((totalPunctualityPoints / (count * 5)) * 100).toFixed(2) + "%" : "0%";
      
      // Calculate Totals for Rejections, 5S, PPE, Discipline for Percentage Formula
      // Formula: (Total Points / (Count * 10)) * 100
      // Note: totalRejections was already calculated above
      const total5S = sortedData.reduce((sum, item) => sum + (item["5S"] || 0), 0);
      const totalPPE = sortedData.reduce((sum, item) => sum + (item.PPE || 0), 0);
      const totalDiscipline = sortedData.reduce((sum, item) => sum + (item.Disclipline || 0), 0);

      const rejectionsPercentage = count > 0 ? ((totalRejections / (count * 10)) * 100).toFixed(2) + "%" : "0%";
      const fiveSPercentage = count > 0 ? ((total5S / (count * 10)) * 100).toFixed(2) + "%" : "0%";
      const ppePercentage = count > 0 ? ((totalPPE / (count * 10)) * 100).toFixed(2) + "%" : "0%";
      const disciplinePercentage = count > 0 ? ((totalDiscipline / (count * 10)) * 100).toFixed(2) + "%" : "0%";
      
      // Calculate AVERAGES for score columns (as per Excel formula)

      // Target/Actual can stay as Sum if needed, or Average? Excel had 'None' for Target.
      // But usually Target/Actual are Summed over a period.
      // User request specifically mentioned: "production performance, attendance, punchuality, rejections, 5S,safety &PPE usage, Discipline, total"
      // So Target/Actual might remain Sum. 
      // Checking Excel analysis: Index 6 (Actual) had 'TOTAL' text. Index 5 (Target) 'None'.
      // I'll keep them as Sum for now as it makes sense for quantity.
      
      const avgPerformance = (sortedData.reduce(
        (sum, item) => sum + (item.Performance || 0),
        0
      ) / count).toFixed(2);

      const avgAttendance = (JobDataData.reduce(
        (sum, item) => sum + (item.Attendance || 0),
        0
      ) / count).toFixed(2);

      const avgPunctuality = (JobDataData.reduce(
        (sum, item) => sum + (item.Punctuality || 0),
        0
      ) / count).toFixed(2);

      const avgRejections = (JobDataData.reduce(
        (sum, item) => sum + (item.Rejections || 0),
        0
      ) / count).toFixed(2);

      const avg5S = (JobDataData.reduce(
        (sum, item) => sum + (item["5S"] || 0),
        0
      ) / count).toFixed(2);

      const avgPPE = (JobDataData.reduce(
        (sum, item) => sum + (item.PPE || 0),
        0
      ) / count).toFixed(2);

      const avgDiscipline = (JobDataData.reduce(
        (sum, item) => sum + (item.Disclipline || 0),
        0
      ) / count).toFixed(2);

      // Final Total is Sum of the Averages
      const totalTotal = (
          parseFloat(avgPerformance) +
          parseFloat(avgAttendance) +
          parseFloat(avgPunctuality) +
          parseFloat(avgRejections) +
          parseFloat(avg5S) +
          parseFloat(avgPPE) +
          parseFloat(avgDiscipline)
      ).toFixed(2);

      const worksheetData = [
        ["Employee Job Card Data"],
        ["NAME:", employeeName, ""],
        ["ID NO.", employeeId || "", "", "", ""],
        [],
        [
          "SL NO.",
          "DATE",
          "SHIFT",
          "STAGE",
          "LINE",
          "Target",
          "Actual",
          "Production Performance",
          "Attendance",
          "Punctuality",
          "Rejections",
          "5S",
          "Safety & PPE Usage",
          "Discipline",
          "Total",
        ],
        ...JobDataData.map((item, index) => [
          index + 1,
          item.Date,
          item.SHIFTNAME || "",
          item.STAGE || "",
          item.LINE || "",
          item.Target || 0,
          item.Actual || 0,
          item.Performance || 0,
          (item.Attendance === 5 && (item.ATTENDANCE_Status === 'Authorized Leave' || item.ATTENDANCE_Status === 'Authorized')) 
            ? 5   // Value is 5, formatting will add "(Auth)"
            : (item.Attendance || 0),
          item.Punctuality || 0,
          item.Rejections || 0,
          item["5S"] || 0,
          item.PPE || 0,
          item.Disclipline || 0,
          item.Total || 0,
        ]),
        // ✅ Add Total Row
        [
          "",
          "",
          "",
          "",
          "TOTAL",
          totalTarget,
          totalActual,
          avgPerformance,
          avgAttendance,
          avgPunctuality,
          avgRejections,
          avg5S,
          avgPPE,
          avgDiscipline,
          totalTotal,
        ],
        // ✅ Add Percentage Row
        [
          "",
          "",
          "",
          "",
          "PERCENTAGE",
          "",
          "",
          performancePercentage,
          attendancePercentage,  // Index 8
          punctualityPercentage, // Index 9
          rejectionsPercentage,  // Index 10
          fiveSPercentage,       // Index 11
          ppePercentage,         // Index 12
          disciplinePercentage,  // Index 13
          "",
        ],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Inject Formulas
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      // Data starts at Row index 5 (Excel Row 6) because Header is at index 4
      const dataStartRow = 5; 
      const dataEndRow = range.e.r - 2; // Last data row (before Total and Percentage rows)

      for (let R = dataStartRow; R <= dataEndRow; ++R) {
        // Column O (Index 14) is Total. Range H (7) to N (13) are metrics.
        // Excel rows are 1-based, so R + 1
        const rowNum = R + 1;
        const totalCellRef = XLSX.utils.encode_cell({ c: 14, r: R });
        // Formula: SUM(H{row}:N{row})
        worksheet[totalCellRef] = { f: `SUM(H${rowNum}:N${rowNum})`, t: 'n' }; 
      }

      // Summary Total Row (Average of Totals)
      // The "Total" summary cell is at [Range.e.r-1][14] (Column O)
      const summaryTotalRowIndex = range.e.r - 1;
      const summaryTotalCellRef = XLSX.utils.encode_cell({ c: 14, r: summaryTotalRowIndex });
      // Formula: AVERAGE(O6:O{LastDataRow})
      worksheet[summaryTotalCellRef] = { f: `AVERAGE(O${dataStartRow + 1}:O${dataEndRow + 1})`, t: 'n' };

      // Merge title
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, // adjust merge based on last column
      ];

      // Set column widths
      worksheet["!cols"] = Array(15).fill({ wch: 15 });

      // Apply styles
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = { c: C, r: R };
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          let cell = worksheet[cell_ref];
          
          // Ensure cell exists for styling even if empty
          if (!cell) {
              cell = { v: "" };
              worksheet[cell_ref] = cell;
          }

          if (cell) {
            // Apply Custom Format for Authorized Leave
            // Data rows are from index 5 to dataEndRow. 
            // R corresponds to Excel row (0-based index in loop)
            // JobDataData index = R - 5
            if (R >= 5 && R <= dataEndRow && C === 8) { // Column 8 is Attendance (I)
                const dataIndex = R - 5;
                if (dataIndex >= 0 && dataIndex < JobDataData.length) {
                    const item = JobDataData[dataIndex];
                    if (item.Attendance === 5 && (item.ATTENDANCE_Status === 'Authorized Leave' || item.ATTENDANCE_Status === 'Authorized')) {
                        cell.z = '0 " (Auth)"'; // Custom Number Format
                    }
                }
            }

            // Title row
            if (R === 0) {
              cell.s = {
                font: { name: "Arial", sz: 14, bold: true },
                fill: { fgColor: { rgb: "FFFF00" } },
                alignment: { horizontal: "center", vertical: "center" },
              };
            }
            // Header row
            else if (R === 4) {
              cell.s = {
                font: { name: "Arial", sz: 10, bold: true },
                fill: { fgColor: { rgb: "D9E1F2" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                  top: { style: "thin" },
                  bottom: { style: "thin" },
                  left: { style: "thin" },
                  right: { style: "thin" },
                },
              };
            }
            // Total row & Percentage row
            else if (R === range.e.r || R === range.e.r - 1) {
              cell.s = {
                font: {
                  name: "Arial",
                  sz: 10,
                  bold: true,
                  color: { rgb: "FFFFFF" },
                },
                fill: { fgColor: { rgb: "4472C4" } }, // Dark Blue background
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                  top: { style: "thin" },
                  bottom: { style: "thin" },
                  left: { style: "thin" },
                  right: { style: "thin" },
                },
              };
            }
            // Normal cells
            else {
              cell.s = {
                font: { name: "Arial", sz: 10 },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                  top: { style: "thin" },
                  bottom: { style: "thin" },
                  left: { style: "thin" },
                  right: { style: "thin" },
                },
              };
            }
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Employee Job Card Data"
      );

      const fileName = `EmployeeJobCardDownload__${employeeName}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setError("");
    } catch (error) {
      console.error("Error downloading Excel:", error);
      setError("Failed to download Excel file. Please try again.");
    }
  };



  const resetFilters = () => {
    setEmployeeName("");
    setJobDataData([]);
    setError("");
  };

  return (
    <Container 
      fluid
      className="container-fluid"
      style={{
        backgroundImage: `url(${emvLogo})`,
        backgroundSize: "auto",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        minHeight: "100vh",
        opacity: "0.9",
        paddingTop: "20px",
        maxWidth: "100%",
      }}
    >
      <h2 className="title mb-3">Employee Job Card Data</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loadingEmployees ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading employees...</p>
        </div>
      ) : (
        <>
      <div className="glass-card p-4 mb-4">
      <Row className="mb-3">
     
       
        <Col md={3}>
            <label className="form-label">Select Employee</label>
            <Select
              options={employeeOptions}
              value={selectedEmployee}
              onChange={handleEmployeeChange}
              onInputChange={handleSearchInputChange}
              placeholder="Type to search employee..."
              isClearable
              isLoading={loadingEmployees}
              isDisabled={loadingEmployees}
              noOptionsMessage={noOptionsMessage}
              filterOption={null}
              menuIsOpen={employeeIdInput.length > 0 ? undefined : false}
            />
        </Col>

        <Col md={3}>
          <Form.Label>From Date *</Form.Label>
          <Form.Control
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </Col>

        <Col md={3}>
          <Form.Label>To Date *</Form.Label>
          <Form.Control
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />


        </Col>

       
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Button onClick={fetchJobData} disabled={loading} className="me-2">
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Loading...
              </>
            ) : (
              "Show JobData"
            )}
          </Button>
          <Button variant="outline-secondary" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>

        {JobDataData.length > 0 && (
          <Button variant="success" onClick={downloadExcel}>
            📥 Download Excel
          </Button>
        )}
      </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading employee ...</p>
        </div>
      ) : JobDataData.length > 0 ? (
        <>
          <div className="glass-card p-4">
          <Table striped bordered hover responsive className="glass-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Stage</th>
                <th>Line</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Performance</th>
                <th>Attendence</th>
                <th>Punctuality</th>
                <th>Rejections</th>
                <th>5S</th>
                <th>Safety & PPE Usage</th>
                <th>Discipline</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {JobDataData.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
            <td>{item.Date || item.Edatetime || item.DisplayDate}</td>
            <td>{item.SHIFTNAME || "N/A"}</td>
            <td>{item.STAGE || "N/A"}</td>
            <td>{item.LINE || "N/A"}</td>
            <td>{item.Target || 0}</td>
            <td>{item.Actual || 0}</td>
            <td>{item.Performance || 0}</td>
            <td>
              {(item.Attendance === 5 && (item.ATTENDANCE_Status === 'Authorized Leave' || item.ATTENDANCE_Status === 'Authorized')) 
                ? "5 (Auth)" 
                : (item.Attendance || 0)}
            </td>
            <td>{item.Punctuality || 0}</td>
            <td>{item.Rejections || 0}</td>
            <td>{item["5S"] || 0}</td>
            <td>{item.PPE || 0}</td>
            <td>{item.Disclipline || 0}</td>
            <td>{item.Total || 0}</td>
                </tr>
              ))}

              {/* Calculations for Web View */}
              {(() => {
                  const sortedData = JobDataData;
                  const count = sortedData.length || 1;
                  
                  const totalTarget = sortedData.reduce((sum, item) => sum + (item.Target || 0), 0);
                  const totalActual = sortedData.reduce((sum, item) => sum + (item.Actual || 0), 0);
                  
                  // Score Averages
                  const avgPerformance = (sortedData.reduce((sum, item) => sum + (item.Performance || 0), 0) / count).toFixed(2);
                  const avgAttendance = (sortedData.reduce((sum, item) => sum + ((item.Attendance === 5 && (item.ATTENDANCE_Status === 'Authorized Leave' || item.ATTENDANCE_Status === 'Authorized')) ? 5 : (item.Attendance || 0)), 0) / count).toFixed(2);
                  const avgPunctuality = (sortedData.reduce((sum, item) => sum + (item.Punctuality || 0), 0) / count).toFixed(2);
                  const avgRejections = (sortedData.reduce((sum, item) => sum + (item.Rejections || 0), 0) / count).toFixed(2);
                  const avg5S = (sortedData.reduce((sum, item) => sum + (item["5S"] || 0), 0) / count).toFixed(2);
                  const avgPPE = (sortedData.reduce((sum, item) => sum + (item.PPE || 0), 0) / count).toFixed(2);
                  const avgDiscipline = (sortedData.reduce((sum, item) => sum + (item.Disclipline || 0), 0) / count).toFixed(2);
                  
                  // Total of Averages
                  const totalTotal = (
                    parseFloat(avgPerformance) + parseFloat(avgAttendance) + parseFloat(avgPunctuality) + 
                    parseFloat(avgRejections) + parseFloat(avg5S) + parseFloat(avgPPE) + parseFloat(avgDiscipline)
                  ).toFixed(2);

                  // Percentage Calculations
                  const totalPerformancePoints = sortedData.reduce((sum, item) => sum + (item.Performance || 0), 0);
                  const performancePercentage = count > 0 ? ((totalPerformancePoints / (count * 50)) * 100).toFixed(2) + "%" : "0%";

                  const totalAttendancePoints = sortedData.reduce((sum, item) => sum + ((item.Attendance === 5 && (item.ATTENDANCE_Status === 'Authorized Leave' || item.ATTENDANCE_Status === 'Authorized')) ? 5 : (item.Attendance || 0)), 0);
                  const attendancePercentage = count > 0 ? ((totalAttendancePoints / (count * 5)) * 100).toFixed(2) + "%" : "0%";

                  const totalPunctualityPoints = sortedData.reduce((sum, item) => sum + (item.Punctuality || 0), 0);
                  const punctualityPercentage = count > 0 ? ((totalPunctualityPoints / (count * 5)) * 100).toFixed(2) + "%" : "0%";
                  
                  // For Rejection, 5S, PPE, Discipline: Formula is (Total / (Count * 10)) * 100
                  const totalRejectionsPoints = sortedData.reduce((sum, item) => sum + (item.Rejections || 0), 0);
                  const rejectionsPercentage = count > 0 ? ((totalRejectionsPoints / (count * 10)) * 100).toFixed(2) + "%" : "0%";

                  const total5S = sortedData.reduce((sum, item) => sum + (item["5S"] || 0), 0);
                  const fiveSPercentage = count > 0 ? ((total5S / (count * 10)) * 100).toFixed(2) + "%" : "0%";

                  const totalPPE = sortedData.reduce((sum, item) => sum + (item.PPE || 0), 0);
                  const ppePercentage = count > 0 ? ((totalPPE / (count * 10)) * 100).toFixed(2) + "%" : "0%";

                  const totalDiscipline = sortedData.reduce((sum, item) => sum + (item.Disclipline || 0), 0);
                  const disciplinePercentage = count > 0 ? ((totalDiscipline / (count * 10)) * 100).toFixed(2) + "%" : "0%";

                  return (
                      <>
                          {/* Total Row */}
                          <tr className="text-center fw-bold" style={{ backgroundColor: '#f8f9fa' }}>
                              <td colSpan="5" className="text-end">TOTAL</td>
                              <td>{totalTarget}</td>
                              <td>{totalActual}</td>
                              <td>{avgPerformance}</td>
                              <td>{avgAttendance}</td>
                              <td>{avgPunctuality}</td>
                              <td>{avgRejections}</td>
                              <td>{avg5S}</td>
                              <td>{avgPPE}</td>
                              <td>{avgDiscipline}</td>
                              <td>{totalTotal}</td>
                          </tr>
                          
                          {/* Percentage Row */}
                          <tr className="text-center fw-bold" style={{ backgroundColor: '#f8f9fa' }}>
                              <td colSpan="5" className="text-end">PERCENTAGE</td>
                              <td></td>
                              <td></td>
                              <td>{performancePercentage}</td>
                              <td>{attendancePercentage}</td>
                              <td>{punctualityPercentage}</td>
                              <td>{rejectionsPercentage}</td>
                              <td>{fiveSPercentage}</td>
                              <td>{ppePercentage}</td>
                              <td>{disciplinePercentage}</td>
                              <td></td>
                          </tr>
                      </>
                  );
              })()}
            </tbody>
          </Table>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted">
            No Employee  data found. Please select your filters 
          </p>
        </div>
      )}
        </>
      )}
    </Container>
  );
};

export default EmployeeJobCardDownload;