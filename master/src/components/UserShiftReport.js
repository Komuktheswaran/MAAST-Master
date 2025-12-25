import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Form,
  Container,
  Row,
  Col,
  Table,
  Button,
  Spinner,
  Alert,
  FormControl,
  InputGroup,
  Card,
  Accordion,
} from "react-bootstrap";
import { IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FaSort, FaDownload } from "react-icons/fa";
import moment from "moment";
import * as FileSaver from "file-saver";
import * as XLSX from "xlsx";
import "../styles/UserShiftReport.css";

const baseURL = "https://103.38.50.149:5000/api";

const UserShiftReport = () => {
  const [userShifts, setUserShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState("");
  const [searchUserShift, setSearchUserShift] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Filter States
  const [selectedFromDate, setSelectedFromDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedToDate, setSelectedToDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedShiftIds, setSelectedShiftIds] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);

  // Options States
  const [shiftOptions, setShiftOptions] = useState([]);
  const [stageOptions, setStageOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);

  // Fetch filter options on mount only
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [shiftsRes, stagesRes, linesRes] = await Promise.all([
        axios.get(`${baseURL}/shifts_list`),
        axios.get(`${baseURL}/stages_list`),
        axios.get(`${baseURL}/lines`),
      ]);
      console.log(shiftsRes.data);
      console.log(stagesRes.data);
      console.log(linesRes.data);
      setShiftOptions(shiftsRes.data);
      setStageOptions(stagesRes.data);
      setLineOptions(linesRes.data);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  const fetchUserShifts = async () => {
    setLoading(true);
    setNotification("");
    setUserShifts([]); // Clear previous data while loading

    try {
      const params = {
        fromDate: selectedFromDate,
        toDate: selectedToDate,
        shifts: selectedShiftIds.join(","),
        stages: selectedStages.join(","),
        lines: selectedLines.join(","),
      };

      const response = await axios.get(`${baseURL}/getUserShifts`, { params });
      
      if (response.data.length === 0) {
        setNotification("No records found matching the selected filters.");
      } else {
         // console.log("Fetched User Shifts:", response.data);
      setUserShifts(response.data);
      }
    } catch (error) {
      console.error("Error fetching user shifts:", error);
      setNotification("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShowReport = () => {
    fetchUserShifts();
    setCurrentPage(1);
  };

  const handleSearchUser = (e) => {
    setSearchUserShift(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getFilteredAndSortedData = () => {
    let filtered = userShifts;

    if (searchUserShift) {
      const lowerSearch = searchUserShift.toLowerCase();
      filtered = filtered.filter((shift) =>
        Object.values(shift).some(
          (val) => val && val.toString().toLowerCase().includes(lowerSearch)
        )
      );
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  };

  const paginatedData = getFilteredAndSortedData().slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(getFilteredAndSortedData().length / pageSize);

  const handleDownload = () => {
    const dataToExport = getFilteredAndSortedData();
    const formattedData = dataToExport.map((shift) => ({
      "User ID": shift.userid || "",
      "User Name": shift.user_name || "",
      "SHIFT ID": shift.SHIFT_ID || "",
      "Stage Name": shift.Stage_name || "",
      "Shift Date From": formatDate(shift.Shift_date_from) || "",
      "Shift Date To": formatDate(shift.Shift_date_to) || "",
      "Line": shift.LINE || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UserShifts");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    FileSaver.saveAs(blob, `UserShifts_${moment().format("YYYY-MM-DD")}.xlsx`);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const m = moment(date);
    return m.isValid() ? m.format("DD-MM-YYYY") : date;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key === columnKey) {
      return (
        <FaSort
          className={
            sortConfig.direction === "asc" ? "rotate-up" : "rotate-down"
          }
        />
      );
    }
    return <FaSort />;
  };

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, "gi");
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={index} className="highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <Container fluid>
      <Row className="mt-4">
        <Col md={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>User Shift Details</h2>
            <div style={{ width: "300px" }}>
              <InputGroup>
                <InputGroup.Text><SearchIcon /></InputGroup.Text>
                <FormControl
                  placeholder="Search in loaded data..."
                  value={searchUserShift}
                  onChange={handleSearchUser}
                />
              </InputGroup>
            </div>
          </div>

          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Row className="align-items-end g-3 mb-3">
                 <Col md={3}>
                    <Form.Label><strong>From Date</strong></Form.Label>
                    <FormControl
                      type="date"
                      value={selectedFromDate}
                      onChange={(e) => setSelectedFromDate(e.target.value)}
                    />
                 </Col>
                 <Col md={3}>
                    <Form.Label><strong>To Date</strong></Form.Label>
                    <FormControl
                      type="date"
                      value={selectedToDate}
                      onChange={(e) => setSelectedToDate(e.target.value)}
                    />
                 </Col>
                 <Col md={2}>
                    <Button variant="primary" className="w-100" onClick={handleShowReport} disabled={loading}>
                        {loading ? <Spinner animation="border" size="sm" /> : "Show"}
                    </Button>
                 </Col>
              </Row>

              <h5 className="mb-3">Filters (Shifts, Stages, Lines)</h5>
              <Row>
                <Col md={4}>
                  <h6>Shifts</h6>
                  <div className="filter-box" style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
                      {shiftOptions.map((shift) => (
                          <Form.Check 
                              key={shift.SFTID}
                              type="checkbox"
                              label={shift.SFTName || shift.SFTID}
                              checked={selectedShiftIds.includes(shift.SFTID)}
                              onChange={() => {
                                  setSelectedShiftIds(prev => prev.includes(shift.SFTID) ? prev.filter(id => id !== shift.SFTID) : [...prev, shift.SFTID])
                              }}
                          />
                      ))}
                  </div>
                </Col>
                 <Col md={4}>
                  <h6>Stages</h6>
                  <div className="filter-box" style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
                       {stageOptions.map((stage) => (
                          <Form.Check 
                              key={stage.Stage_id}
                              type="checkbox"
                              label={stage.Stage_name}
                              checked={selectedStages.includes(stage.Stage_name)}
                              onChange={() => {
                                  setSelectedStages(prev => prev.includes(stage.Stage_name) ? prev.filter(n => n !== stage.Stage_name) : [...prev, stage.Stage_name])
                              }}
                          />
                      ))}
                  </div>
                </Col>
                 <Col md={4}>
                  <h6>Lines</h6>
                  <div className="filter-box" style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
                       {lineOptions.filter(l => l.LINE || l.LineName || l.lineName).map((line) => {
                          const lineName = line.LINE || line.LineName || line.lineName;
                          return (
                          <Form.Check 
                              key={line.id || lineName}
                              type="checkbox"
                              label={lineName}
                              checked={selectedLines.includes(lineName)}
                               onChange={() => {
                                  setSelectedLines((prev) =>
                                    prev.includes(lineName)
                                      ? prev.filter((name) => name !== lineName)
                                      : [...prev, lineName]
                                  );
                                }}
                          />
                          );
                       })}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {notification && <Alert variant="info">{notification}</Alert>}

          {userShifts.length > 0 && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5>Total Records: <strong>{userShifts.length}</strong></h5>
                    <Button variant="success" size="sm" onClick={handleDownload}>
                        <FaDownload /> Download Excel
                    </Button>
                </div>
                <Table striped bordered hover responsive>
                    <thead>
                    <tr>
                        <th onClick={() => handleSort("userid")}>User ID <SortIcon columnKey="userid" /></th>
                        <th onClick={() => handleSort("user_name")}>User Name <SortIcon columnKey="user_name" /></th>
                        <th onClick={() => handleSort("SHIFT_ID")}>Shift ID <SortIcon columnKey="SHIFT_ID" /></th>
                        <th onClick={() => handleSort("Stage_name")}>Stage Name <SortIcon columnKey="Stage_name" /></th>
                        <th onClick={() => handleSort("Shift_date_from")}>From Date <SortIcon columnKey="Shift_date_from" /></th>
                        <th onClick={() => handleSort("Shift_date_to")}>To Date <SortIcon columnKey="Shift_date_to" /></th>
                        <th onClick={() => handleSort("LINE")}>Line <SortIcon columnKey="LINE" /></th>
                    </tr>
                    </thead>
                    <tbody>
                    {paginatedData.map((shift, index) => (
                        <tr key={index}>
                            <td>{highlightText(shift.userid || "", searchUserShift)}</td>
                            <td>{highlightText(shift.user_name || "", searchUserShift)}</td>
                            <td>{highlightText(shift.SHIFT_ID || "", searchUserShift)}</td>
                            <td>{highlightText(shift.Stage_name || "", searchUserShift)}</td>
                            <td>{highlightText(formatDate(shift.Shift_date_from), searchUserShift)}</td>
                            <td>{highlightText(formatDate(shift.Shift_date_to), searchUserShift)}</td>
                            <td>{highlightText(shift.LINE || "", searchUserShift)}</td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
                
                 <div className="d-flex justify-content-between table-controls">
                    <Button
                    variant="primary"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    >
                    Prev
                    </Button>
                    <span>
                    Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                    variant="primary"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    >
                    Next
                    </Button>
                </div>
              </>
          )}

        </Col>
      </Row>
    </Container>
  );
};

export default UserShiftReport;
