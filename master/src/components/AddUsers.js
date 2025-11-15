import {
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Table, Button } from "react-bootstrap";
import { TextField, Snackbar, Typography } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { MdEdit, MdDelete } from "react-icons/md";
import "../styles/StageMaster.css";
import emvLogo from "../pictures/emvlogo.png";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const AddUsers = () => {
  const [Users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    user_id: "",
    password: "",
    Adminflag: "", // 0 = Employee, 1 = Admin
  });
  const [notification, setNotification] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false); 
  const [lineOptions, setLineOptions] = useState([]);    
  const [loadingLines, setLoadingLines] = useState(false);
  const [selectedLines, setSelectedLines] = useState([]);

const safeTrim = (value) => (value ? value.toString().trim() : "");


  useEffect(() => {
    fetchData();
    fetchOptions();
  }, []);
  
  const handleLineChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedLines([...selectedLines, value]);
    } else {
      setSelectedLines(selectedLines.filter((line) => line !== value));
    }
  };
 const fetchOptions = async () => {
      setLoadingLines(true);
      try {
        const lineResponse = await axios.get(
          "https://192.168.2.54:443/api/lines"
        );
        setLineOptions(lineResponse.data || []);
      } catch (error) {
        console.error("Error fetching options:", error);
        setLineOptions([]);
      } finally {
        setLoadingLines(false);
      }
    };
  const fetchData = async () => {
    try {
      const response = await axios.get("https://192.168.2.54:443/api/User-master");
      const sorted = response.data.sort((a, b) =>
        a.user_id.localeCompare(b.user_id)
      );
      setUsers(sorted);
    } catch (error) {
      console.error("Error fetching User data:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };
const handleRoleChange = (e) => {
  const role = e.target.value;
  setNewUser((prev) => ({
    ...prev,
    Adminflag: role === "Admin" ? "1" : "0",
  }));
};

 const handleSubmit = async (e) => {
  e.preventDefault();

  const userPayload = {
    ...newUser,
    lines: newUser.Adminflag === "1" ? "ALL" : selectedLines, // ✅ Add lines
  };

  if (editingUser) {
    await updateUser(userPayload);
  } else {
    await addUser(userPayload);
  }
};


const addUser = async (userPayload) => {
  try {
    await axios.post("https://192.168.2.54:443/api/User-master", userPayload);
    setNotification("User added successfully");
    setSnackbarOpen(true);
    setNewUser({ user_id: "", password: "", Adminflag: "" });
    setSelectedLines([]);
    fetchData();
  } catch (error) {
    console.error("Error adding User:", error);
    setNotification("Error adding User");
    setSnackbarOpen(true);
  }
};

const updateUser = async (userPayload) => {
  try {
    await axios.put(
      `https://192.168.2.54:443/api/User-master/${editingUser.user_id}`,
      userPayload
    );
    setNotification("User updated successfully");
    setSnackbarOpen(true);

    // ✅ Reset form after update
    setEditingUser(null);
    setNewUser({ user_id: "", password: "", Adminflag: "" });
    setSelectedLines([]);

    // ✅ Refresh table
    fetchData();
  } catch (error) {
    console.error("Error updating User:", error);
    setNotification("Error updating User");
    setSnackbarOpen(true);
  }
};



  const deleteUser = async (id) => {
    try {
      await axios.delete(`https://192.168.2.54:443/api/User-master/${id}`);
      setNotification("User deleted successfully");
      setSnackbarOpen(true);
      fetchData();
    } catch (error) {
      console.error("Error deleting User:", error);
      setNotification("Error deleting User");
      setSnackbarOpen(true);
    }
  };

const editUser = (user) => {
  setNewUser({
    user_id: user.user_id,
    password: user.password,
    Adminflag: user.Adminflag, // Keep as string
  });

  // ✅ Set selected lines when editing
  if (user.Adminflag === "1") {
    setSelectedLines(["ALL"]);
  } else {
    const userLines = user.LINE ? user.LINE.split(",").map(l => l.trim()) : [];
    setSelectedLines(userLines);
  }

  setEditingUser(user);
};

const cancelEdit = () => {
  setNewUser({ user_id: "", password: "", Adminflag: "" });
  setEditingUser(null);
};

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
      <Typography variant="h4" align="left" gutterBottom>
        User Master
      </Typography>

      <form onSubmit={handleSubmit} className="form-container">
        <TextField
          label="User ID"
          name="user_id"
          value={newUser.user_id}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={newUser.password}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />

     <select
  value={newUser.Adminflag === "1" ? "Admin" : newUser.Adminflag === "0" ? "Employee" : ""}
  onChange={handleRoleChange}
  className="form-select"
  required
>
  <option value="">Select Role</option>
  <option value="Admin">Admin</option>
  <option value="Employee">Employee</option>
</select>

{/* Show line options only for Employees */}

{newUser.Adminflag === "0" && (
  <FormControl fullWidth margin="normal">
    <InputLabel id="line-select-label">Select Line</InputLabel><br></br>
   <Select
  labelId="line-select-label"
  multiple   // ✅ allow multiple selection
  value={selectedLines}
  onChange={(e) => setSelectedLines(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
  renderValue={(selected) => selected.join(", ")} // ✅ show selected as comma separated
  required
>
  {lineOptions.map((line, index) => (
    <MenuItem key={index} value={safeTrim(line.LINE) || ""}>
      {safeTrim(line.LINE) || "NULL"}
    </MenuItem>
  ))}
</Select>

  </FormControl>
)}




        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <Button type="submit" variant="primary">
            {editingUser ? "Update User" : "Add User"}
          </Button>
          {editingUser && (
            <Button variant="secondary" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>S.No</th>
            <th>User ID</th>
            <th>Password</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Users.map((User, index) => (
            <tr key={User.user_id}>
              <td>{index + 1}</td>
              <td>{User.user_id}</td>
              <td>{User.password}</td>
              <td>{User.Adminflag === '1' ? "Admin" : "Employee"}</td>
              <td>
                <Button onClick={() => editUser(User)} variant="warning">
                  <MdEdit />
                </Button>
                &nbsp;
                <Button
                  onClick={() => deleteUser(User.user_id)}
                  variant="danger"
                >
                  <MdDelete />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity="success">
          {notification}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AddUsers;

