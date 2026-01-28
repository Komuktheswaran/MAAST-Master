import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Table,
  Button,
  Form,
  Container,
  Row,
  Col,
  Alert,
  Spinner,
  Pagination,
} from "react-bootstrap";
import { DateTime } from "luxon";

// Memoized Table Row Component
const LeaveRow = React.memo(
  ({ emp, onUpdate, onSave }) => {
    return (
      <tr>
        <td>{emp.ShiftDate}</td>
        <td>{emp.USERID}</td>
        <td>{emp.NAME}</td>
        <td>{emp.LINE}</td>
        <td>{emp.SHIFT_ID}</td>
        <td>
          <Form.Select
            value={emp.LeaveType || ""}
            onChange={(e) =>
              onUpdate(emp.USERID, emp.ShiftDate, "LeaveType", e.target.value)
            }
            className="border-secondary glass-input"
          >
            <option value="">Select Type</option>
            <option value="Authorized">Authorized</option>
            <option value="UnAuth">Unauthorized</option>
          </Form.Select>
          {emp.LeaveType === "Authorized" && (
            <Form.Select
              value={emp.LeaveCategory || ""}
              onChange={(e) =>
                onUpdate(
                  emp.USERID,
                  emp.ShiftDate,
                  "LeaveCategory",
                  e.target.value,
                )
              }
              className="border-secondary glass-input mt-2"
              size="sm"
            >
              <option value="">Select Category</option>
              <option value="Emergency">Emergency</option>
              <option value="Preapproved">PreInformed</option>
            </Form.Select>
          )}
        </td>
        <td>
          <Form.Control
            type="text"
            value={emp.Remarks || ""}
            placeholder="Enter remarks"
            onChange={(e) =>
              onUpdate(emp.USERID, emp.ShiftDate, "Remarks", e.target.value)
            }
            className="border-secondary glass-input"
          />
        </td>
        <td>
          <Button
            variant={emp.LeaveID ? "success" : "warning"}
            size="sm"
            onClick={() => onSave(emp)}
          >
            {emp.LeaveID ? "Update" : "Save"}
          </Button>
        </td>
      </tr>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent re-renders unless specific fields change
    return (
      prevProps.emp.LeaveType === nextProps.emp.LeaveType &&
      prevProps.emp.LeaveCategory === nextProps.emp.LeaveCategory &&
      prevProps.emp.Remarks === nextProps.emp.Remarks &&
      prevProps.emp.LeaveID === nextProps.emp.LeaveID // Check if ID exists (saved state)
    );
  },
);

const LeaveManagement = () => {
  const [fromDate, setFromDate] = useState(
    DateTime.now().toFormat("yyyy-MM-dd"),
  );
  const [toDate, setToDate] = useState(DateTime.now().toFormat("yyyy-MM-dd"));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  /* Filters */
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [shifts, setShifts] = useState([]);
  const [lines, setLines] = useState([]);

  /* Pagination State */
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 on search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  /* Fetch Filter Options on Mount */
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [shiftRes, lineRes] = await Promise.all([
          axios.get("https://192.168.2.54/api/shifts"),
          axios.get("https://192.168.2.54/api/lines"),
        ]);
        setShifts(shiftRes.data || []);
        setLines(lineRes.data || []);
      } catch (err) {
        console.error("Error fetching filters", err);
      }
    };
    fetchFilters();
  }, []);

  const fetchAbsent = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    setCurrentPage(1); // Reset pagination on fetch
    try {
      const res = await axios.get("https://192.168.2.54/api/leave/absent", {
        params: {
          fromDate,
          toDate,
          shift: selectedShift,
          line: selectedLine,
        },
      });
      setEmployees(res.data || []);
      if (res.data && res.data.length === 0) {
        setMessage("No absent employees found for this date range.");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching data. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async (emp) => {
    if (!emp.LeaveType) {
      alert("Please select a leave type");
      return;
    }
    try {
      await axios.post("https://192.168.2.54/api/leave", {
        userId: emp.USERID,
        date: emp.ShiftDate,
        leaveType: emp.LeaveType,
        remarks: emp.Remarks,
        leaveCategory:
          emp.LeaveType === "Authorized" ? emp.LeaveCategory : null,
        createdBy: sessionStorage.getItem("username") || "Admin",
      });
      alert("Saved successfully");
      // Optional: don't auto-fetch to preserve state/speed, or update local state to show 'Update' button
      // For now, we update local state to reflect it's saved if needed, or just let user know.
      // Ideally backend returns the new LeaveID.
    } catch (err) {
      console.error(err);
      alert("Error saving leave details");
    }
  }, []);

  const updateField = useCallback((id, shiftDate, field, value) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.USERID === id && e.ShiftDate === shiftDate
          ? { ...e, [field]: value }
          : e,
      ),
    );
  }, []);

  const exportToExcel = () => {
    import("xlsx").then((XLSX) => {
      const worksheet = XLSX.utils.json_to_sheet(
        employees.map((e) => ({
          "User ID": e.USERID,
          Name: e.NAME,
          Shift: e.SHIFT_ID,
          Line: e.LINE,
          Date: e.ShiftDate,
          "Leave Type": e.LeaveType || "",
          Remarks: e.Remarks || "",
        })),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Absent Report");
      XLSX.writeFile(workbook, `Absent_Report_${fromDate}_to_${toDate}.xlsx`);
    });
  };

  // Filtered Data
  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        (emp.USERID?.toLowerCase() || "").includes(
          debouncedSearchTerm.toLowerCase(),
        ) ||
        (emp.NAME?.toLowerCase() || "").includes(
          debouncedSearchTerm.toLowerCase(),
        ),
    );
  }, [employees, debouncedSearchTerm]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployees.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">Leave Management</h2>
      <div className="glass-card p-4 mb-4">
        <Row className="align-items-end">
          <Col md={2}>
            <Form.Label>From Date</Form.Label>
            <Form.Control
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-secondary glass-input"
            />
          </Col>
          <Col md={2}>
            <Form.Label>To Date</Form.Label>
            <Form.Control
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border-secondary glass-input"
            />
          </Col>
          <Col md={2}>
            <Form.Label>Filter Shift</Form.Label>
            <Form.Select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="border-secondary glass-input"
            >
              <option value="">All Shifts</option>
              {shifts.map((s, idx) => (
                <option key={idx} value={s.SHIFT_ID}>
                  {s.SHIFT_ID}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label>Filter Line</Form.Label>
            <Form.Select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="border-secondary glass-input"
            >
              <option value="">All Lines</option>
              {lines.map((l, idx) => (
                <option key={idx} value={l.LINE}>
                  {l.LINE}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={4} className="d-flex gap-2">
            <Button variant="primary" onClick={fetchAbsent} disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />{" "}
                  Loading...
                </>
              ) : (
                "Fetch Absent"
              )}
            </Button>
            {employees.length > 0 && (
              <Button variant="success" onClick={exportToExcel}>
                Export Excel
              </Button>
            )}
          </Col>
        </Row>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="info">{message}</Alert>}

      {!loading && employees.length > 0 && (
        <>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Control
                type="text"
                placeholder="Search by User ID or Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </Col>
          </Row>

          <div className="glass-card mb-4">
            <Table
              striped
              bordered
              hover
              responsive
              className="glass-table mb-0"
            >
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Line</th>
                  <th>Shift</th>
                  <th>Leave Type</th>
                  <th>Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((emp) => (
                  <LeaveRow
                    key={`${emp.USERID}-${emp.ShiftDate}`}
                    emp={emp}
                    onUpdate={updateField}
                    onSave={handleSave}
                  />
                ))}
              </tbody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.First
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                />

                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  // Show window of pages around current or start
                  let pageNum = currentPage - 2 + idx;
                  if (currentPage < 3) pageNum = 1 + idx;
                  if (pageNum > totalPages) return null;
                  if (pageNum < 1) return null;

                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={pageNum === currentPage}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Pagination.Item>
                  );
                })}

                <Pagination.Next
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
                <Pagination.Last
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default LeaveManagement;
