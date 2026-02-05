import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Table,
  Spinner,
} from "react-bootstrap";
import { BsTrash, BsDownload, BsInfoCircle } from "react-icons/bs";
import { FaSort } from "react-icons/fa";
import * as XLSX from "xlsx";
import "../styles/UserSkills.css";
import emvLogo from "../pictures/emvlogo.png";
import { Popover, Typography } from "@mui/material";

const baseURL = "https://192.168.2.54/api";

const UserSkills = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [stages, setStages] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userSkills, setUserSkills] = useState([]);
  const [userDetails, setUserDetails] = useState([]); // New State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchUserskill, setsearchUserskill] = useState("");
  const [notification, setNotification] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedSearchUserSkill, setDebouncedSearchUserSkill] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverContent, setPopoverContent] = useState("");
  const isOpen = Boolean(anchorEl);

  // Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchUserSkill(searchUserskill);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchUserskill]);

  useEffect(() => {
    fetchDepartments();
    fetchStages();
    fetchSkills();
    fetchUserSkills();
    fetchUserDetails(); // Fetch detailed info
  }, []);

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(`${baseURL}/user-details`);
      setUserDetails(response.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${baseURL}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchStages = async () => {
    try {
      const response = await axios.get(`${baseURL}/stagemaster`);
      setStages(response.data);
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await axios.get(`${baseURL}/skillmaster`);
      setSkills(response.data);
    } catch (error) {
      console.error("Error fetching skills:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      if (selectedDepartments.length === 0) {
        setNotification("No dept selected, please select the dept");
      } else {
        console.log(selectedDepartments.length);
        const response = await axios.post(`${baseURL}/employees`, {
          departments: selectedDepartments,
        });
        setEmployees(response.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleDepartmentChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedDepartments([...selectedDepartments, value]);
    } else {
      setSelectedDepartments(
        selectedDepartments.filter((deptId) => deptId !== value),
      );
    }
  };

  const handleShowEmployees = async () => {
    setLoading(true);
    await fetchEmployees();
    setLoading(false);
  };

  const handleEmployeeChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedEmployees([...selectedEmployees, value]);
    } else {
      setSelectedEmployees(
        selectedEmployees.filter((empId) => empId !== value),
      );
    }
  };

  const handleStageChange = (event, stageId) => {
    const { checked } = event.target;
    if (checked) {
      setSelectedStages([...selectedStages, stageId]);
    } else {
      setSelectedStages(selectedStages.filter((id) => id !== stageId));
    }
  };

  const handleRatingChange = (event, stageId) => {
    const { value } = event.target;
    setRatings({
      ...ratings,
      [stageId]: value,
    });
  };

  const handleSaveSkills = async () => {
    setLoading(true);
    try {
      const dataToSave = selectedEmployees.map((empId) => {
        const empSkills = selectedStages.map((stageId) => ({
          stageId,
          rating: ratings[stageId] || "",
        }));

        return {
          employeeId: empId,
          stages: empSkills,
        };
      });
      if (dataToSave.length === 0) {
        setNotification(
          "Error : Select employee or Select the Stage and Skills",
        );
      } else {
        console.log("Data to save:", dataToSave);

        const response = await axios.post(`${baseURL}/save-skills`, {
          data: dataToSave,
        });

        console.log("Skills saved successfully:", response.data);
        setMessage("Skills saved successfully!");

        // Re-fetch the data
        await fetchEmployees();
        setRatings({});
        setSelectedStages([]);
        fetchUserSkills();
      }
    } catch (error) {
      console.error("Error saving skills:", error);
      setMessage("Error saving skills.");
    } finally {
      setLoading(false);
    }
  };

  // Optimized Sorting with useMemo
  const sortedUserSkills = React.useMemo(() => {
    let sortedArray = [...userSkills];
    if (sortConfig.key) {
      sortedArray.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortedArray;
  }, [userSkills, sortConfig]);

  // Optimized Filtering with useMemo
  const filteredUserSkills = React.useMemo(() => {
    return sortedUserSkills.filter(
      (skill) =>
        (skill.NAME ? skill.NAME.toLowerCase() : "").includes(
          debouncedSearchUserSkill.toLowerCase(),
        ) ||
        (skill.USERID ? skill.USERID.toString() : "").includes(
          debouncedSearchUserSkill.toLowerCase(),
        ) ||
        (skill.STAGE_NAME ? skill.STAGE_NAME.toLowerCase() : "").includes(
          debouncedSearchUserSkill.toLowerCase(),
        ) ||
        (skill.Skill_Description
          ? skill.Skill_Description.toLowerCase()
          : ""
        ).includes(debouncedSearchUserSkill.toLowerCase()),
    );
  }, [sortedUserSkills, debouncedSearchUserSkill]);

  // Memoize Grouped Skills to prevent re-calculation on every render
  const groupedUserSkills = React.useMemo(() => {
    const grouped = {};

    filteredUserSkills.forEach((skill) => {
      const uid = skill.USERID;
      if (!grouped[uid]) {
        // Find detailed info
        const details = userDetails.find(u => u.UserID === uid) || {};
        
        grouped[uid] = {
          userId: uid,
          name: skill.NAME,
          doj: details.DOJ, // New Field
          education: details.Education, // New Field
          designation: details.Designation, // New Field
          unit: details.Unit, // New Field
          department: details.Department, // New Field
          skills: [],
        };
      }

      grouped[uid].skills.push({
        stageName: skill.STAGE_NAME,
        description: skill.Skill_Description,
        rating: skill.Skill_Rating || "",
      });
    });

    return Object.values(grouped);
  }, [filteredUserSkills, userDetails]);

  // Memoize Max Skills Count
  const maxSkillsCount = React.useMemo(() => {
    return Math.max(...groupedUserSkills.map((user) => user.skills.length), 1);
  }, [groupedUserSkills]);



  const handleDownload = () => {
    const maxSkills = maxSkillsCount; // Use state variable directly
    
    // Dynamic headers
    const headers = [
      "User ID", 
      "Name", 
      "DOJ", 
      "Education", 
      "Designation", 
      "Unit", 
      "Department"
    ];
    for (let i = 1; i <= maxSkills; i++) {
      headers.push(`Stage ${i}`, `Rating ${i}`); // Updated Headers
    }

    // Dynamic data mapping
    const data = groupedUserSkills.map((userGroup) => { // Use state variable directly
      const row = [
        userGroup.userId, 
        userGroup.name,
        userGroup.doj ? new Date(userGroup.doj).toLocaleDateString("en-GB") : "",
        userGroup.education,
        userGroup.designation,
        userGroup.unit,
        userGroup.department
      ];

      for (let i = 0; i < maxSkills; i++) {
        row.push(
          userGroup.skills[i]?.stageName || "",
          userGroup.skills[i]?.rating || "",
        );
      }

      return row;
    });

    data.unshift(headers);

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Dynamic column widths
    const colWidths = [{ wpx: 80 }, { wpx: 150 }];
    for (let i = 0; i < maxSkills; i++) {
      colWidths.push({ wpx: 120 }, { wpx: 150 }, { wpx: 100 });
    }
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "User Skills Details");
    XLSX.writeFile(workbook, "User_Skills_Details.xlsx");
  };

  const fetchUserSkills = async () => {
    try {
      const response = await axios.get(`${baseURL}/user-skills`);
      setUserSkills(response.data);
    } catch (error) {
      console.error("Error fetching user skills:", error);
    }
  };

  const handleDeleteSkill = async (userId) => {
    try {
      setLoading(true);
      await axios.delete(`${baseURL}/user-skills/${userId}`);
      setMessage("User skill deleted successfully");
      fetchUserSkills();
    } catch (error) {
      console.error("Error deleting user skill:", error);
      setMessage("Failed to delete user skill");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchUser = (e) => {
    setsearchUserskill(e.target.value);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().startsWith(debouncedSearchTerm.toLowerCase()) ||
      String(emp.userid)
        .toLowerCase()
        .startsWith(debouncedSearchTerm.toLowerCase()),
  );

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
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

  const handleInfoClick = (event, description) => {
    setAnchorEl(event.currentTarget);
    setPopoverContent(description || "No description available");
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setPopoverContent("");
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
        minHeight: "auto",
        opacity: "0.9",
      }}
    >
      <h2 className="mb-4">User Skills Management</h2>
      {message && <div className="alert alert-info">{message}</div>}
      <Row>
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              <h3>Select Departments:</h3>
            </Form.Label>
            <div className="checkbox-list">
              {departments.map((dept) => (
                <Form.Check
                  key={dept.dptid}
                  type="checkbox"
                  label={dept.DeptName}
                  value={dept.dptid}
                  onChange={handleDepartmentChange}
                />
              ))}
            </div>
            <Button
              className="mt-2 btn btn-primary btn-lg"
              onClick={handleShowEmployees}
              disabled={loading}
            >
              Show Employees
            </Button>
          </Form.Group>
        </Col>
        <Col md={6}>
          <h3>Employees</h3>
          <Form.Control
            type="text"
            placeholder="Search by Name or User ID"
            value={searchTerm}
            onChange={handleSearchChange}
            className="mb-3 glass-input"
          />
          <div className="checkbox-list">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.userid}
                className={`highlight-${searchTerm && emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ? "active" : ""}`}
              >
                <Form.Check
                  type="checkbox"
                  label={emp.name}
                  value={emp.userid}
                  onChange={handleEmployeeChange}
                />
              </div>
            ))}
          </div>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col md={6}>
          <h3>Selected Employees</h3>
          <div className="selected-employees">
            <Table striped bordered hover className="glass-table">
              <thead className="thead-dark">
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Date of Joining</th>
                  <th>Designation</th>
                </tr>
              </thead>
              <tbody>
                {selectedEmployees.map((empId) => {
                  const employee = employees.find(
                    (emp) => emp.userid === empId,
                  );
                  return (
                    employee && (
                      <tr key={empId}>
                        <td>{employee.userid}</td>
                        <td>{employee.name}</td>
                        <td>
                          {employee.Enrolldt
                            ? new Date(employee.Enrolldt).toLocaleDateString(
                                "en-GB",
                              )
                            : " - "}
                        </td>
                        <td>{employee.designation}</td>
                      </tr>
                    )
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Col>
        <Col md={6}>
          <div className="stages-skills-header">
            <h3>Stages and Skills</h3>
            <Button
              className="btn btn-success btn-lg text-uppercase"
              onClick={handleSaveSkills}
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : "Save"}
            </Button>
          </div>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <Table
              striped
              bordered
              hover
              responsive
              className="table-container glass-table"
            >
              <thead className="thead-dark">
                <tr>
                  <th>Stage Name</th>
                  <th>Skill Rating</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => (
                  <tr key={`stage-${stage.Stage_id}`}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        label={stage.Stage_name}
                        onChange={(e) => handleStageChange(e, stage.Stage_id)}
                        checked={selectedStages.includes(stage.Stage_id)}
                      />
                    </td>
                    <td>
                      <select
                        className="form-control mt-2"
                        onChange={(e) => handleRatingChange(e, stage.Stage_id)}
                        value={ratings[stage.Stage_id] || ""}
                      >
                        <option value="">Select Rating</option>
                        {skills.map((skill) => (
                          <option key={skill.Skill_id} value={skill.Skill_id}>
                            {skill.Skill_Description}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Popover */}
            <Popover
              open={isOpen}
              anchorEl={anchorEl}
              onClose={handlePopoverClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
            >
              <Typography sx={{ p: 2 }}>{popoverContent}</Typography>
            </Popover>
          </div>
        </Col>
      </Row>

      {/* Dynamic User Skills Details Section */}
      <Row className="mt-4">
        <Col md={12}>
          <div className="user-skills-header">
            <h2>
              User Skills Details{" "}
              <BsInfoCircle 
                style={{ marginLeft: '10px', cursor: 'pointer', color: '#17a2b8', fontSize: '0.8em' }} 
                onClick={(e) => handleInfoClick(e, 'Rating Scale:\n1 - Basic/Beginner\n2 - Intermediate\n3 - Advanced\n4 - Expert/Master')}
              />
            </h2>
            <div className="user-skills-actions">
              <Form.Group>
                <Form.Control
                  type="text"
                  placeholder="Search by User ID, Name, Stage, or Skill"
                  value={searchUserskill}
                  onChange={handleSearchUser}
                  className="glass-input"
                />
              </Form.Group>
              <Button variant="success" onClick={handleDownload}>
                <BsDownload /> Download
              </Button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <Table
              striped
              bordered
              hover
              responsive
              className="table-container grouped-skills-table glass-table"
            >
              <thead>
                <tr>
                  <th onClick={() => handleSort("USERID")}>
                    User ID&nbsp;&nbsp;
                    <SortIcon columnKey="USERID" />
                  </th>
                  <th onClick={() => handleSort("NAME")}>
                    Name&nbsp;&nbsp;
                    <SortIcon columnKey="NAME" />
                  </th>
                  <th>DOJ</th>
                  <th>Education</th>
                  <th>Designation</th>
                  <th>Unit</th>
                  <th>Department</th>
                  {/* Dynamically generate column headers */}
                  {Array.from({ length: maxSkillsCount }, (_, index) => (
                    <React.Fragment key={`header-${index}`}>
                      <th>Stage {index + 1}</th>
                      <th>Rating {index + 1}</th>
                    </React.Fragment>
                  ))}
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedUserSkills.map((userGroup) => (
                  <tr key={userGroup.userId}>
                    <td>{userGroup.userId}</td>
                    <td>{userGroup.name}</td>
                    <td>{userGroup.doj ? new Date(userGroup.doj).toLocaleDateString("en-GB") : "-"}</td>
                    <td>{userGroup.education}</td>
                    <td>{userGroup.designation}</td>
                    <td>{userGroup.unit}</td>
                    <td>{userGroup.department}</td>

                    {/* Dynamically generate skill columns */}
                    {Array.from({ length: maxSkillsCount }, (_, index) => (
                      <React.Fragment key={`skill-${index}`}>
                        <td
                          style={{
                            fontWeight: "bold",
                          }}
                        >
                          {userGroup.skills[index]?.stageName || ""}
                        </td>
                        <td>
                          {userGroup.skills[index]?.rating || ""}
                          {userGroup.skills[index]?.rating && (
                            <BsInfoCircle 
                              style={{ marginLeft: '5px', cursor: 'pointer', color: '#17a2b8' }} 
                              onClick={(e) => handleInfoClick(e, userGroup.skills[index]?.description)}
                            />
                          )}
                        </td>
                      </React.Fragment>
                    ))}

                    <td className="text-center">
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteSkill(userGroup.userId)}
                      >
                        <BsTrash style={{ fontSize: "1.5em" }} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      {notification && <div className="notification">{notification}</div>}
    </Container>
  );
};

export default UserSkills;
