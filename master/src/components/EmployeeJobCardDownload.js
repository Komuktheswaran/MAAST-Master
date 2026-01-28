import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Table,
  Spinner,
  Alert,
  Card,
} from "react-bootstrap";
import Select from "react-select";
import axios from "axios";
import * as XLSX from "xlsx";
import { FaFileExcel } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
} from "recharts";
import emvLogo from "../pictures/emvlogo.png"; // Ensure this path is correct

const EmployeeJobCardDownload = () => {
  const [reportType, setReportType] = useState("date-range"); // date-range, month-wise, unit-wise
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedLine, setSelectedLine] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);

  const [JobDataData, setJobDataData] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [monthlyRawData, setMonthlyRawData] = useState([]);

  const [unitBuckets, setUnitBuckets] = useState({});
  const [chartData, setChartData] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [selectedShift, setSelectedShift] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState("");
  const [lines, setLines] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Fetch Lines and Shifts on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const lineRes = await axios.get("https://192.168.2.54/api/lines");
        if (lineRes.data && Array.isArray(lineRes.data)) setLines(lineRes.data);

        const shiftRes = await axios.get("https://192.168.2.54/api/shifts");
        if (shiftRes.data) setShifts(shiftRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMeta();
  }, []);

  // Fetch Employees
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await axios.get(
          "https://192.168.2.54/api/employees-showall",
        );
        if (response.data && Array.isArray(response.data)) {
          const activeUsers = response.data.filter(
            (user) => user.UserIDEnbl === 1,
          );
          setAllEmployees(activeUsers);
          const options = activeUsers.map((user) => ({
            value: user.userid,
            label: `${user.name} (${user.userid})`,
            id: user.userid,
            name: user.name,
          }));
          setEmployeeOptions(options);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
        setError("Failed to load employee list.");
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleSearchInputChange = (newValue) => {
    setEmployeeIdInput(newValue);
  };

  const handleEmployeeChange = (selectedOption) => {
    setSelectedEmployee(selectedOption);
  };

  const noOptionsMessage = () => {
    return employeeIdInput.length > 0 ? "No user found" : "Type to search...";
  };

  // --- Calculations ---

  const calculateWeightedScore = (userData) => {
    const count = userData.length || 1;
    // Calculate Averages for each category
    const avgPerformance =
      userData.reduce((sum, item) => sum + (item.Performance || 0), 0) / count;

    // Attendance Special Logic: return 5 if Attendance is 5 AND Status is Authorized/Authorized Leave
    const avgAttendance =
      userData.reduce((sum, item) => {
        const val =
          item.Attendance === 5 &&
          (item.ATTENDANCE_Status === "Authorized Leave" ||
            item.ATTENDANCE_Status === "Authorized")
            ? 5
            : item.Attendance || 0;
        return sum + val;
      }, 0) / count;

    const avgPunctuality =
      userData.reduce((sum, item) => sum + (item.Punctuality || 0), 0) / count;
    const avgRejections =
      userData.reduce((sum, item) => sum + (item.Rejections || 0), 0) / count;
    const avg5S =
      userData.reduce((sum, item) => sum + (item["5S"] || 0), 0) / count;
    const avgPPE =
      userData.reduce((sum, item) => sum + (item.Safety || 0), 0) / count;
    const avgDiscipline =
      userData.reduce((sum, item) => sum + (item.Discipline || 0), 0) / count;

    const totalScore =
      avgPerformance +
      avgAttendance +
      avgPunctuality +
      avgRejections +
      avg5S +
      avgPPE +
      avgDiscipline;

    return {
      count,
      avgPerformance: avgPerformance.toFixed(2),
      avgAttendance: avgAttendance.toFixed(2),
      avgPunctuality: avgPunctuality.toFixed(2),
      avgRejections: avgRejections.toFixed(2),
      avg5S: avg5S.toFixed(2),
      avgPPE: avgPPE.toFixed(2),
      avgDiscipline: avgDiscipline.toFixed(2),
      totalScore: totalScore.toFixed(2),
    };
  };

  // --- Fetch Methods ---

  const fetchJobData = async () => {
    if (!selectedEmployee || !fromDate || !toDate) {
      setError("Please select Employee, From Date and To Date.");
      return;
    }
    setLoading(true);
    setError("");
    setJobDataData([]);

    try {
      const response = await axios.post(
        "https://192.168.2.54/api/employee-Jobreport",
        {
          employeeId: selectedEmployee.value,
          fromDate,
          toDate,
        },
      );
      console.log("Job Data: ", response.data);

      if (response.data && Array.isArray(response.data.records)) {
        setJobDataData(response.data.records);
      } else {
        setError("No data found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    if (!fromMonth || !toMonth) {
      setError("Please select From Month and To Month.");
      return;
    }

    setLoading(true);
    setError("");
    setMonthlySummary([]);
    setMonthlyRawData([]);

    try {
      const response = await axios.post(
        "https://192.168.2.54/api/monthly-job-card-report",
        {
          fromMonth,
          toMonth,
          employeeId: selectedEmployee ? selectedEmployee.value : null,
          line: selectedLine || null,
        },
        // IMPORTANT: We need JSON response for the preview table, NOT blob.
        // If we want to download Excel, we use generateMonthlyExcel.
        // But here we are fetching data to SHOW in the grid.
        { timeout: 600000000 },
      );
      console.log("Monthly Data: ", response.data);

      if (response.data && response.data.success) {
        // Updated Logic: Backend now returns 'summary' instead of raw 'records' to avoid crash.
        const summary = response.data.summary || [];
        const records = response.data.records || []; // Fallback if backend not updated

        if (summary.length === 0 && records.length === 0) {
          setError("No data found for the selected range.");
          setLoading(false);
          return;
        }

        // --- Generate Month Keys ---
        let current = new Date(fromMonth + "-01");
        const end = new Date(toMonth + "-01");
        const monthKeys = []; // YYYY-MM
        const monthLabels = []; // Month Name YYYY

        while (current <= end) {
          const y = current.getFullYear();
          const m = String(current.getMonth() + 1).padStart(2, "0");
          monthKeys.push(`${y}-${m}`);
          monthLabels.push(
            current.toLocaleString("default", {
              month: "long",
              year: "numeric",
            }),
          );
          current.setMonth(current.getMonth() + 1);
        }

        // --- Prepare Summary Data (Matrix) ---
        // Header Row
        const headerRow = ["Sl no", "ID No", "Name", ...monthLabels];
        const matrixRows = [];

        // Add Header
        matrixRows.push(headerRow);

        let index = 1;

        if (summary.length > 0) {
          // New Path: Use Server Aggregated Summary
          summary.forEach((user) => {
            const row = [index++, user.id, user.name];
            monthKeys.forEach((mKey) => {
              const score = user.monthlyScores[mKey];
              row.push(score ? score : 0);
            });
            matrixRows.push(row);
          });
        } else {
          // Old Path: Client Side Aggregation (Legacy Support)
          const usersMap = new Map();
          records.forEach((record) => {
            const uid = record.UserID || record.USERID;
            const uname = record.Name || record.NAME;
            if (!usersMap.has(uid)) {
              usersMap.set(uid, {
                name: uname || "Unknown",
                id: uid,
                data: [],
                monthData: new Map(),
              });
            }
            const user = usersMap.get(uid);
            let rDateObj = null;
            if (record.RawDate) rDateObj = new Date(record.RawDate);
            else if (record.Edatetime) rDateObj = new Date(record.Edatetime);

            if (rDateObj && !isNaN(rDateObj.getTime())) {
              const mKey = rDateObj.toISOString().substring(0, 7);
              if (!user.monthData.has(mKey)) user.monthData.set(mKey, []);
              user.monthData.get(mKey).push(record);
            }
          });

          usersMap.forEach((user) => {
            const row = [index++, user.id, user.name];
            monthKeys.forEach((mKey) => {
              const mRecords = user.monthData.get(mKey);
              if (mRecords && mRecords.length > 0) {
                const stats = calculateWeightedScore(mRecords);
                row.push(stats.totalScore);
              } else {
                row.push(0);
              }
            });
            matrixRows.push(row);
          });
        }

        setMonthlySummary(matrixRows);
        setMonthlyRawData(records); // Note: this might be empty now if using summary
      } else {
        setError("No records found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch monthly data.");
    } finally {
      setLoading(false);
    }
  };
  const generateMonthlyExcel = async () => {
    if (!fromMonth || !toMonth) {
      setError("Please select From Month and To Month.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "https://192.168.2.54/api/monthly-job-card-excel",
        {
          fromMonth,
          toMonth,
          employeeId: selectedEmployee ? selectedEmployee.value : null,
          line: selectedLine || null,
        },
        {
          responseType: "blob", // Important for file download
          timeout: 60000000000000000000000000000000000000000000000000, // Large timeout for generation
        },
      );

      // Trigger Download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Monthly_Report_${fromMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel Download Error:", err);
      setError("Failed to download excel. Check server logs.");
      if (err.response && err.response.data) {
        // Try to read blob as text to see error message
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const msg = JSON.parse(reader.result);
            console.error(msg);
          } catch (e) {}
        };
        reader.readAsText(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitData = async () => {
    if (!fromMonth || !toMonth) {
      setError("Please select From Month and To Month.");
      return;
    }

    setLoading(true);
    setError("");
    setUnitBuckets({});
    setChartData([]);

    try {
      const response = await axios.post(
        "https://192.168.2.54/api/unit-wise-report",
        {
          fromMonth,
          toMonth,
          shift: selectedShift, // Pass selectedShift
          line: selectedLine,
        },
      );

      console.log("Unit Data:", response.data);

      if (response.data && response.data.success) {
        const records = response.data.records;

        // Bucket Logic
        const buckets = {
          "90-100%": [],
          "80-90%": [],
          "70-80%": [],
          "60-70%": [],
          "Below 60%": [],
        };

        records.forEach((rec) => {
          const score = parseFloat(rec.AvgTotal) || 0;
          if (score >= 90)
            buckets["90-100%"].push({ ...rec, totalScore: score });
          else if (score >= 80)
            buckets["80-90%"].push({ ...rec, totalScore: score });
          else if (score >= 70)
            buckets["70-80%"].push({ ...rec, totalScore: score });
          else if (score >= 60)
            buckets["60-70%"].push({ ...rec, totalScore: score });
          else buckets["Below 60%"].push({ ...rec, totalScore: score });
        });

        setUnitBuckets(buckets);

        // Chart Data
        const cData = [
          { name: "90-100%", count: buckets["90-100%"].length },
          { name: "80-90%", count: buckets["80-90%"].length },
          { name: "70-80%", count: buckets["70-80%"].length },
          { name: "60-70%", count: buckets["60-70%"].length },
          { name: "Below 60%", count: buckets["Below 60%"].length },
        ];
        setChartData(cData);

        if (records.length === 0) setError("No records found.");
      } else {
        setError("Failed to fetch unit data.");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching unit wise report.");
    } finally {
      setLoading(false);
    }
  };

  const generateUnitExcel = () => {
    // Export all buckets in one file with multiple sheets? Or one sheet?
    // Let's do one sheet with sections or multiple sheets. Multiple sheets is cleaner.
    try {
      const wb = XLSX.utils.book_new();
      Object.keys(unitBuckets).forEach((key) => {
        if (unitBuckets[key].length > 0) {
          const data = unitBuckets[key].map((u) => ({
            ID: u.USERID,
            Name: u.NAME,
            "Total Score": u.totalScore,
            Performance: u.avgPerformance,
            Attendance: u.avgAttendance,
            Punctuality: u.avgPunctuality,
            Rejections: u.avgRejections,
            "5S": u.avg5S,
            PPE: u.avgPPE,
            Discipline: u.avgDiscipline,
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, key.replace(/[<>%]/g, ""));
        }
      });
      XLSX.writeFile(wb, "Unit_Analysis_Report.xlsx");
    } catch (e) {
      console.error(e);
      setError("Download failed");
    }
  };

  const resetFilters = () => {
    setEmployeeIdInput("");
    setSelectedEmployee(null);
    setJobDataData([]);
    setError("");
    setMonthlySummary([]);
    setChartData([]);
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
        opacity: "0.95",
        paddingTop: "20px",
        backgroundColor: "#f4f6f9",
      }}
    >
      <h2 className="mb-4 text-center text-dark fw-bold">
        Employee Job Card Data
      </h2>

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
          <div className="glass-card p-4 mb-4 shadow rounded bg-white">
            {/* Toggle Report Type */}
            <div className="d-flex justify-content-center mb-4">
              <div className="btn-group" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="reportType"
                  id="typeDateRange"
                  checked={reportType === "date-range"}
                  onChange={() => setReportType("date-range")}
                />
                <label
                  className="btn btn-outline-primary"
                  htmlFor="typeDateRange"
                >
                  Date Range (Individual)
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="reportType"
                  id="typeMonthWise"
                  checked={reportType === "month-wise"}
                  onChange={() => setReportType("month-wise")}
                />
                <label
                  className="btn btn-outline-primary"
                  htmlFor="typeMonthWise"
                >
                  Month Wise (Summary)
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="reportType"
                  id="typeUnitWise"
                  checked={reportType === "unit-wise"}
                  onChange={() => setReportType("unit-wise")}
                />
                <label
                  className="btn btn-outline-primary"
                  htmlFor="typeUnitWise"
                >
                  Unit Wise (Graph)
                </label>
              </div>
            </div>

            <Row className="mb-3 g-3">
              {/* Filters */}
              {(reportType === "date-range" || reportType === "month-wise") && (
                <Col md={3}>
                  <Form.Label>
                    Select Employee{" "}
                    {reportType === "month-wise" && "(Optional)"}
                  </Form.Label>
                  <Select
                    options={employeeOptions}
                    value={selectedEmployee}
                    onChange={handleEmployeeChange}
                    onInputChange={handleSearchInputChange}
                    placeholder="Search employee..."
                    isClearable={true}
                    filterOption={(candidate, input) => {
                      if (!input) return true;
                      const search = input.toLowerCase();
                      // Check ID (value) or Name
                      // candidate.data contains { value, label, id, name }
                      const id =
                        candidate.data.value?.toString().toLowerCase() || "";
                      const name =
                        candidate.data.name?.toString().toLowerCase() || "";
                      return id.startsWith(search) || name.startsWith(search);
                    }}
                  />
                </Col>
              )}

              {reportType === "date-range" ? (
                <>
                  <Col md={3}>
                    <Form.Label>From Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>To Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </Col>
                </>
              ) : (
                <>
                  <Col md={2}>
                    <Form.Label>From Month</Form.Label>
                    <Form.Control
                      type="month"
                      value={fromMonth}
                      onChange={(e) => setFromMonth(e.target.value)}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>To Month</Form.Label>
                    <Form.Control
                      type="month"
                      value={toMonth}
                      onChange={(e) => setToMonth(e.target.value)}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Line (Optional)</Form.Label>
                    <Form.Select
                      value={selectedLine}
                      onChange={(e) => setSelectedLine(e.target.value)}
                    >
                      <option value="">All Lines</option>
                      {lines.map((l, i) => (
                        <option key={i} value={l.LINE}>
                          {l.LINE}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </>
              )}

              {reportType === "unit-wise" && (
                <Col md={3}>
                  <Form.Label>Shift (Optional)</Form.Label>
                  <Form.Select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                  >
                    <option value="">All Shifts</option>
                    {shifts.map((s) => (
                      <option key={s.SFTID} value={s.SFTID}>
                        {s.SFTName}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              )}
            </Row>

            <div className="d-flex justify-content-between">
              <div>
                {reportType === "date-range" && (
                  <Button
                    variant="primary"
                    onClick={fetchJobData}
                    disabled={loading}
                    className="me-2"
                  >
                    Show JobData
                  </Button>
                )}
                {reportType === "month-wise" && (
                  <Button
                    variant="success"
                    onClick={fetchMonthlyData}
                    disabled={loading}
                    className="me-2"
                  >
                    Show Monthly Data
                  </Button>
                )}
                {reportType === "unit-wise" && (
                  <div className="d-flex gap-2">
                    <Button
                      variant="warning"
                      onClick={fetchUnitData}
                      disabled={loading}
                    >
                      Analyze Performance
                    </Button>
                    {Object.keys(unitBuckets).length > 0 && (
                      <Button variant="success" onClick={generateUnitExcel}>
                        <FaFileExcel className="me-2" /> Download Report
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  variant="outline-secondary"
                  onClick={resetFilters}
                  className="ms-2"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p>Loading Data...</p>
            </div>
          )}

          {/* RESULTS: DATE RANGE */}
          {reportType === "date-range" &&
            JobDataData.length > 0 &&
            !loading && (
              <div className="glass-card p-4 bg-white shadow rounded">
                <div className="d-flex justify-content-end mb-2">
                  <Button variant="success" size="sm" onClick={downloadExcel}>
                    <FaFileExcel className="me-1" /> Download Excel
                  </Button>
                </div>
                <Table responsive striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Line</th>
                      <th>Target</th>
                      <th>Actual</th>
                      <th>Perf.</th>
                      <th>Att.</th>
                      <th>Punct.</th>
                      <th>Rej.</th>
                      <th>5S</th>
                      <th>Safety</th>
                      <th>Disc.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {JobDataData.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.Date || item.Edatetime}</td>
                        <td>{item.SHIFTNAME}</td>
                        <td>{item.LINE}</td>
                        <td>{item.Target}</td>
                        <td>{item.Actual}</td>
                        <td>{item.Performance}</td>
                        <td>
                          {item.Attendance === 5 &&
                          item.ATTENDANCE_Status?.includes("Auth")
                            ? "5 (Auth)"
                            : item.Attendance}
                        </td>
                        <td>{item.Punctuality}</td>
                        <td>{item.Rejections}</td>
                        <td>{item["5S"]}</td>
                        <td>{item.Safety}</td>
                        <td>{item.Discipline}</td>
                        <td>
                          <strong>{item.Total}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-secondary fw-bold">
                      <td colSpan={3} className="text-end">
                        Total / Average:
                      </td>
                      <td>
                        {JobDataData.reduce(
                          (sum, item) => sum + (parseFloat(item.Target) || 0),
                          0,
                        )}
                      </td>
                      <td>
                        {JobDataData.reduce(
                          (sum, item) => sum + (parseFloat(item.Actual) || 0),
                          0,
                        )}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.Performance) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.Attendance) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.Punctuality) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.Rejections) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) => sum + (parseFloat(item["5S"]) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) => sum + (parseFloat(item.Safety) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.Discipline) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                      <td>
                        {(
                          JobDataData.reduce(
                            (sum, item) => sum + (parseFloat(item.Total) || 0),
                            0,
                          ) / (JobDataData.length || 1)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            )}

          {/* RESULTS: MONTH WISE */}
          {reportType === "month-wise" &&
            monthlySummary.length > 0 &&
            !loading && (
              <div className="glass-card p-4 bg-white shadow rounded mt-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4>Monthly Summary</h4>
                  <Button variant="success" onClick={generateMonthlyExcel}>
                    <FaFileExcel /> Excel
                  </Button>
                </div>
                <div
                  className="table-responsive"
                  style={{ maxHeight: "500px" }}
                >
                  <Table striped bordered hover className="text-center">
                    <thead className="table-dark">
                      <tr>
                        {monthlySummary[0].map((header, i) => (
                          <th key={i}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.slice(1).map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}

          {/* RESULTS: UNIT WISE (GRAPH) */}
          {reportType === "unit-wise" && chartData.length > 0 && !loading && (
            <div className="glass-card p-4 bg-white shadow rounded mt-3">
              <h4 className="text-center mb-4">Performance Distribution</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Employees"
                    onClick={(data) => setSelectedBucket(data.name)}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {selectedBucket && unitBuckets[selectedBucket] && (
                <div className="mt-4">
                  <h5></h5>
                  {(() => {
                    const bucketData = unitBuckets[selectedBucket] || [];
                    const monthKeys =
                      bucketData.length > 0 && bucketData[0].monthlyScores
                        ? Object.keys(bucketData[0].monthlyScores)
                        : [];

                    return (
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Total Score</th>
                            <th>Perf.</th>
                            <th>Att.</th>
                            <th>Rej.</th>
                            {monthKeys.map((m) => (
                              <th key={m}>{m}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bucketData.map((u, i) => (
                            <tr key={i}>
                              <td>{u.USERID}</td>
                              <td>{u.NAME}</td>
                              <td>
                                <strong>{u.totalScore}</strong>
                              </td>
                              <td>{u.avgPerformance}</td>
                              <td>{u.avgAttendance}</td>
                              <td>{u.avgRejections}</td>
                              {monthKeys.map((m) => (
                                <td key={m}>
                                  {u.monthlyScores && u.monthlyScores[m]
                                    ? u.monthlyScores[m]
                                    : "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default EmployeeJobCardDownload;
