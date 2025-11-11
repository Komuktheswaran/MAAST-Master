import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useTable } from "react-table";
import axios from "axios";
import { DateTime } from "luxon";
import {
  FaFileDownload,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  Container,
  Button,
  CircularProgress,
  Snackbar,
  IconButton,
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";
import "../styles/UserShiftUpload.css"; // Custom CSS

const UserShiftUpload = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [notification, setNotification] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // State for loading
  const [snackbarOpen, setSnackbarOpen] = useState(false); // State for Snackbar

  // Conflict state:
  const [conflictRows, setConflictRows] = useState([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // Find all rows with duplicate User IDs (col0)
  function findConflictingRows(rows) {
    const idMap = {};
    rows.forEach((row) => {
      const userId = row.col0;
      if (!userId) return;
      if (!idMap[userId]) idMap[userId] = [];
      idMap[userId].push(row);
    });
    // Return rows for any userId found more than once
    return Object.values(idMap)
      .filter((arr) => arr.length > 1)
      .flat();
  }

  const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) {
    setMessage("No file selected.");
    setSnackbarOpen(true);
    return;
  }
  const reader = new FileReader();

  reader.onload = (e) => {
    const binaryStr = e.target.result;
    const workbook = XLSX.read(binaryStr, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Extract headers (dates start from index 4 assuming fixed format)
    const headers = jsonData[0];
    // Rows without header row
    const rows = jsonData.slice(1);

    // Transform wide format data to long array of shifts expected by backend
    const transformedData = [];

    rows.forEach((row, rowIndex) => {
      const userid = row[0];
      const userName = row[1]; // optional
      const stageName = row[2];
      const line = row[3];
      // Dates start from col index 4 in your sample
      for (let colIdx = 4; colIdx < row.length; colIdx++) {
        const shiftId = row[colIdx];
        const dateRaw = headers[colIdx];
        if (shiftId && shiftId !== "") {
          // Normalize date format (dd-MM-yyyy to yyyy-MM-dd)
          const parts = dateRaw.split("-");
          const normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

          // Create shift object matching backend expected keys
          transformedData.push({
            userid: userid,
            STAGE_NAME: stageName,
            LINE: line,
            Shift_date_from: normalizedDate,
            Shift_date_to: normalizedDate,
            SHIFT_ID: shiftId,
          });
        }
      }
    });

    // Now set transformed data for use in UI and for sending to backend
    setData(transformedData);

    // Columns for display can also be updated as needed, e.g.:
    setColumns([
      { Header: "User ID", accessor: "userid" },
      { Header: "Stage Name", accessor: "STAGE_NAME" },
      { Header: "Line", accessor: "LINE" },
      { Header: "Shift Date From", accessor: "Shift_date_from" },
      { Header: "Shift Date To", accessor: "Shift_date_to" },
      { Header: "Shift ID", accessor: "SHIFT_ID" },
    ]);

    setNotification("File uploaded and data transformed successfully");
    setShowTable(true);
  };

  reader.readAsBinaryString(file);
};

  
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // For banner close
  const handleCloseConflictWarning = () => {
    setShowConflictWarning(false);
  };

  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") {
      return null;
    }
    const isDDMMYYYY = DateTime.fromFormat(dateStr, "dd-MM-yyyy").isValid;
    const isYYYYMMDD = DateTime.fromFormat(dateStr, "yyyy-MM-dd").isValid;
    if (isDDMMYYYY) {
      return DateTime.fromFormat(dateStr, "dd-MM-yyyy").toFormat("yyyy-MM-dd");
    } else if (isYYYYMMDD) {
      return dateStr;
    } else {
      dateStr = null;
    }
    return dateStr;
  };

  const handleUserShifts = async () => {
    setLoading(true);
    const batchSize = 50;
    const totalRecords = data.length;
    let allInvalidRows = [];
    let allDuplicates = [];
    for (let i = 0; i < totalRecords; i += batchSize) {
      const currentBatch = data.slice(i, i + batchSize);
      try {
        const response = await axios.post(
          "https://192.168.2.54:443/api/saveUserShifts",
          currentBatch,
          { headers: { "Content-Type": "application/json" } }
        );
        if (response.data.invalidRows && response.data.invalidRows.length > 0) {
          allInvalidRows = [...allInvalidRows, ...response.data.invalidRows];
        }
        if (response.data.duplicates && response.data.duplicates.length > 0) {
          allDuplicates = [...allDuplicates, ...response.data.duplicates];
        }
        setMessage(
          `Processed ${Math.min(
            i + batchSize,
            totalRecords
          )} of ${totalRecords} records...`
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error("❌ Error saving shifts:", error);
        setMessage("Error saving shifts. Please try again.");
        setLoading(false);
        return;
      }
    }

    const allFailedRows = [...allInvalidRows, ...allDuplicates];
    if (allFailedRows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(allFailedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Failed Rows");
      XLSX.writeFile(wb, "FailedUserShifts.xlsx");
      setMessage(
        `⚠️ ${allFailedRows.length} rows failed. Downloaded "FailedUserShifts.xlsx" with details.`
      );
    } else {
      setMessage("✅ All shifts processed successfully!");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 5000);
  };

  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "https://192.168.2.54:443/download-template";
    link.download = "skill upload.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export conflicts as Excel
  const handleDownloadConflictReport = () => {
    const ws = XLSX.utils.json_to_sheet(conflictRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conflicts");
    XLSX.writeFile(wb, "ShiftConflicts.xlsx");
  };

  const tableInstance = useTable({ columns, data });

  // Column names for the conflict table
  const conflictColHeaders = columns.length
    ? columns
    : [
        { Header: "Row", accessor: "row" },
        { Header: "User_ID", accessor: "col0" },
      ];

  return (
    <Container maxWidth="lg" style={{ maxWidth: "100%" }}>
      <h2 className="title">User Shift Upload</h2>
      <div className="file-upload">
        <input
          className="input-file"
          type="file"
          accept=".xlsx"
          onChange={handleFileUpload}
        />
      </div>
      {notification && (
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={notification}
        />
      )}

      {data.length > 0 && (
        <div className="d-flex justify-content-between mb-3">
          <Button variant="contained" onClick={() => setShowTable(!showTable)}>
            {showTable ? (
              <>
                <FaEyeSlash className="icon" /> Hide Data
              </>
            ) : (
              <>
                <FaEye className="icon" /> View Data
              </>
            )}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUserShifts}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <FaSave className="icon" /> Save
              </>
            )}
          </Button>
        </div>
      )}
      <div className="d-flex justify-content-first mb-3">
        <Button variant="contained" onClick={downloadTemplate}>
          <FaFileDownload className="icon" /> Download Sample Template
        </Button>
      </div>

      {/* Conflict/Warning Banner */}
      {showConflictWarning && conflictRows.length > 0 && (
        <div
          style={{
            background: "#fdecea",
            color: "#611a15",
            border: "1px solid #f5c6cb",
            padding: "18px",
            borderRadius: "8px",
            margin: "22px 0 10px 0",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div
              style={{
                fontWeight: "bold",
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              <FaExclamationTriangle
                style={{
                  marginRight: "10px",
                  color: "#c92a2a",
                  fontSize: "1.3em",
                }}
              />
              {conflictRows.length} Conflict{conflictRows.length !== 1 && "s"}{" "}
              Detected!
            </div>
            <IconButton
              aria-label="close"
              size="small"
              onClick={handleCloseConflictWarning}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </div>
          <div style={{ margin: "8px 0", fontSize: "1rem" }}>
            Same user(s) assigned to different stages or rows at the same time.
            <br />
            Please fix the Excel file before uploading.
          </div>
          <Button
            variant="contained"
            style={{
              background: "#f8d7da",
              color: "#c82333",
              margin: "8px 0 12px 0",
              fontWeight: "bold",
            }}
            onClick={handleDownloadConflictReport}
          >
            <FaFileDownload style={{ marginRight: 8 }} /> Download Conflict
            Report
          </Button>
          {/* Conflict Table */}
          <div style={{ maxHeight: 260, overflow: "auto", marginTop: 10 }}>
            <table
              style={{
                width: "100%",
                border: "1px solid #e4a1a8",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ background: "#f6b7b7", color: "#611a15" }}>
                  <th style={{ padding: 7, border: "1px solid #e4a1a8" }}>
                    Row
                  </th>
                  {conflictColHeaders.map((col, idx) => (
                    <th
                      key={idx}
                      style={{ padding: 7, border: "1px solid #e4a1a8" }}
                    >
                      {col.Header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conflictRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 6, border: "1px solid #e4a1a8" }}>
                      {row.id + 2}
                    </td>
                    {conflictColHeaders.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        style={{ padding: 6, border: "1px solid #e4a1a8" }}
                      >
                        {row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {message && <div className="message">{message}</div>}
      {showTable && data.length > 0 && (
        <table className="data-table" {...tableInstance.getTableProps()}>
          <thead>
            {tableInstance.headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
                {headerGroup.headers.map((column) => (
                  <th
                    {...column.getHeaderProps()}
                    key={column.id}
                    style={{
                      backgroundColor: "#484c61ff",
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "center",
                      padding: "10px",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    {column.render("Header")}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...tableInstance.getTableBodyProps()}>
            {tableInstance.rows.map((row) => {
              tableInstance.prepareRow(row);
              return (
                <tr {...row.getRowProps()} key={row.id}>
                  {row.cells.map((cell) => (
                    <td {...cell.getCellProps()} key={cell.column.id}>
                      {cell.render("Cell")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Container>
  );
};

export default UserShiftUpload;
