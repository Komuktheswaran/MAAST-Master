import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Table,
  Button,
  Form,
  Alert,
  Spinner,
} from "react-bootstrap";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import emvLogo from "../pictures/emvlogo.png";

const WeightageMaster = () => {
  const [weightages, setWeightages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchWeightages();
  }, []);

  const fetchWeightages = async () => {
    setLoading(true);
    try {
      const response = await axios.get("https://192.168.2.54/api/weightage");
      setWeightages(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch weightages.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.ID);
    setEditValue(item.Weightage);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = async (id) => {
    try {
      await axios.put(`https://192.168.2.54/api/weightage/${id}`, {
        weightage: editValue,
      });
      setSuccessMessage("Weightage updated successfully!");
      fetchWeightages();
      setEditingId(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Failed to update weightage.");
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    try {
      await axios.delete(`https://192.168.2.54/api/weightage/${id}`);
      setSuccessMessage("Category deleted successfully!");
      fetchWeightages();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Failed to delete category.");
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const categoryName = e.target.categoryName.value;
    const weightage = e.target.weightage.value;

    try {
      await axios.post("https://192.168.2.54/api/weightage", {
        categoryName,
        weightage,
      });
      setSuccessMessage("Category added successfully!");
      fetchWeightages();
      e.target.reset();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add category.");
    }
  };

  const totalWeightage = weightages.reduce(
    (sum, item) => sum + (parseInt(item.Weightage) || 0),
    0,
  );

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
      <h2 className="title mb-4">Job Card Weightage Master</h2>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert
          variant="success"
          onClose={() => setSuccessMessage("")}
          dismissible
        >
          {successMessage}
        </Alert>
      )}

      <div className="glass-card p-4">
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="text-white">Current Weightages</h4>
              <div
                className={`p-2 rounded ${totalWeightage !== 100 ? "bg-danger text-white" : "bg-success text-white"}`}
              >
                Total: {totalWeightage} / 100
              </div>
            </div>

            <Table
              striped
              bordered
              hover
              variant="dark"
              className="text-center"
            >
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Weightage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {weightages.map((item) => (
                  <tr key={item.ID}>
                    <td className="text-start ps-4">
                      {item.CategoryName}
                      {item.IsSystem && (
                        <span
                          className="badge bg-secondary ms-2"
                          style={{ fontSize: "0.7em" }}
                        >
                          System
                        </span>
                      )}
                    </td>
                    <td>
                      {editingId === item.ID ? (
                        <Form.Control
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ width: "100px", margin: "0 auto" }}
                        />
                      ) : (
                        item.Weightage
                      )}
                    </td>
                    <td>
                      {editingId === item.ID ? (
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleSave(item.ID)}
                          >
                            <FaSave />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCancel}
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      ) : (
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <FaEdit /> Edit
                          </Button>

                          {!item.IsSystem && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(item.ID)}
                            >
                              <FaTimes /> Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {totalWeightage !== 100 && (
              <Alert variant="warning" className="mt-3">
                <strong>Warning:</strong> Total weightage should ideally sum to
                100. Current total is {totalWeightage}.
              </Alert>
            )}

            <hr className="text-white my-4" />

            <h4 className="text-white mb-3">Add New Category</h4>
            <Form
              onSubmit={handleAdd}
              className="row g-3 align-items-end justify-content-center"
            >
              <div className="col-auto">
                <Form.Label className="text-white visually-hidden">
                  Category Name
                </Form.Label>
                <Form.Control
                  name="categoryName"
                  placeholder="Category Name"
                  required
                />
              </div>
              <div className="col-auto">
                <Form.Label className="text-white visually-hidden">
                  Weightage
                </Form.Label>
                <Form.Control
                  type="number"
                  name="weightage"
                  placeholder="Weightage"
                  required
                  style={{ width: "120px" }}
                />
              </div>
              <div className="col-auto">
                <Button type="submit" variant="success">
                  Add Category
                </Button>
              </div>
            </Form>
          </>
        )}
      </div>
    </Container>
  );
};

export default WeightageMaster;
