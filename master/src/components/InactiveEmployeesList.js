import React, { useState, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Table,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import axios from "axios";
import * as XLSX from "xlsx";
import emvLogo from "../pictures/emvlogo.png";
import "../styles/UserSkills.css"; // Reuse the glass styles used across reports

const API_BASE = "https://192.168.2.54";
const PAGE_SIZE = 500;

// Column definitions shared by the on-screen table and the Excel export.
// `key` matches the field name returned by /api/inactive-employees-list.
const COLUMNS = [
  { key: "Username", label: "User Name" },
  { key: "EmployeeID", label: "Employee ID" },
  { key: "JoinDT", label: "Join Date", isDate: true },
  { key: "ConfirmDT", label: "Confirm Date", isDate: true },
  { key: "LeaveDT", label: "Leave Date", isDate: true },
  { key: "EnrollDT", label: "Enroll Date", isDate: true },
  { key: "Education", label: "Education" },
  { key: "Designation", label: "Designation" },
];

// Format a date value as dd-mm-yyyy (blank if empty/invalid)
const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const cellValue = (row, col) => {
  const raw = row[col.key];
  if (col.isDate) return formatDate(raw);
  return raw === null || raw === undefined ? "" : raw;
};

const InactiveEmployeesList = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false); // initial "List" load
  const [loadingMore, setLoadingMore] = useState(false); // subsequent pages
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [hasListed, setHasListed] = useState(false);

  // Filters
  const [search, setSearch] = useState(""); // Employee ID or User Name
  const [fromDate, setFromDate] = useState(""); // Leave date range (YYYY-MM-DD)
  const [toDate, setToDate] = useState("");

  const hasMore = rows.length < total;

  // Build the filter params sent to the API (only include non-empty values).
  const buildFilterParams = useCallback(() => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return params;
  }, [search, fromDate, toDate]);

  // Fetch one page (PAGE_SIZE rows) starting at the given offset and append it.
  const fetchPage = useCallback(async (startOffset, replace) => {
    const isFirst = startOffset === 0;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);
    setError("");

    try {
      const res = await axios.get(`${API_BASE}/api/inactive-employees-list`, {
        params: { limit: PAGE_SIZE, offset: startOffset, ...buildFilterParams() },
        timeout: 120000,
      });

      const newRows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setTotal(res.data?.total ?? 0);
      setRows((prev) => (replace ? newRows : [...prev, ...newRows]));
      setOffset(startOffset + newRows.length);
      setHasListed(true);

      if (isFirst && newRows.length === 0) {
        setError("No inactive employees found.");
      }
    } catch (err) {
      console.error("Error fetching inactive employees:", err);
      if (err.code === "ECONNABORTED") {
        setError("Request timed out. Please try again.");
      } else if (err.response) {
        setError(
          `Server error: ${err.response.data?.error || err.response.statusText}`,
        );
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildFilterParams]);

  const handleList = () => {
    setRows([]);
    setOffset(0);
    setTotal(0);
    fetchPage(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) fetchPage(offset, false);
  };

  const handleResetFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setRows([]);
    setOffset(0);
    setTotal(0);
    setHasListed(false);
    setError("");
  };

  // Download ALL matching inactive employees as an Excel file
  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/api/inactive-employees-list`, {
        params: { all: 1, ...buildFilterParams() },
        timeout: 300000,
      });

      const allRows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      if (allRows.length === 0) {
        setError("No inactive employees to download.");
        return;
      }

      const worksheetData = [
        COLUMNS.map((c) => c.label),
        ...allRows.map((row) => COLUMNS.map((col) => cellValue(row, col))),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 25 }, // User Name
        { wch: 14 }, // Employee ID
        { wch: 14 }, // Join Date
        { wch: 14 }, // Confirm Date
        { wch: 14 }, // Leave Date
        { wch: 14 }, // Enroll Date
        { wch: 22 }, // Education
        { wch: 25 }, // Designation
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inactive Employees");

      const today = formatDate(new Date());
      XLSX.writeFile(workbook, `Inactive_Employees_${today}.xlsx`);
    } catch (err) {
      console.error("Error downloading inactive employees:", err);
      setError("Failed to download Excel file. Please try again.");
    } finally {
      setDownloading(false);
    }
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
        Inactive List Download
      </h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <div
        className="glass-card p-4 mb-4"
        style={{ position: "relative", zIndex: 20 }}
      >
        <Row className="mb-3">
          <Col md={4} className="mb-2">
            <Form.Label>Search (Employee ID / User Name)</Form.Label>
            <Form.Control
              type="text"
              className="glass-input"
              placeholder="Enter Employee ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleList();
              }}
            />
          </Col>
          <Col md={3} className="mb-2">
            <Form.Label>Leave Date From</Form.Label>
            <Form.Control
              type="date"
              className="glass-input"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </Col>
          <Col md={3} className="mb-2">
            <Form.Label>Leave Date To</Form.Label>
            <Form.Control
              type="date"
              className="glass-input"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
            />
          </Col>
          <Col md={2} className="mb-2 d-flex align-items-end">
            <Button
              variant="outline-secondary"
              className="w-100"
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Button onClick={handleList} disabled={loading} className="btn-primary">
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
              "List Inactive Employees"
            )}
          </Button>

          <Button
            variant="success"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Preparing...
              </>
            ) : (
              "📥 Download Inactive Employees"
            )}
          </Button>

          {hasListed && total > 0 && (
            <span className="ms-auto fw-bold" style={{ color: "#333" }}>
              Showing {rows.length} of {total}
            </span>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <Table striped bordered hover responsive className="glass-table">
            <thead className="thead-dark">
              <tr>
                <th>S.No</th>
                {COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.EmployeeID}-${index}`}>
                  <td>{index + 1}</td>
                  {COLUMNS.map((col) => (
                    <td key={col.key}>{cellValue(row, col) || "N/A"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="text-center py-3">
            {hasMore ? (
              <Button
                variant="outline-primary"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
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
                  `Load More (${total - rows.length} remaining)`
                )}
              </Button>
            ) : (
              <p className="text-muted mb-0">All {total} inactive employees loaded.</p>
            )}
          </div>
        </>
      )}

      {hasListed && rows.length === 0 && !loading && (
        <div className="text-center py-4 glass-card">
          <p className="text-muted mb-0">No inactive employees found.</p>
        </div>
      )}
    </Container>
  );
};

export default InactiveEmployeesList;
