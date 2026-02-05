import React, { useState, useEffect } from "react";
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
import Select from "react-select"; // Import react-select
import emvLogo from "../pictures/emvlogo.png";
import "../styles/UserSkills.css";

const EmployeePunctuality = () => {
  const [employeeName, setEmployeeName] = useState("");
  const [allEmployees, setAllEmployees] = useState([]); // Stores all employees fetched initially
  const [employeeOptions, setEmployeeOptions] = useState([]); // Options for the Select component
  const [punctualityData, setPunctualityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employeeId, setEmployeeid] = useState();
  const [employeeIdInput, setEmployeeIdInput] = useState(""); // Tracks input for employee search
  const [isInactive, setIsInactive] = useState(false); // Toggle state

  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const formatDate = (date) => {
    if (!date) return ""; // avoid invalid value
    const d = new Date(date);
    if (isNaN(d.getTime())) return ""; // handle invalid date
    return d.toISOString().split("T")[0]; // yyyy-MM-dd
  };

  const formatDates = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string" || dateStr.trim() === "") {
      return "N/A";
    }

    const parts = dateStr.split("/");
    if (parts.length !== 3) {
      return "N/A";
    }

    const [day, month, year] = parts;
    return `${day}-${month}-${year}`; // dd-mm-yyyy
  };

  useEffect(() => {
    // Fetch employee list for dropdown
    const fetchEmployees = async () => {
      try {
        const url = isInactive
          ? "https://192.168.2.54/api/employees-inactive"
          : "https://192.168.2.54/api/employees";
        const res = await axios.get(url);
        if (Array.isArray(res.data)) {
          const formatted = res.data.map((emp) => ({
            value: emp.userid, // Use userid as value
            label: `${emp.userid} - ${emp.name}`, // Display userid and name
            name: emp.name, // Store name for later use
          }));
          setAllEmployees(formatted);
          setEmployeeOptions([]); // Initially no options until user types
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, [isInactive]);

  useEffect(() => {
    if (employeeIdInput.length > 0) {
      const filtered = allEmployees.filter((emp) => {
        const search = employeeIdInput.toLowerCase();
        return (
          String(emp.value).toLowerCase().startsWith(search) ||
          emp.name.toLowerCase().startsWith(search)
        );
      });
      setEmployeeOptions(filtered);
    } else {
      setEmployeeOptions([]); // Clear options if input is empty
    }
  }, [employeeIdInput, allEmployees]);

  const fetchPunctuality = async () => {
    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const endpoint = isInactive
        ? "https://192.168.2.54/api/employee-punctuality-inactive"
        : "https://192.168.2.54/api/employee-punctuality";
      const response = await axios.post(
        endpoint,
        {
          fromDate: formatDate(fromDate),
          toDate: formatDate(toDate),
          employeeId: employeeId, // ✅ send employeeId instead of name
        },
        { timeout: 330000 },
      );

      if (response.data && Array.isArray(response.data.records)) {
        setPunctualityData(response.data.records);
        if (response.data.records.length === 0) {
          setError("No Punctuality found for the selected filters.");
        }
      } else {
        setError("Invalid response format from server.");
      }
    } catch (error) {
      console.error("Error fetching employee Punctuality:", error);
      if (error.code === "ECONNABORTED") {
        setError("Request timeout. Please try again.");
      } else if (error.response) {
        setError(
          `Server error: ${error.response.data || error.response.statusText}`,
        );
      } else if (error.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setPunctualityData([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!Array.isArray(punctualityData) || punctualityData.length === 0) {
      setError("No Punctuality data to export.");
      return;
    }

    try {
      const worksheetData = [
        ["EMPLOYEE Punctuality"], // Main title
        ["NAME: ", employeeName, ""],
        ["ID NO.", employeeId || "", "", "", "TO"], // You can pass employeeId
        [], // Empty row
        [
          "SL NO.",
          "DATE",
          "SHIFT NAME",
          "SHIFT TIME",
          "IN-PUNCH TIME",
          "ACTUAL PUNCH",
          "PUNCTUALITY",
        ], // Table Header
        ...punctualityData.map((item, index) => [
          index + 1,
          formatDates(item.DATE),

          item.SHIFTNAME || "",
          item.SHIFT || "",
          item.ScheduledStart || "",
          item.ActualPunch || "",
          item.PUNCTUALITY || "",
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Merge cells for title and headers
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // EMPLOYEE Punctuality merged across 7 columns
      ];

      // Set column widths
      worksheet["!cols"] = [
        { wch: 8 }, // SL NO.
        { wch: 12 }, // DATE
        { wch: 15 }, // SHIFT
        { wch: 12 }, // LINE
        { wch: 15 }, // STAGE
        { wch: 15 }, // ATTENDANCE
        { wch: 20 }, // PUNCTUALITY
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Punctuality");

      const fileName = `EmployeePunctuality__${employeeName}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setError("");
    } catch (error) {
      console.error("Error downloading Excel:", error);
      setError("Failed to download Excel file. Please try again.");
    }
  };

  const resetFilters = () => {
    setEmployeeName("");
    setEmployeeid(""); // Clear selected employee ID
    setEmployeeIdInput(""); // Clear search input
    setPunctualityData([]);
    setError("");
    setFromDate(new Date());
    setToDate(new Date());
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
      }}
    >
      <h2 className="mb-4 text-center" style={{ paddingTop: "20px" }}>
        Employee Punctuality
      </h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <div className="glass-card p-4 mb-4">
        <div className="d-flex justify-content-end mb-2">
          <Form.Check
            type="switch"
            id="inactive-switch"
            label="Show Inactive Employees"
            checked={isInactive}
            onChange={(e) => setIsInactive(e.target.checked)}
            style={{ fontWeight: "bold", color: "white" }} 
          />
        </div>
        <Row className="mb-3">
          <Col md={4}>
            <label className="form-label">Employee</label>
            <Select
              options={employeeOptions}
              value={allEmployees.find(
                (option) => option.value === employeeId,
              )} // Set selected value
              onChange={(selected) => {
                setEmployeeid(selected ? selected.value : "");
                setEmployeeName(selected ? selected.name : ""); // Set employee name
              }}
              onInputChange={(val) => setEmployeeIdInput(val)}
              placeholder="Search Employee..."
              isClearable
              noOptionsMessage={() => "No matching employees"}
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "black",
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(10px)",
                }),
              }}
            />
          </Col>

          <Col md={4}>
            <Form.Label>From Date *</Form.Label>
            <Form.Control
              type="date"
              className="form-control glass-input"
              value={formatDate(fromDate)}
              onChange={(e) => setFromDate(new Date(e.target.value))}
              max={formatDate(new Date())}
            />
          </Col>

          <Col md={4}>
            <Form.Label>To Date *</Form.Label>
            <Form.Control
              type="date"
              className="form-control glass-input"
              value={formatDate(toDate)}
              onChange={(e) => setToDate(new Date(e.target.value))}
              max={formatDate(new Date())}
            />
          </Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <Button
              onClick={fetchPunctuality}
              disabled={loading}
              className="me-2 btn-primary"
            >
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
                "Show Punctuality"
              )}
            </Button>
            <Button variant="outline-secondary" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>

          {punctualityData.length > 0 && (
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
      ) : punctualityData.length > 0 ? (
        <>
          <Table striped bordered hover responsive className="glass-table">
            <thead className="thead-dark">
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Shift Name</th>
                <th>Shift Time</th>
                <th>In-Puch Time</th>
                <th>Actual Punch</th>
                <th>Punctuality</th>
              </tr>
            </thead>
            <tbody>
              {punctualityData.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{formatDates(item.DATE)}</td>

                  <td>{item.SHIFTNAME || "N/A"}</td>

                  <td>{item.SHIFT || "N/A"}</td>

                  <td>{item.ScheduledStart || "N/A"}</td>
                  <td>{item.ActualPunch || "N/A"}</td>
                  <td>{item.PUNCTUALITY || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <div className="text-center py-4 glass-card">
          <p className="text-muted">
            No employee Punctuality data found. Please select your filters and
            click "Show Punctuality" to view data.
          </p>
        </div>
      )}
    </Container>
  );
};

export default EmployeePunctuality;
