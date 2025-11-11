import React, { useState, useEffect, useRef } from "react";
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
import { DateTime } from "luxon";
import * as XLSX from "xlsx";

// Custom Dropdown with Checkboxes Component
const MultiSelectDropdown = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  labelKey,
  valueKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleItemChange = (value) => {
    if (value === "ALL") {
      if (selectedValues.includes("ALL")) {
        onSelectionChange([]);
      } else {
        onSelectionChange(["ALL"]);
      }
    } else {
      let newSelection = selectedValues.filter((v) => v !== "ALL");

      if (newSelection.includes(value)) {
        newSelection = newSelection.filter((v) => v !== value);
      } else {
        newSelection = [...newSelection, value];
      }

      onSelectionChange(newSelection);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.includes("ALL")) {
      return "ALL Selected";
    }
    if (selectedValues.length === 1) {
      return selectedValues[0];
    }
    return `${selectedValues.length} items selected`;
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <div
        className="form-select d-flex justify-content-between align-items-center"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer" }}
      >
        <span className={selectedValues.length === 0 ? "text-muted" : ""}>
          {getDisplayText()}
        </span>
      </div>

      {isOpen && (
        <div
          className="position-absolute w-100 bg-white border border-secondary rounded mt-1 shadow"
          style={{
            zIndex: 1050,
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <div className="p-2">
            {/* ALL Option */}
            <div className="form-check mb-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="all-option"
                checked={selectedValues.includes("ALL")}
                onChange={() => handleItemChange("ALL")}
              />
              <label className="form-check-label fw-bold" htmlFor="all-option">
                ALL
              </label>
            </div>

            <hr className="my-2" />

            {/* Individual Options */}
            {options.map((option, idx) => (
              <div key={idx} className="form-check mb-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`option-${idx}`}
                  checked={selectedValues.includes(option[valueKey])}
                  onChange={() => handleItemChange(option[valueKey])}
                  disabled={selectedValues.includes("ALL")}
                />
                <label
                  className="form-check-label"
                  htmlFor={`option-${idx}`}
                  style={{
                    opacity: selectedValues.includes("ALL") ? 0.5 : 1,
                  }}
                >
                  {option[labelKey]}
                </label>
              </div>
            ))}

            {options.length === 0 && (
              <div className="text-muted p-2">No options available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Summary = () => {
  // ✅ State for date range
  const [fromDate, setFromDate] = useState(
    DateTime.now().minus({ days: 7 }).toISODate()
  );
  const [toDate, setToDate] = useState(DateTime.now().toISODate());

  // ✅ Removed duplicate selectedDate state
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Fetch dropdown options on component mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        console.log("Fetching dropdown options...");

        const [shiftRes, lineRes] = await Promise.all([
          axios.get("https://192.168.2.54:443/api/shifts"),
          axios.get("https://192.168.2.54:443/api/lines"),
        ]);

        console.log("Shift options response:", shiftRes.data);
        console.log("Line options response:", lineRes.data);

        const shifts = Array.isArray(shiftRes.data) ? shiftRes.data : [];
        const lines = Array.isArray(lineRes.data) ? lineRes.data : [];

        setShiftOptions(shifts);
        setLineOptions(lines);
      } catch (err) {
        console.error("Error fetching dropdown options:", err);
        setError(
          `Failed to load dropdown options: ${err.message}. Please refresh the page.`
        );
      }
    };
    fetchOptions();
  }, []);

  // ✅ Unified handleSubmit function
  const handleSubmit = async () => {
    // Validate dates
    if (!fromDate || !toDate) {
      setError("Please select both From Date and To Date");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setError("From Date cannot be after To Date");
      return;
    }

    // Validate selections
    if (selectedShifts.length === 0) {
      setError("Please select at least one shift.");
      return;
    }

    if (selectedLines.length === 0) {
      setError("Please select at least one line.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const params = {
        fromDate: fromDate,
        toDate: toDate,
      };

      // Handle multiple shifts
      if (selectedShifts.includes("ALL")) {
        params.shifts = shiftOptions.map((s) => s.SHIFT_ID).join(",");
      } else {
        params.shifts = selectedShifts.join(",");
      }

      // Handle multiple lines
      if (selectedLines.includes("ALL")) {
        params.lines = lineOptions.map((l) => l.LINE).join(",");
      } else {
        params.lines = selectedLines.join(",");
      }

      console.log("Sending request with params:", params);

      const response = await axios.get(
        "https://192.168.2.54:443/api/attendance/overall-summary",
        { params, timeout: 60000 }
      );

      console.log("API Response:", response.data);

      if (Array.isArray(response.data)) {
        setSummaryData(response.data);
        if (response.data.length === 0) {
          setError("No data found for the selected filters.");
        }
      } else {
        setError("Invalid response format from server.");
      }
    } catch (err) {
      console.error("Error fetching summary:", err);

      if (err.code === "ECONNABORTED") {
        setError("Request timeout. Please try again.");
      } else if (err.response) {
        setError(
          `Server error: ${err.response.data?.error || err.response.statusText}`
        );
      } else if (err.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }

      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Export to Excel function
  const exportToExcel = () => {
    if (summaryData.length === 0) {
      alert("No data to export");
      return;
    }

    const formattedData = summaryData.map((item) => ({
      Date: item.DATE
        ? DateTime.fromJSDate(new Date(item.DATE)).toFormat("yyyy-MM-dd")
        : "N/A",
      Shift: item.SHIFT || "N/A",
      Line: item.LINE || "N/A",
      Allotted: item.ALLOTTED || 0,
      Present: item.PRESENT || 0,
      Absent: item.ABSENT || 0,
      "Attendance %":
        item.ALLOTTED > 0
          ? ((item.PRESENT / item.ALLOTTED) * 100).toFixed(1) + "%"
          : "0.0%",
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Summary");

    const fileName = `Attendance_Summary_${fromDate}_to_${toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ✅ Reset filters function
  const resetFilters = () => {
    setFromDate(DateTime.now().minus({ days: 7 }).toISODate());
    setToDate(DateTime.now().toISODate());
    setSelectedShifts([]);
    setSelectedLines([]);
    setSummaryData([]);
    setError("");
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Filtered Attendance Summary</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* ✅ Updated Form with From Date and To Date */}
      <Row className="mb-3">
        <Col md={3}>
          <Form.Label>From Date *</Form.Label>
          <Form.Control
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate}
          />
        </Col>

        <Col md={3}>
          <Form.Label>To Date *</Form.Label>
          <Form.Control
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate}
            max={DateTime.now().toISODate()}
          />
        </Col>

        <Col md={3}>
          <Form.Label>Shift *</Form.Label>
          <MultiSelectDropdown
            options={shiftOptions}
            selectedValues={selectedShifts}
            onSelectionChange={setSelectedShifts}
            placeholder="Select Shift"
            labelKey="SHIFT_ID"
            valueKey="SHIFT_ID"
          />
          {selectedShifts.length > 0 && (
            <small className="text-muted mt-1 d-block">
              <strong>Selected:</strong>{" "}
              {selectedShifts.includes("ALL")
                ? "ALL"
                : selectedShifts.join(", ")}
            </small>
          )}
        </Col>

        <Col md={3}>
          <Form.Label>Line *</Form.Label>
          <MultiSelectDropdown
            options={lineOptions}
            selectedValues={selectedLines}
            onSelectionChange={setSelectedLines}
            placeholder="Select Line"
            labelKey="LINE"
            valueKey="LINE"
          />
          {selectedLines.length > 0 && (
            <small className="text-muted mt-1 d-block">
              <strong>Selected:</strong>{" "}
              {selectedLines.includes("ALL") ? "ALL" : selectedLines.join(", ")}
            </small>
          )}
        </Col>
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Button onClick={handleSubmit} disabled={loading} className="me-2">
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
              "Show Summary"
            )}
          </Button>
          <Button variant="outline-secondary" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>

        {summaryData.length > 0 && (
          <Button variant="success" onClick={exportToExcel}>
            📥 Download Excel
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading attendance summary...</p>
        </div>
      ) : summaryData.length > 0 ? (
        <>
          <div className="mb-2">
            <small className="text-muted">
              Found {summaryData.length} record(s) from {fromDate} to {toDate}
              {!selectedShifts.includes("ALL") &&
                selectedShifts.length > 0 &&
                ` - Shifts: ${selectedShifts.join(", ")}`}
              {selectedShifts.includes("ALL") && ` - Shifts: ALL`}
              {!selectedLines.includes("ALL") &&
                selectedLines.length > 0 &&
                ` - Lines: ${selectedLines.join(", ")}`}
              {selectedLines.includes("ALL") && ` - Lines: ALL`}
            </small>
          </div>

          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Line</th>
                <th>Allotted</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map((item, index) => {
                const attendancePercentage =
                  item.ALLOTTED > 0
                    ? ((item.PRESENT / item.ALLOTTED) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={index}>
                    <td>
                      {item.DATE
                        ? DateTime.fromJSDate(new Date(item.DATE)).toFormat(
                            "yyyy-MM-dd"
                          )
                        : "N/A"}
                    </td>
                    <td>{item.SHIFT || "N/A"}</td>
                    <td>{item.LINE || "N/A"}</td>
                    <td>{item.ALLOTTED || 0}</td>
                    <td className="text-success fw-bold">
                      {item.PRESENT || 0}
                    </td>
                    <td className="text-danger">{item.ABSENT || 0}</td>
                    <td>{attendancePercentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {summaryData.length > 0 && (
            <div className="mt-3">
              <h5>Summary Totals:</h5>
              <Table bordered size="sm" className="w-auto">
                <tbody>
                  <tr>
                    <td>
                      <strong>Total Allotted:</strong>
                    </td>
                    <td>
                      {summaryData.reduce(
                        (sum, item) => sum + (item.ALLOTTED || 0),
                        0
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Total Present:</strong>
                    </td>
                    <td className="text-success">
                      {summaryData.reduce(
                        (sum, item) => sum + (item.PRESENT || 0),
                        0
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Total Absent:</strong>
                    </td>
                    <td className="text-danger">
                      {summaryData.reduce(
                        (sum, item) => sum + (item.ABSENT || 0),
                        0
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Overall Attendance:</strong>
                    </td>
                    <td>
                      {(() => {
                        const totalAllotted = summaryData.reduce(
                          (sum, item) => sum + (item.ALLOTTED || 0),
                          0
                        );
                        const totalPresent = summaryData.reduce(
                          (sum, item) => sum + (item.PRESENT || 0),
                          0
                        );
                        const percentage =
                          totalAllotted > 0
                            ? ((totalPresent / totalAllotted) * 100).toFixed(1)
                            : "0.0";
                        return `${percentage}%`;
                      })()}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted">
            No attendance data found. Please select your filters and click "Show
            Summary" to view data.
          </p>
        </div>
      )}
    </Container>
  );
};

export default Summary;
