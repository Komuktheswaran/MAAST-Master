require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const app = express();
const multer = require("multer"); // Add this import
const path = require("path");
const excel = require("exceljs");

const bodyParser = require("body-parser");
const { isnull } = require("util");
const port = process.env.PORT || 5000;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    useUTC: true,
    enableArithAbort: true,
    encrypt: false,
    driver: "msnodesqlv8",
  },
  requestTimeout: 60000000, // 60 seconds
};

app.use(cors());
app.use(express.json({ limit: "500mb" }));
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Initialize database connection
let poolConnection;
const initializeDatabase = async () => {
  try {
    poolConnection = await sql.connect(config);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

initializeDatabase();

// app.get("/api/login", async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool.request().query("SELECT * FROM Mx_UserLogin");
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("Error fetching stages:", err);
//     res.status(500).send("Error fetching stages");
//   }
// });
// Login route

app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("password", sql.VarChar, password)
      .query(
        "SELECT user_id, password, Adminflag,LINE FROM Mx_UserLogin WHERE user_id = @userId AND password = @password",
      );

    if (result.recordset.length > 0) {
      const user = result.recordset[0];

      res.status(200).json({
        success: true,
        user: {
          user_id: user.user_id,
          Adminflag: user.Adminflag, // 1 = Admin, 0 = Employee
          LINE: user.LINE,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid user ID or password",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("password", sql.VarChar, password)
      .query(
        "SELECT user_id, password, Adminflag,LINE FROM Mx_UserLogin WHERE user_id = @userId AND password = @password",
      );

    if (result.recordset.length > 0) {
      const user = result.recordset[0];

      res.status(200).json({
        success: true,
        user: {
          user_id: user.user_id,
          Adminflag: user.Adminflag, // 1 = Admin, 0 = Employee
          LINE: user.LINE,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid user ID or password",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.post("/api/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  console.log(userId, newPassword, oldPassword);
  try {
    const pool = await sql.connect(config);

    // Step 1: Verify if the old password is correct
    const userCheck = await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("oldPassword", sql.VarChar, oldPassword)
      .query(
        "SELECT * FROM Mx_UserLogin WHERE user_id = @userId AND password = @oldPassword",
      );

    if (userCheck.recordset.length === 0) {
      console.log(
        `Failed login attempt for userId: ${userId} - incorrect password`,
      );
      return res
        .status(401)
        .json({ success: false, message: "Old password is incorrect" });
    }

    // Step 2: Update the password to the new one
    await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("newPassword", sql.VarChar, newPassword)
      .query(
        "UPDATE Mx_UserLogin SET password = @newPassword WHERE user_id = @userId",
      );

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully!" });
  } catch (error) {
    console.error("Error in password change:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get shift master details with all information
app.get("/api/shifts_master_details", async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const query = `
      SELECT 
        SFTID,
        SFTName,
        SFTSTTime,
        SFTEDTime
      FROM dbo.Mx_ShiftMst
      ORDER BY SFTID
    `;

    const result = await pool.request().query(query);
    console.log("shift master", result.recordset);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching shift master details:", error);
    res.status(500).json({
      error: "Error fetching shift master details",
      details: error.message,
    });
  }
});

app.get("/api/User-master", async (req, res) => {
  try {
    // Connect to DB
    const pool = await sql.connect(config);

    // Query
    let result = await pool
      .request()
      .query("SELECT user_id, password, Adminflag,LINE FROM Mx_UserLogin");

    console.log("User master", result.recordset);
    res.json(result.recordset); // Send result as JSON
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});
// GET user by id
app.get("/api/User-master/:id", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .query(
        `SELECT user_id, password, Adminflag, LINE 
         FROM Mx_UserLogin 
         WHERE user_id = @id`,
      );

    res.json(result.recordset[0] || null);
    console.log(result.recordset[0]);
  } catch (err) {
    console.error("GET /api/User-master/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - add new user (prevent duplicate user_id)
// POST - add new user
app.post("/api/User-master", async (req, res) => {
  const { user_id, password, Adminflag, lines } = req.body;

  if (
    !user_id ||
    !password ||
    (Adminflag !== "0" &&
      Adminflag !== "1" &&
      Adminflag !== 0 &&
      Adminflag !== 1)
  ) {
    return res.status(400).json({
      error: "user_id, password, Adminflag ('0' or '1'), and LINE are required",
    });
  }

  try {
    const pool = await sql.connect(config);

    // check duplicate
    const chk = await pool
      .request()
      .input("id", sql.NVarChar, user_id)
      .query("SELECT 1 FROM Mx_UserLogin WHERE user_id = @id");
    if (chk.recordset.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    await pool
      .request()
      .input("id", sql.NVarChar, user_id)
      .input("pwd", sql.NVarChar, password)
      .input("af", sql.NVarChar, String(Adminflag))
      .input(
        "line",
        sql.NVarChar,
        Array.isArray(lines) ? lines.join(",") : lines,
      )

      .query(
        "INSERT INTO Mx_UserLogin (user_id, password, Adminflag, LINE) VALUES (@id, @pwd, @af, @line)",
      );

    res.status(201).json({ message: "User added" });
  } catch (err) {
    console.error("POST /api/User-master error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - update user (by user_id)
app.put("/api/User-master/:id", async (req, res) => {
  const { password, Adminflag, lines } = req.body;
  console.log(req.body);
  const { id } = req.params;

  if (
    !password ||
    (Adminflag !== "0" &&
      Adminflag !== "1" &&
      Adminflag !== 0 &&
      Adminflag !== 1)
  ) {
    return res
      .status(400)
      .json({ error: "password and Adminflag ('0' or '1') are required" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("pwd", sql.NVarChar, password)
      .input("af", sql.NVarChar, String(Adminflag))
      .input(
        "line",
        sql.NVarChar,
        Array.isArray(lines) ? lines.join(",") : lines,
      )

      .query(
        "UPDATE Mx_UserLogin SET password = @pwd, Adminflag = @af, LINE = @line WHERE user_id = @id",
      );

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "User updated" });
  } catch (err) {
    console.error("PUT /api/User-master/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - remove user by user_id
app.delete("/api/User-master/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .query("DELETE FROM Mx_UserLogin WHERE user_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/User-master/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - remove user by user_id

app.post("/api/stage-master", async (req, res) => {
  console.log("post", req.body);
  const { Stage_name, Stage_Type, Stage_Serial } = req.body;

  if (!Stage_name || !Stage_Type || !Stage_Serial) {
    return res
      .status(400)
      .send("Stage_name, Stage_Type and Stage_Serial are required");
  }

  try {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    // Step 1: Shift existing Stage_Serial values to make space
    const request1 = new sql.Request(transaction);
    await request1.input("Stage_Serial", sql.Int, Stage_Serial).query(`
        UPDATE Mx_StageMaster
        SET Stage_Serial = Stage_Serial + 1
        WHERE Stage_Serial >= @Stage_Serial
      `);

    // Step 2: Insert the new stage
    const request2 = new sql.Request(transaction);
    const result = await request2
      .input("Stage_name", sql.NVarChar, Stage_name)
      .input("Stage_Type", sql.NVarChar, Stage_Type)
      .input("Stage_Serial", sql.Int, Stage_Serial).query(`
        INSERT INTO Mx_StageMaster (Stage_name, Stage_Type, Stage_Serial)
        OUTPUT INSERTED.Stage_id, INSERTED.Stage_name, INSERTED.Stage_Type, INSERTED.Stage_Serial
        VALUES (@Stage_name, @Stage_Type, @Stage_Serial)
      `);

    // Step 3: Normalize Stage_Serial (no gaps, start from 1)
    const request3 = new sql.Request(transaction);
    await request3.query(`
      WITH Ordered AS (
        SELECT Stage_id, ROW_NUMBER() OVER (ORDER BY Stage_Serial) AS NewSerial
        FROM Mx_StageMaster
      )
      UPDATE Mx_StageMaster
      SET Stage_Serial = Ordered.NewSerial
      FROM Mx_StageMaster
      INNER JOIN Ordered ON Mx_StageMaster.Stage_id = Ordered.Stage_id
    `);

    await transaction.commit();
    console.log("post stage-master", result.recordset);
    res.status(201).json({
      Stage_id: result.recordset[0].Stage_id,
      Stage_name: result.recordset[0].Stage_name,
      Stage_Type: result.recordset[0].Stage_Type,
      Stage_Serial: result.recordset[0].Stage_Serial,
      message: "Stage inserted successfully, serials normalized",
    });
  } catch (err) {
    console.error("Error adding stage:", err);
    res.status(500).send("Error adding stage");
  }
});

app.get("/api/stage-master", async (req, res) => {
  console.log("get");

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT Stage_id, Stage_name, Stage_Type, Stage_Serial FROM Mx_StageMaster",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching stages:", err);
    res.status(500).send("Error fetching stages");
  }
});

app.get("/api/stage-master/types", async (req, res) => {
  console.log("get-types");
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT DISTINCT Stage_Type FROM Mx_StageMaster WHERE Stage_Type IS NOT NULL",
      );

    const stageTypes = result.recordset.map((row) => row.Stage_Type);
    res.json(stageTypes);
  } catch (err) {
    console.error("Error fetching stage types:", err);
    res.status(500).send("Error fetching stage types");
  }
});

app.put("/api/stage-master/:id", async (req, res) => {
  console.log("put", req.params);
  const { id } = req.params;
  const { Stage_name, Stage_Type, Stage_Serial } = req.body;

  if (!Stage_name || !Stage_Type || Stage_Serial === undefined) {
    return res
      .status(400)
      .send("Stage_name, Stage_Type, and Stage_Serial are required");
  }

  try {
    const pool = await sql.connect(config);

    // ✅ Update the selected stage with new serial
    const updateStageQuery = `
      UPDATE Mx_StageMaster 
      SET Stage_name = @Stage_name, Stage_Type = @Stage_Type, Stage_Serial = @Stage_Serial
      WHERE Stage_id = @Stage_id
    `;
    const updateRequest = pool.request();
    updateRequest.input("Stage_id", sql.Int, id);
    updateRequest.input("Stage_name", sql.NVarChar, Stage_name);
    updateRequest.input("Stage_Type", sql.NVarChar, Stage_Type);
    updateRequest.input("Stage_Serial", sql.Int, Stage_Serial);
    await updateRequest.query(updateStageQuery);

    // ✅ Fetch all stages ordered by Stage_Serial
    const fetchQuery = `
      SELECT Stage_id 
      FROM Mx_StageMaster
      ORDER BY Stage_Serial ASC
    `;
    const fetchResult = await pool.request().query(fetchQuery);

    // ✅ Reassign Stage_Serial values in sequence starting from 1
    let counter = 1;
    for (const row of fetchResult.recordset) {
      const reorderQuery = `
        UPDATE Mx_StageMaster 
        SET Stage_Serial = @Serial 
        WHERE Stage_id = @Stage_id
      `;
      const reorderRequest = pool.request();
      reorderRequest.input("Serial", sql.Int, counter++);
      reorderRequest.input("Stage_id", sql.Int, row.Stage_id);
      await reorderRequest.query(reorderQuery);
    }

    res.status(200).json({
      message: "Stage updated and serials reordered successfully",
    });
  } catch (err) {
    console.error("Error updating stage:", err);
    res.status(500).send("Error updating stage");
  }
});

app.delete("/api/stage-master/:id", async (req, res) => {
  console.log("delete", req.params);
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);

    const deleteAndResequenceQuery = `
      BEGIN TRANSACTION;

      DECLARE @DeletedSerial INT;

      -- Get the Stage_Serial of the record to delete
      SELECT @DeletedSerial = Stage_Serial
      FROM Mx_StageMaster
      WHERE Stage_Id = @StageId;

      -- If no record found, rollback and return
      IF @DeletedSerial IS NULL
      BEGIN
        ROLLBACK TRANSACTION;
        SELECT 'NOT_FOUND' AS Status;
        RETURN;
      END

      -- Delete the stage
      DELETE FROM Mx_StageMaster
      WHERE Stage_Id = @StageId;

      -- Update Stage_Serial for remaining stages
      UPDATE Mx_StageMaster
      SET Stage_Serial = Stage_Serial - 1
      WHERE Stage_Serial > @DeletedSerial;

      COMMIT TRANSACTION;

      SELECT 'SUCCESS' AS Status;
    `;

    const result = await pool
      .request()
      .input("StageId", sql.Int, id)
      .query(deleteAndResequenceQuery);

    if (result.recordset[0].Status === "NOT_FOUND") {
      return res.status(404).json({ message: "Stage not found" });
    }

    res
      .status(200)
      .json({ message: "Stage deleted and serials updated successfully" });
  } catch (err) {
    console.error("Error deleting stage:", err);
    res.status(500).send("Error deleting stage");
  }
});

app.get("/api/export-stage-master", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query("SELECT * FROM Mx_StageMaster ORDER BY Stage_Serial");

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet("Stage Master");

    worksheet.columns = [
      { header: "Stage ID", key: "Stage_id", width: 10 },
      { header: "Stage Name", key: "Stage_name", width: 30 },
      { header: "Stage Type", key: "Stage_Type", width: 20 },
      { header: "Stage Serial", key: "Stage_Serial", width: 15 },
    ];

    worksheet.addRows(result.recordset);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "StageMaster.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error creating excel file:", err);
    res.status(500).send("Error creating excel file");
  }
});

// app.delete("/api/stage-master/:id", async (req, res) => {

//   const { id } = req.params;
//   console.log("delete",req.params)

//   try {
//     const pool = await sql.connect(config);

//     const deleteAndResequenceQuery = `
//       BEGIN TRANSACTION;

//       DECLARE @DeletedSerial INT;

//       -- Get the Stage_Serial of the record to delete
//       SELECT @DeletedSerial = Stage_Serial
//       FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- If no record found, rollback and return
//       IF @DeletedSerial IS NULL
//       BEGIN
//         ROLLBACK TRANSACTION;
//         SELECT 'NOT_FOUND' AS Status;
//         RETURN;
//       END

//       -- Delete the stage
//       DELETE FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- Update Stage_Serial for remaining stages
//       UPDATE Mx_StageMaster
//       SET Stage_Serial = Stage_Serial - 1
//       WHERE Stage_Serial > @DeletedSerial;

//       COMMIT TRANSACTION;

//       SELECT 'SUCCESS' AS Status;
//     `;

//     const result = await pool
//       .request()
//       .input("StageId", sql.Int, id)
//       .query(deleteAndResequenceQuery);

//     if (result.recordset[0].Status === "NOT_FOUND") {
//       return res.status(404).json({ message: "Stage not found" });
//     }

//     res.status(200).json({ message: "Stage deleted and serials updated successfully" });
//   } catch (err) {
//     console.error("Error deleting stage:", err);
//     res.status(500).send("Error deleting stage");
//   }
// });

// app.delete("/api/stage-master/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const pool = await sql.connect(config);

//     const deleteAndUpdateQuery = `
//       BEGIN TRANSACTION;

//       DECLARE @DeletedSerial INT;

//       -- Get the Stage_Serial of the record to delete
//       SELECT @DeletedSerial = Stage_Serial
//       FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- If no record found, rollback and return
//       IF @DeletedSerial IS NULL
//       BEGIN
//         ROLLBACK TRANSACTION;
//         SELECT 'NOT_FOUND' AS Status;
//         RETURN;
//       END

//       -- Delete the record
//       DELETE FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- Decrement Stage_Serial for remaining stages
//       UPDATE Mx_StageMaster
//       SET Stage_Serial = Stage_Serial - 1
//       WHERE Stage_Serial > @DeletedSerial;

//       COMMIT TRANSACTION;

//       SELECT 'SUCCESS' AS Status;
//     `;

//     const result = await pool
//       .request()
//       .input("StageId", sql.Int, id)
//       .query(deleteAndUpdateQuery);

//     if (result.recordset[0].Status === "NOT_FOUND") {
//       return res.status(404).json({ message: "Stage not found" });
//     }

//     res
//       .status(200)
//       .json({ message: "Stage deleted and serials updated successfully" });
//   } catch (err) {
//     console.error("Error deleting stage:", err);
//     res.status(500).send("Error deleting stage");
//   }
// });

// Skill Master - Insert a new skill

app.post("/api/skill-master", async (req, res) => {
  const { Skill_Rating, Skill_Description } = req.body;

  if (!Skill_Rating || !Skill_Description) {
    return res
      .status(400)
      .send("Skill_Rating and Skill_Description are required");
  }

  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    request.input("Skill_Rating", sql.Char, Skill_Rating);
    request.input("Skill_Description", sql.NVarChar, Skill_Description);

    // Check for duplicates
    const duplicateCheck = await request.query(`
      SELECT COUNT(*) AS count
      FROM Mx_SkillMaster
      WHERE Skill_Description = @Skill_Description
    `);

    if (duplicateCheck.recordset[0].count > 0) {
      return res.status(400).send("Skill_Description must be unique.");
    }

    // Insert the new skill
    const result = await request.query(
      `INSERT INTO Mx_SkillMaster (Skill_Rating, Skill_Description) VALUES (@Skill_Rating, @Skill_Description); SELECT SCOPE_IDENTITY() AS Skill_id;`,
    );
    console.log("skill - master post", result.recordset);
    res.status(201).json({
      Skill_id: result.recordset[0].Skill_id,
      Skill_Rating: Skill_Rating,
      Skill_Description: Skill_Description,
      message: "Skill inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting skill:", error);
    res.status(500).send(error.message);
  }
});

// Update a skill
app.put("/api/skill-master/:id", async (req, res) => {
  const { id } = req.params;
  const { Skill_Rating, Skill_Description } = req.body;

  if (!Skill_Rating || !Skill_Description) {
    return res
      .status(400)
      .send("Skill_Rating and Skill_Description are required");
  }

  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    request.input("Skill_id", sql.Int, id);
    request.input("Skill_Rating", sql.Char, Skill_Rating);
    request.input("Skill_Description", sql.NVarChar, Skill_Description);
    await request.query(
      `UPDATE Mx_SkillMaster SET Skill_Rating = @Skill_Rating, Skill_Description = @Skill_Description WHERE Skill_id = @Skill_id;`,
    );
    res.status(200).json({
      Skill_id: id,
      Skill_Rating: Skill_Rating,
      Skill_Description: Skill_Description,
      message: "Skill updated successfully",
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).send(error.message);
  }
});

// Fetch a skill by ID
app.get("/api/skill-master/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    request.input("Skill_id", sql.Int, id);
    const result = await request.query(
      `SELECT Skill_id, Skill_Rating, Skill_Description FROM Mx_SkillMaster WHERE Skill_id = @Skill_id;`,
    );
    if (result.recordset.length === 0) {
      res.status(404).send("Skill not found");
    } else {
      res.json(result.recordset[0]);
    }
  } catch (error) {
    console.error("Error fetching skill:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all skills
app.get("/api/skill-master", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT Skill_id, Skill_Rating, Skill_Description FROM Mx_SkillMaster",
      );
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all departments
app.get("/api/departments", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query("SELECT dptid, NAME AS DeptName FROM Mx_DepartmentMst");
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).send(error.message);
  }
});

// Fetch employees by selected departments
app.post("/api/employees", async (req, res) => {
  const { departments } = req.body;
  if (!departments || departments.length === 0) {
    return res.status(400).send("No departments selected");
  }

  try {
    const pool = await sql.connect(config);

    const query = `
      SELECT distinct u.userid, u.name + '-' + u.userid AS name, u.Enrolldt, d.Name AS designation
      FROM Mx_UserMst u
      JOIN Mx_DesignationMst d ON u.Dsgid = d.Dsgid
      WHERE u.dptid IN (${departments.map((dept) => `'${dept}'`).join(",")})
      ORDER BY u.name + '-' + u.userid
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all stages
app.get("/api/stagemaster", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query("SELECT Stage_id, Stage_name FROM Mx_StageMaster");
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching stages:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all skills
app.get("/api/skillmaster", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT Skill_id, Skill_Rating, Skill_Description FROM Mx_SkillMaster",
      );
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).send(error.message);
  }
});

// Endpoint to save skills for multiple employees
app.post("/api/save-skills", async (req, res) => {
  const { data } = req.body;

  // Validate request data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).send("Invalid data format");
  }

  let transaction;

  try {
    // Connect to the database
    const pool = await sql.connect(config);

    // Begin a new transaction
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Iterate through each employee's skill data to be saved
    for (const employeeData of data) {
      const { employeeId, stages } = employeeData;
      if (!employeeId || !Array.isArray(stages)) {
        throw new Error("Invalid input data");
      }

      await pool
        .request()
        .query(`DELETE FROM Mx_UserSkills WHERE USERID = ${employeeId}`);
      for (const stageData of stages) {
        const { stageId, rating } = stageData;
        if (!stageId || !rating) {
          throw new Error("Invalid stage data");
        }

        console.log(
          `Saving: EmployeeId: ${employeeId}, StageId: ${stageId}, Rating: ${rating}`,
        );

        // Execute the SQL query within the transaction
        await transaction.request().query(`
                  INSERT INTO Mx_UserSkills (userid, Stage_id, Skill_id)
                  VALUES (${employeeId}, ${stageId}, ${rating})
              `);
      }
    }

    // Commit the transaction if all queries succeed
    await transaction.commit();
    res.send("Skills saved successfully");
  } catch (error) {
    console.error("Error saving skills:", error);

    // Rollback the transaction on error
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }

    // Respond with an internal server error
    res.status(500).send("Server error");
  }
});

// Fetch user skills
app.get("/api/user-skills", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query(`
          SELECT P2.NAME, P3.STAGE_NAME, P4.Skill_Description, P4.Skill_Rating, P1.USERID
          FROM Mx_UserSkills AS P1
          LEFT OUTER JOIN Mx_UserMst AS P2 ON P1.USERID = P2.USERID
          LEFT OUTER JOIN MX_STAGEMASTER AS P3 ON P1.STAGE_ID = P3.stage_id
          LEFT OUTER JOIN MX_SKILLMASTER AS P4 ON P1.SKILL_ID = P4.SKILL_ID order by P3.STAGE_NAME,P2.NAME
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching user skills:", error);
    res.status(500).send("Server error");
  }
});

// Fetch user details (DOJ, Education, Designation, Unit, Department)
app.get("/api/user-details", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query(`
      
        
        SELECT
    u.UserID,
    u.NAME AS Name,
    COALESCE(NULLIF(u.FullName, ''), CONCAT_WS(' ', u.FirstName, u.MiddleName, u.LastName)) AS [Name],
    u.JoinDT AS [DOJ],
    u.Qualification AS [Education],
    des.Name AS [Designation],
    org.Name AS [Unit],
    dpt.Name AS [Department]
FROM dbo.Mx_UserMst AS u
LEFT JOIN dbo.Mx_DesignationMst AS des ON u.DSGID = des.DSGID
LEFT JOIN dbo.Mx_DepartmentMst AS dpt ON u.DPTID = dpt.DPTID
LEFT JOIN dbo.Mx_OrganizationMst AS org ON u.ORGID = org.ORGID
WHERE u.UserID IS NOT NULL
ORDER BY u.NAME ;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).send("Server error");
  }
});

// Delete user skill
app.delete("/api/user-skills/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    let pool = await sql.connect(config);
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("DELETE FROM Mx_UserSkills WHERE USERID = @userId");
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting user skill:", error);
    res.status(500).send("Server error");
  }
});

app.post("/api/saveUserSkills", async (req, res) => {
  const skillsData = req.body;
  const invalidStages = [];

  try {
    await sql.connect(config);
    const request = new sql.Request();
    const batchSize = 50;

    for (let i = 0; i < skillsData.length; i += batchSize) {
      const batch = skillsData.slice(i, i + batchSize);

      let QUERY1 = "";
      for (let skill of batch) {
        const { userid, STAGE_NAME, Skill_Description, Skill_Rating } = skill;

        if (QUERY1.length > 0) QUERY1 += " UNION ALL ";
        QUERY1 += ` SELECT '${userid}' AS userid, '${STAGE_NAME}' AS STAGE_NAME, '${Skill_Description}' AS Skill_Description, '${Skill_Rating}' AS Skill_Rating`;
      }

      const validateQuery = `
        SELECT Q1.userid, Q1.STAGE_NAME, Q1.Skill_Description, Q1.Skill_Rating,
               CASE WHEN P2.Stage_Id IS NULL THEN 0 ELSE 1 END AS IsValidStage
        FROM (${QUERY1}) AS Q1
        LEFT JOIN Mx_StageMaster AS P2 
        ON REPLACE(LTRIM(RTRIM(LOWER(Q1.STAGE_NAME))), ' ', '') = REPLACE(LTRIM(RTRIM(LOWER(P2.Stage_name))), ' ', '')
      `;

      const validationResult = await request.query(validateQuery);

      const validRows = validationResult.recordset.filter(
        (row) => row.IsValidStage === 1,
      );
      const invalidRows = validationResult.recordset.filter(
        (row) => row.IsValidStage === 0,
      );

      invalidRows.forEach((row) => {
        invalidStages.push({
          userid: row.userid,
          STAGE_NAME: row.STAGE_NAME,
          Skill_Description: row.Skill_Description,
          Skill_Rating: row.Skill_Rating,
          Status: "Invalid Stage Name",
        });
      });

      if (validRows.length > 0) {
        const insertQuery = `
          INSERT INTO Mx_UserSkills (userid, Skill_id, Stage_id, Update_at, State)
          SELECT Q1.userid, ISNULL(P1.Skill_id, 0), ISNULL(P2.Stage_Serial, 0), GETDATE(), 1
          FROM (
            ${validRows
              .map(
                (row) =>
                  `SELECT '${row.userid}' AS userid, '${row.STAGE_NAME}' AS STAGE_NAME, '${row.Skill_Description}' AS Skill_Description, '${row.Skill_Rating}' AS Skill_Rating`,
              )
              .join(" UNION ALL ")}
          ) AS Q1
          LEFT JOIN Mx_SkillMaster AS P1 
          ON LTRIM(RTRIM(LOWER(Q1.Skill_Description))) = LTRIM(RTRIM(LOWER(P1.Skill_Description)))
          LEFT JOIN Mx_StageMaster AS P2 
          ON REPLACE(LTRIM(RTRIM(LOWER(Q1.STAGE_NAME))), ' ', '') = REPLACE(LTRIM(RTRIM(LOWER(P2.Stage_name))), ' ', '')
        `;

        await request.query(insertQuery);
      }
    }

    await sql.close();
    res.json({ success: true, invalidRows: invalidStages }); // ✅ Send invalid rows to frontend
  } catch (err) {
    console.error("Error saving user skills:", err);
    res
      .status(500)
      .json({ success: false, message: "Error saving user skills." });
  }
});
//USER SHIFT
// Endpoint to handle POST request for saving user shifts
app.post("/api/saveUserShifts", async (req, res) => {
  const shiftsData = req.body;
  const invalidStages = [];
  const duplicates = [];

  try {
    await sql.connect(config);
    const request = new sql.Request();

    // Fetch Stage Master
    const stageResult = await request.query(`
      SELECT Stage_Id, Stage_name
      FROM Mx_StageMaster
    `);

    // Fetch Shift Master for validation
    const shiftResult = await request.query(`
      SELECT SFTID FROM Mx_ShiftMst
    `);
    const validShiftIds = new Set(shiftResult.recordset.map((s) => s.SFTID));

    const stageMap = new Map();
    stageResult.recordset.forEach((stage) => {
      stageMap.set(
        stage.Stage_name.toLowerCase().replace(/\s+/g, ""),
        stage.Stage_Id,
      );
    });

    // Fetch user active/inactive status from MX_USERMST
    const userIds = [...new Set(shiftsData.map((s) => s.userid).filter(Boolean))];
    const userStatusMap = new Map();
    if (userIds.length > 0) {
      const idList = userIds.map((id) => `'${id}'`).join(",");
      const userStatusResult = await request.query(
        `SELECT USERID, UserIDEnbl FROM MX_USERMST WHERE USERID IN (${idList})`
      );
      userStatusResult.recordset.forEach((u) => {
        userStatusMap.set(String(u.USERID), u.UserIDEnbl);
      });
    }

    const batchSize = 50;

    function normalizeDate(dateStr) {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [dd, mm, yyyy] = dateStr.split("-");
        return `${yyyy}-${mm}-${dd}`;
      }
      return null;
    }

    // ✅ NEW: Track unique combinations to detect duplicates BEFORE inserting
    // ✅ NEW: Track unique combinations to handle overwrites (last one wins for same User + Date)
    const uniqueShiftsMap = new Map();
    const validShifts = [];

    // ✅ Pre-validate ALL data first
    for (let shift of shiftsData) {
      let {
        Shift_date_from,
        Shift_date_to,
        userid,
        STAGE_NAME,
        SHIFT_ID,
        LINE,
      } = shift;

      console.log("Processing shift:", shift);
      console.log("Stage Map:", Shift_date_from);
      console.log("Stage Map:", Shift_date_to);
      console.log("Stage Map:", userid);
      console.log("Stage Map:", STAGE_NAME);
      console.log("Stage Map:", SHIFT_ID);
      console.log("Stage Map:", LINE);

      Shift_date_from = normalizeDate(Shift_date_from);
      Shift_date_to = normalizeDate(Shift_date_to);

      // ✅ Check if user is inactive (UserIDEnbl = 0)
      const userStatus = userStatusMap.get(String(userid));
      if (userStatus === 0) {
        invalidStages.push({
          ...shift,
          reason: "Inactive User (UserIDEnbl=0)",
        });
        continue;
      }

      // Validate stage name
      if (!STAGE_NAME || typeof STAGE_NAME !== "string") {
        invalidStages.push({
          ...shift,
          reason: "Missing or invalid STAGE_NAME",
        });
        continue;
      }

      // Validate SHIFT_ID
      if (
        SHIFT_ID &&
        SHIFT_ID !== "WO" &&
        SHIFT_ID !== "A" &&
        !validShiftIds.has(SHIFT_ID)
      ) {
        invalidStages.push({
          ...shift,
          reason: `Invalid SHIFT_ID: ${SHIFT_ID}`,
        });
        continue;
      }

      const stageNameNormalized = STAGE_NAME.toLowerCase().replace(/\s+/g, "");
      if (!stageMap.has(stageNameNormalized)) {
        invalidStages.push({ ...shift, reason: "Stage not found in DB" });
        continue;
      }

      const stage_id = stageMap.get(stageNameNormalized);

      // ✅ Create unique key: date + userid + stage_id + shift_id + line
      const uniqueKey = `${Shift_date_from}|${userid}`;

      uniqueShiftsMap.set(uniqueKey, {
        ...shift,
        Shift_date_from,
        Shift_date_to,
        stage_id,
      });
    }

    // Convert Map values to array for processing
    validShifts.push(...uniqueShiftsMap.values());

    // ✅ Process only valid shifts in batches
    for (let i = 0; i < validShifts.length; i += batchSize) {
      const batch = validShifts.slice(i, i + batchSize);
      let QUERY1 = "";

      for (let shift of batch) {
        if (QUERY1.length > 0) QUERY1 += " UNION ALL ";
        QUERY1 += `
          SELECT '${shift.Shift_date_from}' AS SHIFT_FROM_DATE,
                 '${shift.Shift_date_to}' AS SHIFT_TO_DATE,
                 '${shift.userid}' AS userid,
                 '${shift.STAGE_NAME}' AS STAGE_NAME,
                 '${shift.SHIFT_ID}' AS SHIFT_ID,
                 '${shift.LINE}' AS LINE
        `;
      }

      if (QUERY1) {
        try {
          // Delete conflicting swaps to ensure new schedule takes precedence
          const deleteSwapQuery = `
            DELETE p1
            FROM Mx_Userswap AS p1
            INNER JOIN (
              SELECT SHIFT_FROM_DATE, userid
              FROM (${QUERY1}) AS Q1
            ) AS q1
            ON p1.Shift_date = q1.SHIFT_FROM_DATE
            AND p1.Swap_userid = q1.userid
          `;

          // Delete old records - Match ONLY User + DateFrom to ensure overwrite
          const deleteQuery = `
            DELETE p1
            FROM Mx_UserShifts AS p1
            INNER JOIN (
              SELECT SHIFT_FROM_DATE, userid
              FROM (${QUERY1}) AS Q1
            ) AS q1
            ON p1.shift_date_from = q1.SHIFT_FROM_DATE
            AND p1.userid = q1.userid
          `;

          // Insert new records
          const insertQuery = `
            INSERT INTO Mx_UserShifts (Shift_date_from, Shift_date_to, userid, stage_id, SHIFT_ID, LINE)
            SELECT SHIFT_FROM_DATE, SHIFT_TO_DATE, userid, P1.Stage_Id, SHIFT_ID, LINE
            FROM (${QUERY1}) AS Q1
            LEFT JOIN Mx_StageMaster AS P1
            ON REPLACE(LOWER(Q1.STAGE_NAME), ' ', '') = REPLACE(LOWER(P1.Stage_name), ' ', '')
          `;

          await request.query(deleteSwapQuery);
          await request.query(deleteQuery);
          await request.query(insertQuery);
        } catch (insertError) {
          console.error(
            "❌ Failed batch data:",
            JSON.stringify(batch, null, 2),
          );
          console.error("❌ Insert error:", insertError.message);

          // ✅ Mark this batch as failed and continue
          batch.forEach((shift) => {
            invalidStages.push({
              ...shift,
              reason: `Database error: ${insertError.message}`,
            });
          });
        }
      }
    }

    await sql.close();

    // ✅ Return ALL failed rows (invalid + duplicates)
    const allFailedRows = [...invalidStages, ...duplicates];

    res.json({
      success: allFailedRows.length === 0,
      invalidRows: invalidStages,
      duplicates: duplicates,
      failedRows: allFailedRows, // ✅ Combined array
      processedCount: validShifts.length,
      totalCount: shiftsData.length,
    });
  } catch (err) {
    console.error("❌ Error saving user shifts:", err);
    res.status(500).json({
      success: false,
      message: "Error saving user shifts.",
      error: err.message,
    });
  }
});

// Endpoint to download dynamic sample template with Stage Master data
app.get("/api/download-sample-user-shift", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    // Fetch active stages
    const stageResult = await pool
      .request()
      .query(
        "SELECT Stage_name, Stage_id, Stage_Type FROM Mx_StageMaster ORDER BY Stage_Serial",
      );
    const shiftResult = await pool
      .request()
      .query(
        "SELECT SFTID, SFTName, SFTSTTime, SFTEDTime FROM Mx_ShiftMst ORDER BY SFTID",
      );

    const workbook = new excel.Workbook();

    // Sheet 1: Template
    const worksheet = workbook.addWorksheet("Upload Template");
    worksheet.columns = [
      { header: "User ID", key: "userid", width: 15 },
      { header: "User Name (Optional)", key: "username", width: 20 },
      { header: "Stage Name", key: "stagename", width: 30 },
      { header: "Line", key: "line", width: 10 },
      // Dynamic date columns placeholders
      { header: "01-12-2025", key: "d1", width: 15 },
      { header: "02-12-2025", key: "d2", width: 15 },
    ];

    // Sheet 2: Stages Reference
    const stagesSheet = workbook.addWorksheet("Stages");
    // stagesSheet.state = 'hidden'; // Requested to be visible

    const stageNames = [];
    if (stageResult.recordset) {
      stageResult.recordset.forEach((stage) => {
        stagesSheet.addRow([stage.Stage_name]);
        stageNames.push(stage.Stage_name);
      });
    }

    // Add a single sample record as requested
    worksheet.addRow({
      userid: "100009",
      username: "Ranjith M C",
      stagename: stageNames.length > 0 ? stageNames[0] : "Stage A",
      line: "L1",
      d1: "S1",
      d2: "S1",
    });

    // Data Validation for Stage Name (Column C, which is index 3)
    // We apply it to a reasonable number of rows, e.g., 2 to 1000
    const stageColumnLetter = "C";
    const totalStages = stageNames.length;

    if (totalStages > 0) {
      // Define the range for the list in the Stages sheet (e.g., Stages!$A$1:$A$50)
      const listFormula = `'Stages'!$A$1:$A$${totalStages}`;

      for (let i = 2; i <= 1000; i++) {
        worksheet.getCell(`${stageColumnLetter}${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [listFormula],
          showErrorMessage: true,
          errorStyle: "error",
          errorTitle: "Invalid Stage",
          error: "Please select a valid stage from the list.",
        };
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=UserShiftUpload_Template.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating sample template:", error);
    res.status(500).send("Error generating sample template");
  }
});

// Get all Stages for dropdown
app.get("/api/stages_list", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT Stage_id, Stage_name, Stage_Serial FROM Mx_StageMaster ORDER BY Stage_Serial",
      );
    console.log("Stages Query Result:", result.recordset);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching stages:", error);
    res.status(500).send("Server error");
  }
});

// Get all Shifts for dropdown
app.get("/api/shifts_list", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query("SELECT SFTID, SFTName FROM Mx_ShiftMst ORDER BY SFTID");
    console.log("Shifts Query Result:", result.recordset);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).send("Server error");
  }
});

// Fetch user shifts with optional date filter
app.get("/api/getUserShifts", async (req, res) => {
  try {
    const { shifts, stages, lines, fromDate, toDate } = req.query;
    console.log(req.query)

    let pool = await sql.connect(config);
    let request = pool.request();
    let conditions = [];

    // Date Range Filter
    if (fromDate && toDate) {
      request.input("fromDate", sql.Date, fromDate);
      request.input("toDate", sql.Date, toDate);
      conditions.push("(u.Shift_date_from >= @fromDate AND u.Shift_date_from <= @toDate)");
    } else if (fromDate) {
      request.input("fromDate", sql.Date, fromDate);
      conditions.push("(u.Shift_date_from >= @fromDate)");
    } else if (toDate) {
      request.input("toDate", sql.Date, toDate);
      conditions.push("(u.Shift_date_from <= @toDate)");
    }

    // Shifts Filter (e.g., shifts="S1,S2")
    if (shifts && shifts.trim() !== "") {
      const shiftArr = shifts.split(",").map((s) => s.trim()).filter(Boolean);
      const shiftParams = shiftArr.map((s, index) => {
        const paramName = `shift_${index}`;
        request.input(paramName, sql.VarChar, s);
        return `@${paramName}`;
      });
      if (shiftParams.length) conditions.push(`u.SHIFT_ID IN (${shiftParams.join(",")})`);
    }

    // Stages Filter (Handles both Stage IDs like "5" and Stage Names)
    if (stages && stages.trim() !== "") {
      const stageArr = stages.split(",").map((s) => s.trim()).filter(Boolean);
      const isNumeric = stageArr.every((stg) => !isNaN(stg));

      const stageParams = stageArr.map((stg, index) => {
        const paramName = `stage_${index}`;
        if (isNumeric) {
          request.input(paramName, sql.Int, parseInt(stg, 10));
        } else {
          request.input(paramName, sql.VarChar, stg);
        }
        return `@${paramName}`;
      });

      if (stageParams.length) {
        // Query stage_id if numbers are passed, otherwise query Stage_name
        const columnTarget = isNumeric ? "u.stage_id" : "s.Stage_name";
        conditions.push(`${columnTarget} IN (${stageParams.join(",")})`);
      }
    }

    // Lines Filter (e.g., lines="3A,3B")
    if (lines && lines.trim() !== "") {
      const lineArr = lines.split(",").map((l) => l.trim()).filter(Boolean);
      const lineParams = lineArr.map((line, index) => {
        const paramName = `line_${index}`;
        request.input(paramName, sql.VarChar, line);
        return `@${paramName}`;
      });
      if (lineParams.length) conditions.push(`u.LINE IN (${lineParams.join(",")})`);
    }

    let query = `
      SELECT DISTINCT u.Shift_date_from, u.Shift_date_to, u.userid, u.SHIFT_ID, u.LINE, s.Stage_name, m.NAME AS user_name
      FROM Mx_UserShifts u
      LEFT JOIN MX_USERMST m ON u.userid = m.USERID
      LEFT JOIN Mx_StageMaster s ON u.stage_id = s.stage_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY u.SHIFT_ID, s.Stage_name, u.LINE`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching user shifts:", error);
    res.status(500).send("Server error");
  }
});

app.get("/api/attendance/overall-summary", async (req, res) => {
  const { fromDate, toDate, shifts, lines } = req.query;

  console.log("Received parameters:", { fromDate, toDate, shifts, lines });

  try {
    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: "Both fromDate and toDate parameters are required",
      });
    }

    const pool = await sql.connect(config);
    const request = pool.request();

    let whereClause = `ISNULL(P2.UserIDEnbl, 0) = 1`;

    // Add date range filter
    whereClause += ` AND P1.Shift_date_from >= @fromDate AND P1.Shift_date_from <= @toDate`;
    request.input("fromDate", sql.Date, new Date(fromDate));
    request.input("toDate", sql.Date, new Date(toDate));

    // Handle multiple shifts
    if (shifts && shifts.trim() !== "") {
      const shiftArray = shifts
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
      if (shiftArray.length > 0) {
        const shiftPlaceholders = shiftArray
          .map((_, index) => `@shift${index}`)
          .join(",");
        whereClause += ` AND RTRIM(P1.SHIFT_ID) IN (${shiftPlaceholders})`; // ADD RTRIM

        shiftArray.forEach((shift, index) => {
          request.input(`shift${index}`, sql.VarChar, shift);
        });
      }
    }

    // Handle multiple lines
    if (lines && lines.trim() !== "") {
      const lineArray = lines
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l !== "");
      if (lineArray.length > 0) {
        const linePlaceholders = lineArray
          .map((_, index) => `@line${index}`)
          .join(",");
        whereClause += ` AND RTRIM(P1.LINE) IN (${linePlaceholders})`; // ADD RTRIM

        lineArray.forEach((line, index) => {
          request.input(`line${index}`, sql.VarChar, line);
        });
      }
    }

    const query = `
      WITH ShiftInfo AS (
        SELECT DISTINCT  -- ✅ ADD DISTINCT HERE
          P1.USERID, 
          P1.Shift_date_from, 
          RTRIM(P1.SHIFT_ID) AS SHIFT_ID,  -- ✅ TRIM SHIFT_ID
          RTRIM(P1.LINE) AS LINE,          -- ✅ TRIM LINE
          SM.SFTSTTime,
          
          CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME) AS ShiftStartDateTime,
          
          CASE WHEN SM.SFTEDTime < SM.SFTSTTime 
               THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME))
               ELSE CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME)
          END AS ShiftEndDateTime
          
        FROM Mx_UserShifts AS P1
        INNER JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID  -- ✅ CHANGE TO INNER JOIN
        INNER JOIN Mx_ShiftMst AS SM ON RTRIM(P1.SHIFT_ID) = RTRIM(SM.SFTID)  -- ✅ INNER JOIN + RTRIM
        WHERE ${whereClause}
      ),
      AttendanceStatus AS (
        SELECT DISTINCT  -- ✅ ADD DISTINCT HERE TOO
            SI.USERID,
            SI.Shift_date_from,
            SI.SHIFT_ID,
            SI.LINE,
            SI.ShiftStartDateTime,
            SI.ShiftEndDateTime,
            CASE WHEN EXISTS (
                SELECT 1 
                FROM Mx_ATDEventTrn E 
                WHERE E.USERID = SI.USERID 
                  AND E.EDateTime >= DATEADD(MINUTE, -45, SI.ShiftStartDateTime) 
                  AND E.EDateTime <= SI.ShiftEndDateTime
            ) THEN 1 ELSE 0 END AS IsPresent
        FROM ShiftInfo SI
      )
      
      SELECT 
        Shift_date_from AS DATE,
        SHIFT_ID AS SHIFT,
        LINE,
        COUNT(DISTINCT USERID) AS ALLOTTED,  -- ✅ COUNT DISTINCT USERID
        SUM(IsPresent) AS PRESENT,
        COUNT(DISTINCT USERID) - SUM(IsPresent) AS ABSENT  -- ✅ USE COUNT DISTINCT
      FROM AttendanceStatus
      GROUP BY Shift_date_from, SHIFT_ID, LINE
      ORDER BY Shift_date_from, SHIFT_ID, LINE;
    `;

    console.log("Executing query with parameters:", request.parameters);

    const result = await request.query(query);

    console.log("Query result count:", result.recordset.length);

    const responseData = result.recordset || [];
    console.log("Overall Summary Query Result:", responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching overall summary:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// app.get("/api/attendance/allot", async (req, res) => {
//   const { date, shiftId, stageName, line } = req.query;

//   const query = `
// SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE
//    FROM (
//       SELECT Q1.*,
//         CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
//         CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
//         1 AS ALLOT,
//    CASE WHEN ISNULL(NSTAGE_ID,0)<>0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
//                  CASE WHEN ISNULL(NLINE,'')<>'' THEN NLINE ELSE LINE END AS LINE1
//       FROM (
//         SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
//           (SELECT TOP 1 P5.Edatetime
//            FROM Mx_ATDEventTrn AS P5
//            WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
//            ORDER BY P5.Edatetime) AS PUNCHDATE,

//  (SELECT TOP 1 P5.STAGE_ID
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,
//                      (SELECT TOP 1 P5.LINE
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NLINE
//         FROM Mx_UserShifts AS P1
//         LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
//         LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
// 		LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.Stage_id
//         LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
//         WHERE Shift_date_from = @date
//           AND ISNULL(P2.UserIDEnbl, 0) = 1 AND ISNULL(P2.IsAuthHost,0) = 0
//           AND P1.SHIFT_ID = @shiftId
//       ) AS Q1
//     ) AS Q1
//         LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.Stage_id

//     WHERE  P4.Stage_name = @stageName
// 	AND Q1.LINE1 = @line
// 	    ORDER BY STAGE_NAME, SHIFT_ID, USERID;`;

//   try {
//     let pool = await sql.connect(config);
//     const results = await pool
//       .request()
//       .input("date", sql.Date, date)
//       .input("shiftId", sql.VarChar, shiftId)
//       .input("stageName", sql.VarChar, stageName)
//       .input("line", sql.VarChar, line)
//       .query(query);

//     res.json(results.recordset);
//   } catch (error) {
//     console.error("Error fetching allot records:", error);
//     res.status(500).send({ error: "Server Error", details: error.message });
//   }
// });

// app.get("/api/attendance/present", async (req, res) => {
//   let pool = await sql.connect(config);
//   const { date, shiftId, stageName, line } = req.query;

//   const query = `
// SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE, PUNCHDATE
//    FROM (
//       SELECT Q1.*,
//         CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
//         CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
//         1 AS ALLOT,
//    CASE WHEN ISNULL(NSTAGE_ID,0)<>0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
//                  CASE WHEN ISNULL(NLINE,'')<>'' THEN NLINE ELSE LINE END AS LINE1
//       FROM (
//         SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
//           (SELECT TOP 1 P5.Edatetime
//            FROM Mx_ATDEventTrn AS P5
//            WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
//            ORDER BY P5.Edatetime) AS PUNCHDATE,

//  (SELECT TOP 1 P5.STAGE_ID
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,
//                      (SELECT TOP 1 P5.LINE
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NLINE
//         FROM Mx_UserShifts AS P1
//         LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
//         LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
// 		LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.Stage_id
//         LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
//         WHERE Shift_date_from = @date
//           AND ISNULL(P2.UserIDEnbl, 0) = 1 AND ISNULL(P2.IsAuthHost,0) = 0
//           AND P1.SHIFT_ID = @shiftId
//       ) AS Q1
//     ) AS Q1
//         LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.Stage_id

//     WHERE ISNULL(PUNCHDATE, '') <> ''
// 	AND P4.Stage_name = @stageName
// 	AND Q1.LINE1 = @line
// 	    ORDER BY STAGE_NAME, SHIFT_ID, USERID;
//   `;

//   try {
//     const results = await pool
//       .request()
//       .input("date", sql.Date, date)
//       .input("shiftId", sql.VarChar, shiftId)
//       .input("stageName", sql.VarChar, stageName)
//       .input("line", sql.Char, line)
//       .query(query);
//     console.log(results.recordset);
//     res.json(results.recordset);
//   } catch (error) {
//     console.error("Error fetching present records:", error);
//     res.status(500).send({ error: "Server Error", details: error.message });
//   }
// });
// app.get("/api/attendance/absent", async (req, res) => {
//   let pool = await sql.connect(config);
//   const { date, shiftId, stageName, line } = req.query;

//   const query = `
// SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE,
// 	 (SELECT TOP 1 Swap_userid+'-'+P6A.NAME  FROM MX_USERSWAP AS P6
// 		 LEFT OUTER JOIN Mx_UserMst AS P6A ON P6.Swap_userid = P6A.USERID
// 		 WHERE P6.SHIFT_DATE=@date
// 				 AND P6.Absent_userid = Q1.userid AND P6.Shift_id = Q1.SHIFT_ID AND P6.Line = Q1.LINE1 ) AS SWAPUSERNAME
//    FROM (
//       SELECT Q1.*,
//         CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
//         CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
//         1 AS ALLOT,
//    CASE WHEN ISNULL(NSTAGE_ID,0)<>0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
//                  CASE WHEN ISNULL(NLINE,'')<>'' THEN NLINE ELSE LINE END AS LINE1
//       FROM (
//         SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
//           (SELECT TOP 1 P5.Edatetime
//            FROM Mx_ATDEventTrn AS P5
//            WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
//            ORDER BY P5.Edatetime) AS PUNCHDATE,

//  (SELECT TOP 1 P5.STAGE_ID
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,
//                      (SELECT TOP 1 P5.LINE
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NLINE
//         FROM Mx_UserShifts AS P1
//         LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
//         LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
// 		LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.Stage_id
//         LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
//         WHERE Shift_date_from = @date
//           AND ISNULL(P2.UserIDEnbl, 0) = 1 AND ISNULL(P2.IsAuthHost,0) = 0
//           AND P1.SHIFT_ID = @shiftId
//       ) AS Q1
//     ) AS Q1
//         LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.Stage_id

//     WHERE ISNULL(PUNCHDATE, '') = ''
// 	AND P4.Stage_name = @stageName
// 	AND Q1.LINE1 = @line
// 	    ORDER BY STAGE_NAME, SHIFT_ID, USERID;
//   `;

//   try {
//     const results = await pool
//       .request()
//       .input("date", sql.Date, date)
//       .input("shiftId", sql.VarChar, shiftId)
//       .input("stageName", sql.VarChar, stageName)
//       .input("line", sql.Char, line)
//       .query(query);
//     console.log(results.recordset);
//     res.json(results.recordset);
//   } catch (error) {
//     console.error("Error fetching absent records:", error);
//     res.status(500).send({ error: "Server Error", details: error.message });
//   }
// });

app.get("/api/attendance/showAll", async (req, res) => {
  const pool = await sql.connect(config);
  const { date, shifts, lines, stageId } = req.query;

  // Validate required parameters
  if (!date) {
    return res.status(400).json({ error: "date parameter is required" });
  }
  if (!shifts || !lines) {
    return res.status(400).json({
      error: "shifts and lines parameters are required",
    });
  }

  // Process comma-separated values
  const shiftsArr = shifts
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const linesArr = lines
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!shiftsArr.length || !linesArr.length) {
    return res.status(400).json({
      error: "shifts and lines must each contain at least one value",
    });
  }

  const shiftsString = shiftsArr.join(",");
  const linesString = linesArr.join(",");

  const rawSql = `WITH Assignments AS (
    SELECT
        US.USERID,
        US.stage_id AS Original_Stage_ID,
        US.LINE AS Original_LINE,
        US.SHIFT_ID,
        US.Shift_date_from,
        SM.SFTName AS ShiftName,
        SM.SFTSTTime AS StartTime,
        SM.SFTEDTime AS EndTime,
        CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME) AS ShiftStartDateTime,
        CASE WHEN SM.SFTEDTime < SM.SFTSTTime
             THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME))
             ELSE CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME)
        END AS ShiftEndDateTime,
        -- ✅ ADD: Extended shift end with 30-minute grace period
        CASE WHEN SM.SFTEDTime < SM.SFTSTTime
             THEN DATEADD(MINUTE, 30, DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME)))
             ELSE DATEADD(MINUTE, 30, CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME))
        END AS ShiftEndWithGrace
    FROM dbo.Mx_UserShifts US
    LEFT JOIN dbo.Mx_ShiftMst SM ON US.SHIFT_ID = SM.SFTID
    LEFT JOIN dbo.MX_USERMST U ON US.USERID = U.USERID
    WHERE US.Shift_date_from = @Date
      AND ISNULL(U.UserIDEnbl, 0) = 1
),
Swaps AS (
    SELECT DISTINCT
        SW.SWAP_USERID,
        SW.STAGE_ID,
        SW.LINE,
        SW.SHIFT_DATE
    FROM dbo.Mx_Userswap SW
    WHERE SW.SHIFT_DATE = @Date
),
SmartPunches AS (
    SELECT 
        A.USERID,
        A.SHIFT_ID,
        A.ShiftStartDateTime,
        A.ShiftEndDateTime,
        A.ShiftEndWithGrace,  -- ✅ ADD: Pass grace period to SmartPunches
        
        -- PUNCH IN logic (unchanged)
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM Mx_ATDEventTrn E2
                WHERE E2.USERID = A.USERID
                  AND E2.EDateTime BETWEEN DATEADD(MINUTE, -45, A.ShiftStartDateTime) AND A.ShiftStartDateTime
            )
            THEN (
                SELECT MAX(E2.EDateTime)
                FROM Mx_ATDEventTrn E2
                WHERE E2.USERID = A.USERID
                  AND E2.EDateTime BETWEEN DATEADD(MINUTE, -45, A.ShiftStartDateTime) AND A.ShiftStartDateTime
            )
            ELSE (
                SELECT MIN(E2.EDateTime)
                FROM Mx_ATDEventTrn E2
                WHERE E2.USERID = A.USERID
                  AND E2.EDateTime >= A.ShiftStartDateTime
                  AND E2.EDateTime <= A.ShiftEndWithGrace  -- ✅ CHANGED: Use grace period
            )
        END AS PUNCHIN,
        
        -- ✅ MODIFIED: PUNCH OUT with 30-minute grace period
        (
            SELECT MAX(E2.EDateTime)
            FROM Mx_ATDEventTrn E2
            WHERE E2.USERID = A.USERID
              AND E2.EDateTime >= A.ShiftStartDateTime
              AND E2.EDateTime <= A.ShiftEndWithGrace  -- ✅ CHANGED: Extended by 30 minutes
        ) AS PUNCHOUT,
        
        -- ✅ MODIFIED: Total punch count with grace period
        (
            SELECT COUNT(*)
            FROM Mx_ATDEventTrn E2
            WHERE E2.USERID = A.USERID
              AND E2.EDateTime >= DATEADD(MINUTE, -45, A.ShiftStartDateTime)
              AND E2.EDateTime <= A.ShiftEndWithGrace  -- ✅ CHANGED: Use grace period
        ) AS PunchCount
    FROM Assignments A
)

SELECT DISTINCT
    COALESCE(SP.USERID, A.USERID, S.SWAP_USERID) AS USERID,
    COALESCE(AU.NAME, SU.NAME) AS NAME,
    
    CASE
        WHEN A.USERID IS NOT NULL THEN 'Original'
        WHEN S.SWAP_USERID IS NOT NULL THEN 'Swapped In'
        ELSE 'Unknown'
    END AS SwapStatus,
    
    A.SHIFT_ID,
    A.ShiftName,
    A.StartTime,
    A.EndTime,
    ISNULL(A.Shift_date_from, @Date) AS Shift_date_from,
    A.ShiftStartDateTime,
    A.ShiftEndDateTime,
    ISNULL(S.STAGE_ID, A.Original_Stage_ID) AS Effective_Stage_ID,
    ISNULL(S.LINE, A.Original_LINE) AS LINE,
    ST.stage_name AS Stage_name,
    ST.Stage_id,
    ST.Stage_Serial,
    
    SP.PUNCHIN,
    FORMAT(SP.PUNCHIN, 'HH:mm:ss') AS PunchInTimeOnly,
    SP.PUNCHOUT,
    FORMAT(SP.PUNCHOUT, 'HH:mm:ss') AS PunchOutTimeOnly,
    SP.PunchCount AS TotalPunches,
    
    CASE
        WHEN SP.PUNCHIN IS NOT NULL THEN 'Present'
        ELSE 'Absent'
    END AS STATUS,
    
    CASE
        WHEN SP.PUNCHIN IS NULL THEN 'No Punch'
        WHEN A.ShiftStartDateTime IS NULL THEN 'No Shift Info'
        WHEN SP.PUNCHIN <= DATEADD(MINUTE, -10, A.ShiftStartDateTime) THEN 'On Time'
        ELSE 'Late'
    END AS PunctualityStatus,

    CASE
        WHEN SP.PUNCHIN IS NULL OR A.ShiftStartDateTime IS NULL THEN 0
        WHEN SP.PUNCHIN > DATEADD(MINUTE, -15, A.ShiftStartDateTime)
             THEN DATEDIFF(minute, DATEADD(MINUTE, -10, A.ShiftStartDateTime), SP.PUNCHIN)
        ELSE 0
    END AS LateByMinutes,
    
    CASE WHEN SP.PUNCHIN IS NOT NULL AND SP.PUNCHOUT IS NOT NULL AND SP.PUNCHOUT >= SP.PUNCHIN
         THEN DATEDIFF(minute, SP.PUNCHIN, SP.PUNCHOUT)
         ELSE 0 END AS WorkedMinutes,
    
    -- ✅ MODIFIED: Overtime calculation considers grace period
    CASE 
        WHEN A.ShiftEndDateTime IS NOT NULL AND SP.PUNCHOUT > A.ShiftEndDateTime
        THEN CASE 
            -- If punch out is within 30-min grace, no overtime
            WHEN SP.PUNCHOUT <= A.ShiftEndWithGrace 
            THEN 0
            -- If beyond grace period, calculate overtime from actual shift end
            ELSE DATEDIFF(minute, A.ShiftEndDateTime, SP.PUNCHOUT)
        END
        ELSE 0 
    END AS OvertimeMinutes

FROM Assignments A
LEFT JOIN SmartPunches SP ON SP.USERID = A.USERID
LEFT JOIN Swaps S ON A.USERID = S.SWAP_USERID
    AND A.Shift_date_from = S.SHIFT_DATE
LEFT JOIN dbo.MX_USERMST AU ON A.USERID = AU.USERID
LEFT JOIN dbo.MX_USERMST SU ON S.SWAP_USERID = SU.USERID
LEFT JOIN dbo.Mx_STAGEMASTER ST ON ISNULL(S.STAGE_ID, A.Original_Stage_ID) = ST.stage_id

WHERE (@ShiftIds IS NULL OR A.SHIFT_ID IN (
    SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@ShiftIds, ',')
))
AND (@LineIds IS NULL OR ISNULL(S.LINE, A.Original_LINE) IN (
    SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@LineIds, ',')
))
AND (@StageId IS NULL OR ISNULL(S.STAGE_ID, A.Original_Stage_ID) = @StageId)

ORDER BY Stage_name, SHIFT_ID, USERID;
`;

  try {
    const conn = await pool;
    const request = conn.request();

    request.input("Date", sql.Date, date);
    request.input("ShiftIds", sql.NVarChar, shiftsString);
    request.input("LineIds", sql.NVarChar, linesString);

    if (stageId && !isNaN(parseInt(stageId))) {
      request.input("StageId", sql.Int, parseInt(stageId));
    } else {
      request.input("StageId", sql.Int, null);
    }

    const { recordset } = await request.query(rawSql);
    console.log(recordset);
    res.json(recordset);
  } catch (error) {
    console.error("Error fetching attendance records:", error.message);
    res.status(500).send({ error: "Server Error", details: error.message });
  }
});

// New endpoint for unassigned manpower and wrong shift employees
app.get("/api/attendance/unassignedManpower", async (req, res) => {
  const pool = await sql.connect(config);
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: "date parameter is required" });
  }

  const rawSql = `
DECLARE @TargetDate DATE = @Date;

-- =====================================================================
-- Step 1: Get unique users assigned to shifts on target date
-- =====================================================================
WITH AssignedUsers AS (
    SELECT DISTINCT
        US.USERID,
        UM.NAME,
        RTRIM(US.SHIFT_ID) AS SHIFT_ID,
        RTRIM(US.LINE) AS LINE,
        US.stage_id,
        ST.stage_name,
        SM.SFTName,
        SM.SFTSTTime,
        SM.SFTEDTime,
        
        -- Assigned shift window with tolerance
        CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME) AS AssignedShiftStart,
        
        CASE 
            WHEN SM.SFTEDTime < SM.SFTSTTime  -- Night shift
            THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME))
            ELSE CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME)
        END AS AssignedShiftEnd,
        
        -- Acceptable punch-in window: 60 min before to 120 min after shift start
        DATEADD(MINUTE, -60, CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME)) AS AllowedPunchStart,
        DATEADD(MINUTE, 120, CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME)) AS AllowedPunchEnd
        
    FROM Mx_UserShifts US
    INNER JOIN MX_USERMST UM ON US.USERID = UM.USERID
    INNER JOIN Mx_ShiftMst SM ON RTRIM(US.SHIFT_ID) = RTRIM(SM.SFTID)
    LEFT JOIN Mx_STAGEMASTER ST ON US.stage_id = ST.stage_id
    WHERE US.Shift_date_from = @TargetDate
      AND ISNULL(UM.UserIDEnbl, 0) = 1
),

-- =====================================================================
-- Step 2: Get actual punch records (first and last punch)
-- =====================================================================
UserPunches AS (
    SELECT 
        E.USERID,
        MIN(E.EDateTime) AS FirstPunch,
        MAX(E.EDateTime) AS LastPunch,
        COUNT(*) AS PunchCount,
        
        -- Also check if there's a punch crossing midnight for night shifts
        MAX(CASE WHEN CAST(E.EDateTime AS DATE) = DATEADD(DAY, 1, @TargetDate) 
                 THEN E.EDateTime END) AS NextDayPunch
    FROM Mx_ATDEventTrn E
    WHERE (CAST(E.EDateTime AS DATE) = @TargetDate 
           OR CAST(E.EDateTime AS DATE) = DATEADD(DAY, 1, @TargetDate))
    GROUP BY E.USERID
),

-- =====================================================================
-- Step 3: Detect actual shift based on first punch time
-- =====================================================================
ActualShiftDetection AS (
    SELECT 
        P.USERID,
        P.FirstPunch,
        P.LastPunch,
        P.PunchCount,
        
        -- Find best matching shift based on punch-in time
        (SELECT TOP 1 SM2.SFTID
         FROM Mx_ShiftMst SM2
         WHERE P.FirstPunch BETWEEN 
             DATEADD(MINUTE, -60, CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM2.SFTSTTime, 108) AS DATETIME))
             AND 
             DATEADD(MINUTE, 120, CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM2.SFTSTTime, 108) AS DATETIME))
         ORDER BY ABS(DATEDIFF(MINUTE, P.FirstPunch, 
             CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM2.SFTSTTime, 108) AS DATETIME)))
        ) AS DetectedShiftID,
        
        (SELECT TOP 1 SM2.SFTName
         FROM Mx_ShiftMst SM2
         WHERE P.FirstPunch BETWEEN 
             DATEADD(MINUTE, -60, CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM2.SFTSTTime, 108) AS DATETIME))
             AND 
             DATEADD(MINUTE, 120, CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM2.SFTSTTime, 108) AS DATETIME))
         ORDER BY ABS(DATEDIFF(MINUTE, P.FirstPunch, 
             CAST(CONVERT(VARCHAR(10), @TargetDate, 120) + ' ' + CONVERT(VARCHAR(8), SM2.SFTSTTime, 108) AS DATETIME)))
        ) AS DetectedShiftName
        
    FROM UserPunches P
    WHERE P.FirstPunch IS NOT NULL
),

-- =====================================================================
-- Step 4: Identify WRONG SHIFT users
-- =====================================================================
WrongShiftUsers AS (
    SELECT DISTINCT
        AU.USERID,
        AU.NAME,
        'Wrong Shift Detected' AS SwapStatus,
        
        -- Assigned shift info
        AU.SHIFT_ID,
        AU.SFTName AS ShiftName,
        AU.SFTSTTime AS StartTime,
        AU.SFTEDTime AS EndTime,
        @TargetDate AS Shift_date_from,
        AU.AssignedShiftStart AS ShiftStartDateTime,
        AU.AssignedShiftEnd AS ShiftEndDateTime,
        AU.stage_id AS Effective_Stage_ID,
        AU.LINE,
        AU.stage_name AS Stage_name,
        AU.stage_id AS Stage_id,
        
        -- Punch info
        ASD.FirstPunch AS PUNCHIN,
        FORMAT(ASD.FirstPunch, 'HH:mm:ss') AS PunchInTimeOnly,
        ASD.LastPunch AS PUNCHOUT,
        FORMAT(ASD.LastPunch, 'HH:mm:ss') AS PunchOutTimeOnly,
        ASD.PunchCount AS TotalPunches,
        
        'Present (Wrong Shift)' AS STATUS,
        'Wrong Shift' AS PunctualityStatus,
        
        -- Calculate late minutes if applicable
        CASE 
            WHEN ASD.FirstPunch > AU.AssignedShiftStart 
            THEN DATEDIFF(MINUTE, AU.AssignedShiftStart, ASD.FirstPunch)
            ELSE 0 
        END AS LateByMinutes,
        
        -- Calculate worked minutes
        CASE 
            WHEN ASD.FirstPunch IS NOT NULL AND ASD.LastPunch IS NOT NULL AND ASD.LastPunch >= ASD.FirstPunch
            THEN DATEDIFF(MINUTE, ASD.FirstPunch, ASD.LastPunch)
            ELSE 0 
        END AS WorkedMinutes,
        
        0 AS OvertimeMinutes,
        
        -- Comparison columns
        RTRIM(AU.SHIFT_ID) + ' - ' + AU.SFTName + ' (' + AU.SFTSTTime + '-' + AU.SFTEDTime + ')' AS AssignedShift,
        ISNULL(RTRIM(ASD.DetectedShiftID) + ' - ' + ASD.DetectedShiftName, 'Unknown') AS ActualShift,
        ASD.DetectedShiftID AS ActualShiftID,
        AU.LINE AS AssignedLine,
        AU.LINE AS ActualLine,
        AU.stage_name AS AssignedStage,
        AU.stage_name AS ActualStage
        
    FROM AssignedUsers AU
    INNER JOIN ActualShiftDetection ASD ON AU.USERID = ASD.USERID
    WHERE 
        -- User punched but NOT within their assigned shift's acceptable window
        ASD.FirstPunch IS NOT NULL
        AND NOT (
            ASD.FirstPunch BETWEEN AU.AllowedPunchStart AND AU.AllowedPunchEnd
        )
        -- AND the detected shift is different from assigned shift
        AND RTRIM(ASD.DetectedShiftID) <> RTRIM(AU.SHIFT_ID)
),

-- =====================================================================
-- Step 5: Identify NO SHIFT ASSIGNED users
-- =====================================================================
NoShiftUsers AS (
    SELECT DISTINCT
        UM.USERID,
        UM.NAME,
        'No Shift Assigned' AS SwapStatus,
        
        NULL AS SHIFT_ID,
        NULL AS ShiftName,
        NULL AS StartTime,
        NULL AS EndTime,
        @TargetDate AS Shift_date_from,
        NULL AS ShiftStartDateTime,
        NULL AS ShiftEndDateTime,
        NULL AS Effective_Stage_ID,
        NULL AS LINE,
        'N/A' AS Stage_name,
        NULL AS Stage_id,
        
        ASD.FirstPunch AS PUNCHIN,
        FORMAT(ASD.FirstPunch, 'HH:mm:ss') AS PunchInTimeOnly,
        ASD.LastPunch AS PUNCHOUT,
        FORMAT(ASD.LastPunch, 'HH:mm:ss') AS PunchOutTimeOnly,
        ASD.PunchCount AS TotalPunches,
        
        'Present (No Shift)' AS STATUS,
        'No Shift' AS PunctualityStatus,
        0 AS LateByMinutes,
        
        CASE 
            WHEN ASD.FirstPunch IS NOT NULL AND ASD.LastPunch IS NOT NULL AND ASD.LastPunch >= ASD.FirstPunch
            THEN DATEDIFF(MINUTE, ASD.FirstPunch, ASD.LastPunch)
            ELSE 0 
        END AS WorkedMinutes,
        
        0 AS OvertimeMinutes,
        
        'N/A (Not Assigned)' AS AssignedShift,
        ISNULL(RTRIM(ASD.DetectedShiftID) + ' - ' + ASD.DetectedShiftName, 'Unknown') AS ActualShift,
        ASD.DetectedShiftID AS ActualShiftID,
        'N/A' AS AssignedLine,
        'N/A' AS ActualLine,
        'N/A' AS AssignedStage,
        'N/A' AS ActualStage
        
    FROM MX_USERMST UM
    INNER JOIN ActualShiftDetection ASD ON UM.USERID = ASD.USERID
    WHERE ISNULL(UM.UserIDEnbl, 0) = 1
      -- User has no shift assignment on target date
      AND NOT EXISTS (
          SELECT 1 FROM Mx_UserShifts US 
          WHERE US.USERID = UM.USERID 
            AND US.Shift_date_from = @TargetDate
      )
      -- But has historical assignments (valid employee)
      AND EXISTS (
          SELECT 1 FROM Mx_UserShifts US 
          WHERE US.USERID = UM.USERID
      )
)

-- =====================================================================
-- Final Result: Return ONLY wrong shift users and no-shift users
-- =====================================================================
SELECT * FROM WrongShiftUsers
UNION ALL
SELECT * FROM NoShiftUsers
ORDER BY STATUS DESC, USERID;
`;

  try {
    const conn = await pool;
    const request = conn.request();
    request.input("Date", sql.Date, date);

    const { recordset } = await request.query(rawSql);
    console.log(
      `Unassigned/Wrong Shift Results: ${recordset.length} users found`,
    );
    res.json(recordset);
  } catch (error) {
    console.error("Error fetching unassigned manpower:", error.message);
    res.status(500).send({ error: "Server Error", details: error.message });
  }
});

app.get("/api/attendance", async (req, res) => {
  const { date, shifts, lines } = req.query;
  console.log(req.query);
  let pool = await sql.connect(config);

  try {
    const shiftList = shifts.split(",").map((s) => s.trim());
    const lineList = lines.split(",").map((l) => l.trim());

    const result = await pool.request().input("Date", sql.Date, new Date(date))
      .query(`
        WITH ShiftInfo AS (
            SELECT 
                A.USERID,
                A.SHIFT_ID,
                A.LINE,
                A.stage_id,
                SM.SFTSTTime,
                -- Smart shift calculation
                CAST(CONVERT(VARCHAR(10), A.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME) AS ShiftStartDateTime,
                CASE WHEN SM.SFTEDTime < SM.SFTSTTime
                     THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), A.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME))
                     ELSE CAST(CONVERT(VARCHAR(10), A.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME)
                END AS ShiftEndDateTime
            FROM dbo.Mx_UserShifts A
            LEFT JOIN dbo.Mx_ShiftMst SM ON A.SHIFT_ID = SM.SFTID
            LEFT JOIN dbo.MX_USERMST B ON A.USERID = B.USERID
            WHERE A.Shift_date_from = @Date
              AND ISNULL(B.UserIDEnbl, 0) = 1
              AND A.SHIFT_ID IN (${shiftList.map((s) => `'${s}'`).join(",")})
              AND A.LINE IN (${lineList.map((l) => `'${l}'`).join(",")})
        ),
        AttendanceStatus AS (
            SELECT 
                SI.*,
                CASE WHEN EXISTS (
                    SELECT 1 
                    FROM dbo.Mx_ATDEventTrn E 
                    WHERE E.USERID = SI.USERID 
                      AND E.EDateTime >= DATEADD(MINUTE, -45, SI.ShiftStartDateTime)
                      AND E.EDateTime <= SI.ShiftEndDateTime
                ) THEN 1 ELSE 0 END AS IsPresent
            FROM ShiftInfo SI
        )
        
        SELECT 
            ST.Stage_name,
            ST.Stage_Serial,
            A.LINE,
            A.SHIFT_ID,
            A.SFTSTTime,
            COUNT(*) AS ALLOT,
            SUM(A.IsPresent) AS PRESENT,
            CAST(SUM(CASE WHEN A.IsPresent = 0 THEN 1 ELSE 0 END) AS INT) AS ABSENT
        FROM AttendanceStatus A
        LEFT JOIN dbo.Mx_STAGEMASTER ST ON A.stage_id = ST.stage_id
        GROUP BY ST.Stage_name, ST.Stage_Serial, A.LINE, A.SHIFT_ID, A.SFTSTTime
        ORDER BY ST.Stage_Serial ASC;
      `);
    console.log(result.recordset);

    res.json(result.recordset);
    console.log("attendance", result.recordset);
  } catch (error) {
    console.error("Error fetching attendance details:", error);
    res.status(500).send("Error fetching data from the database");
  } finally {
    await sql.close();
  }
});

app.get("/download-template-us", (req, res) => {
  const filePath = path.join(
    __dirname,
    "../master/public",
    "skill upload new.xlsx",
  );
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("Error downloading file");
    }
  });
});

app.use(express.static(path.join(__dirname, "../master/public")));

app.get("/download-template", (req, res) => {
  const filePath = path.join(
    __dirname,
    "../master/public",
    "sample_template.xlsx",
  );
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("Error downloading file");
    }
  });
});

app.get("/api/shifts", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool.request().query(
      `SELECT DISTINCT SHIFT_ID 
FROM   Mx_UserShifts
ORDER  BY SHIFT_ID;
`,
    );
    console.log(result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching shifts:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/lines", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(`SELECT DISTINCT LINE FROM Mx_UserShifts ORDER BY LINE ASC`);
    console.log(result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching lines:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/lines/:oldLineName", async (req, res) => {
  let { oldLineName } = req.params;
  const { newLineName } = req.body; // <-- must come from frontend

  if (!newLineName || newLineName.trim() === "") {
    return res.status(400).json({ error: "New line name is required" });
  }

  console.log(req.params);
  if (oldLineName === "null") {
    oldLineName = null;
  }

  try {
    let pool = await sql.connect(config);

    await pool
      .request()
      .input("newLineName", sql.VarChar, newLineName)
      .input("oldLineName", sql.VarChar, oldLineName) // This can be null
      .query(`
        UPDATE Mx_UserShifts
        SET LINE = @newLineName
        WHERE (@oldLineName IS NULL AND LINE IS NULL) OR (LINE = @oldLineName);

        UPDATE Mx_UserSwap
        SET LINE = @newLineName
        WHERE (@oldLineName IS NULL AND LINE IS NULL) OR (LINE = @oldLineName);
    `);

    res.json({
      success: true,
      message: ` Line updated from '${oldLineName}' to '${newLineName}'. `,
    });
  } catch (err) {
    console.error("Error updating line:", err);
    res.status(500).json({ error: "Error updating line" });
  }
});

// DELETE API - Set LINE as NULL in both tables
app.delete("/api/lines/:lineName", async (req, res) => {
  const { lineName } = req.params;

  try {
    let pool = await sql.connect(config);

    // Update both tables: Mx_UserShifts and Mx_UserSwap
    await pool.request().input("lineName", sql.VarChar, lineName).query(`
        UPDATE Mx_UserShifts SET LINE = NULL WHERE LINE = @lineName;
        UPDATE Mx_UserSwap SET LINE = NULL WHERE LINE = @lineName;
      `);

    res.json({
      success: true,
      message: `Line '${lineName}' set to NULL in both tables.`,
    });
  } catch (err) {
    console.error("Error deleting line:", err);
    res.status(500).json({ error: "Error deleting line" });
  }
});

app.get("/api/getEmployees", async (req, res) => {
  const { date, shiftId, Stage_name, Line } = req.query;
  console.log({ date, shiftId, Stage_name, Line });

  if (!date || !shiftId) {
    return res
      .status(400)
      .json({ error: "Date and Shift ID are required parameters." });
  }

  const query = `SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE,
(SELECT TOP 1 Skill_Description  FROM Mx_UserSkills AS P1
LEFT OUTER JOIN MX_SKILLMASTER AS P2 ON P1.Skill_id = P2.Skill_id WHERE
Q1.userid = P1.userid ORDER BY  P1.UPDATE_AT DESC,P1.SKILL_ID DESC) AS SKILL_DESCRIPTION
            FROM (
                SELECT Q1.*,
                    CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
                    CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
                    1 AS ALLOT,
                    CASE WHEN ISNULL(NSTAGE_ID, 0) <> 0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
                    CASE WHEN ISNULL(NLINE, '') <> '' THEN NLINE ELSE LINE END AS LINE1
                FROM (
                    SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
                        (SELECT TOP 1 P5.Edatetime
                         FROM Mx_ATDEventTrn AS P5
                         WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
                         ORDER BY P5.Edatetime) AS PUNCHDATE,

                        (SELECT TOP 1 P5.STAGE_ID
                         FROM Mx_Userswap AS P5
                         WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
                         ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,

                        (SELECT TOP 1 P5.LINE
                         FROM Mx_Userswap AS P5
                         WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
                         ORDER BY P5.SHIFT_DATE) AS NLINE
                    FROM Mx_UserShifts AS P1
                    LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
                    LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
                    LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.stage_id
                    LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
                    WHERE Shift_date_from = @date
                      AND SHIFT_ID = @shiftId
                ) AS Q1
            ) AS Q1
            LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.stage_id
            WHERE ISNULL(PUNCHDATE, '') <> '' 
AND USERID NOT IN
(SELECT Swap_userid from Mx_Userswap where Shift_date = @date) AND NOT (Q1.LINE1 = @Line AND P4.STAGE_NAME != @Stage_name)
            ORDER BY STAGE_NAME, SHIFT_ID, USERID;`;

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("date", sql.Date, date)
      .input("shiftId", sql.VarChar, shiftId)
      .input("Stage_name", sql.NVarChar, Stage_name)
      .input("Line", sql.VarChar, Line)
      .query(query);
    console.log("Employees Query Result:", result.recordset);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error fetching employees");
  }
});

app.post("/api/saveUserSwap", async (req, res) => {
  const swapRecords = req.body;
  console.log(req.body);

  try {
    const pool = await sql.connect(config);

    for (const swap of swapRecords) {
      const { shiftDate, Stage_name, shiftId, line, absentUserId, swapUserId } =
        swap;

      // Fetch Stage_id
      const result = await pool
        .request()
        .input("StageName", sql.NVarChar, Stage_name)
        .query(
          "SELECT Stage_id FROM Mx_StageMaster WHERE Stage_name = @StageName",
        );

      if (result.recordset.length === 0) {
        return res.status(400).send("Stage_name not found");
      }

      const stageId = result.recordset[0].Stage_id;

      // Insert swap details
      await pool
        .request()
        .input("ShiftDate", sql.DateTime, shiftDate)
        .input("StageId", sql.Int, stageId)
        .input("ShiftId", sql.Char(2), shiftId)
        .input("Line", sql.Char(2), line)
        .input("AbsentUserId", sql.NChar(15), absentUserId)
        .input("SwapUserId", sql.NChar(15), swapUserId)
        .query(
          "INSERT INTO Mx_Userswap (Shift_date, Stage_id, Shift_id, Line, Absent_userid, Swap_userid) VALUES (@ShiftDate, @StageId, @ShiftId, @Line, @AbsentUserId, @SwapUserId)",
        );
    }

    res.status(200).send("All swap details saved successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send(`Error saving swap details: ${err.message}`);
  }
});

app.get("/api/lines/master", async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Ensure the master table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mx_LinesMaster' AND xtype='U')
      CREATE TABLE Mx_LinesMaster (
        LineID INT IDENTITY(1,1) PRIMARY KEY,
        LineName NVARCHAR(50) NOT NULL UNIQUE,
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);

    const result = await pool
      .request()
      .query(
        "SELECT LineID, LineName, CreatedDate FROM Mx_LinesMaster ORDER BY LineName ASC",
      );

    console.log(result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching lines master:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/lines", async (req, res) => {
  const { lineName } = req.body;

  if (!lineName) {
    return res.status(400).send("Line name is required");
  }

  try {
    const pool = await sql.connect(config);

    // Check if line already exists in Mx_UserShifts
    const checkLineQuery =
      "SELECT TOP 1 LINE FROM Mx_UserShifts WHERE LINE = @lineName";
    const checkLineRequest = pool.request();
    checkLineRequest.input("lineName", sql.NVarChar, lineName);
    const existingLine = await checkLineRequest.query(checkLineQuery);

    if (existingLine.recordset.length > 0) {
      return res.status(409).send("Line already exists");
    }

    // For demonstration, we'll create a lines master table if it doesn't exist
    // First check if lines master table exists, if not create it
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mx_LinesMaster' AND xtype='U')
      CREATE TABLE Mx_LinesMaster (
        LineID INT IDENTITY(1,1) PRIMARY KEY,
        LineName NVARCHAR(50) NOT NULL UNIQUE,
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);

    // Insert new line
    const insertQuery = `
      INSERT INTO Mx_LinesMaster (LineName) 
      OUTPUT INSERTED.LineID, INSERTED.LineName 
      VALUES (@lineName);
    `;
    const request = pool.request();
    request.input("lineName", sql.NVarChar, lineName);
    const result = await request.query(insertQuery);

    res.status(201).json({
      LineID: result.recordset[0].LineID,
      LineName: result.recordset[0].LineName,
      message: "Line added successfully",
    });
  } catch (err) {
    console.error("Error adding line:", err);
    res.status(500).send("Error adding line");
  }
});

app.put("/api/lines/:id", async (req, res) => {
  const { id } = req.params;
  const { lineName } = req.body;

  if (!lineName) {
    return res.status(400).send("Line name is required");
  }

  try {
    const pool = await sql.connect(config);

    // Check if the line exists
    const checkLineQuery =
      "SELECT LineID FROM Mx_LinesMaster WHERE LineID = @LineID";
    const checkLineRequest = pool.request();
    checkLineRequest.input("LineID", sql.Int, id);
    const existingLine = await checkLineRequest.query(checkLineQuery);

    if (existingLine.recordset.length === 0) {
      return res.status(404).send("Line not found");
    }

    // Update the line
    const updateQuery = `
      UPDATE Mx_LinesMaster 
      SET LineName = @lineName 
      WHERE LineID = @LineID
    `;
    const request = pool.request();
    request.input("LineID", sql.Int, id);
    request.input("lineName", sql.NVarChar, lineName);

    await request.query(updateQuery);

    res.status(200).json({
      LineID: id,
      LineName: lineName,
      message: "Line updated successfully",
    });
  } catch (err) {
    console.error("Error updating line:", err);
    res.status(500).send("Error updating line");
  }
});

app.delete("/api/lines/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);

    // Check if the line exists before deleting
    const checkLineQuery =
      "SELECT TOP 1 LineID FROM Mx_LinesMaster WHERE LineID = @id";
    const checkLineRequest = pool.request();
    checkLineRequest.input("id", sql.Int, id);
    const existingLine = await checkLineRequest.query(checkLineQuery);

    if (existingLine.recordset.length === 0) {
      return res.status(404).send("Line not found");
    }

    // Check if line is being used in Mx_UserShifts
    const usageCheck = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        "SELECT TOP 1 * FROM Mx_UserShifts WHERE LINE = (SELECT LineName FROM Mx_LinesMaster WHERE LineID = @id)",
      );

    if (usageCheck.recordset.length > 0) {
      return res
        .status(400)
        .send("Cannot delete line as it is currently in use");
    }

    // Delete the line
    const deleteQuery = "DELETE FROM Mx_LinesMaster WHERE LineID = @id";
    await pool.request().input("id", sql.Int, id).query(deleteQuery);

    res.status(200).json({ message: "Line deleted successfully" });
  } catch (err) {
    console.error("Error deleting line:", err);
    res.status(500).send("Error deleting line");
  }
});

// API 1: Create carousel images table (run once)
app.post("/api/create-carousel-table", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CarouselImages' AND xtype='U')
      CREATE TABLE CarouselImages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        image_name VARCHAR(255) NOT NULL,
        description NVARCHAR(MAX), -- Added description column
        image_data TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        is_active BIT DEFAULT 1,
        display_order INT DEFAULT 0,
        created_date DATETIME DEFAULT GETDATE(),
        updated_date DATETIME DEFAULT GETDATE()
      )
    `;

    await pool.request().query(createTableQuery);

    // Schema Migration: Add description column if it doesn't exist
    const checkColumnQuery = `
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('CarouselImages') 
        AND name = 'description'
      )
      BEGIN
        ALTER TABLE CarouselImages ADD description NVARCHAR(MAX);
      END
    `;
    await pool.request().query(checkColumnQuery);
    res.json({
      success: true,
      message: "Carousel images table created successfully",
    });
  } catch (error) {
    console.error("Error creating table:", error);
    res
      .status(500)
      .json({ error: "Failed to create table", details: error.message });
  }
});

// API 2: Upload carousel image
// API 2: Upload carousel image (FIXED VERSION)
app.post(
  "/api/carousel-images/upload",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const { displayOrder = 0, description = "" } = req.body; // Extract description

      // Convert to base64
      const base64Data = `data:${mimetype};base64,${buffer.toString("base64")}`;

      const pool = await sql.connect(config);
      const request = pool.request();

      // FIXED: Add OUTPUT INSERTED.id to return the inserted ID
      const insertQuery = `
      INSERT INTO CarouselImages (image_name, description, image_data, mime_type, file_size, display_order)
      OUTPUT INSERTED.id
      VALUES (@imageName, @description, @imageData, @mimeType, @fileSize, @displayOrder)
    `;

      request.input("imageName", sql.VarChar, originalname);
      request.input("description", sql.NVarChar, description); // Input description
      request.input("imageData", sql.Text, base64Data);
      request.input("mimeType", sql.VarChar, mimetype);
      request.input("fileSize", sql.Int, size);
      request.input("displayOrder", sql.Int, parseInt(displayOrder));

      const result = await request.query(insertQuery);

      // FIXED: Check if result exists before accessing
      let insertedId = null;
      if (result.recordset && result.recordset.length > 0) {
        insertedId = result.recordset[0].id;
      }

      res.json({
        success: true,
        message: "Image uploaded successfully",
        imageData: {
          name: originalname,
          size: size,
          type: mimetype,
          id: insertedId,
        },
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res
        .status(500)
        .json({ error: "Failed to upload image", details: error.message });
    }
  },
);

// API 3: Get all carousel images
app.get("/api/carousel-images", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const query = `
      SELECT id, image_name, description, image_data, mime_type, file_size, display_order, created_date 
      FROM CarouselImages 
      WHERE is_active = 1 
      ORDER BY display_order ASC, created_date DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching carousel images:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch images", details: error.message });
  }
});

// API 4: Delete carousel image (soft delete)
app.delete("/api/carousel-images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(config);
    const request = pool.request();

    const deleteQuery = `
      UPDATE CarouselImages 
      SET is_active = 0, updated_date = GETDATE() 
      WHERE id = @id
    `;
    request.input("id", sql.Int, parseInt(id));

    await request.query(deleteQuery);
    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res
      .status(500)
      .json({ error: "Failed to delete image", details: error.message });
  }
});

// API 5: Update image display order
app.put("/api/carousel-images/:id/order", async (req, res) => {
  try {
    const { id } = req.params;
    const { displayOrder } = req.body;

    const pool = await sql.connect(config);
    const request = pool.request();

    const updateQuery = `
      UPDATE CarouselImages 
      SET display_order = @displayOrder, updated_date = GETDATE() 
      WHERE id = @id
    `;
    request.input("id", sql.Int, parseInt(id));
    request.input("displayOrder", sql.Int, parseInt(displayOrder));

    await request.query(updateQuery);
    res.json({ success: true, message: "Display order updated successfully" });
  } catch (error) {
    console.error("Error updating display order:", error);
    res.status(500).json({
      error: "Failed to update display order",
      details: error.message,
    });
  }
});

// API 6: Get single image by ID
app.get("/api/carousel-images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(config);
    const request = pool.request();

    const query = `
      SELECT id, image_name, image_data, mime_type, file_size, display_order, created_date
      FROM CarouselImages 
      WHERE id = @id AND is_active = 1
    `;
    request.input("id", sql.Int, parseInt(id));

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching image:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch image", details: error.message });
  }
});

// API 7: Bulk update display orders
app.put("/api/carousel-images/bulk-order", async (req, res) => {
  try {
    const { images } = req.body; // Array of {id, displayOrder}

    if (!Array.isArray(images)) {
      return res.status(400).json({ error: "Images array is required" });
    }

    const pool = await sql.connect(config);

    // Use transaction for bulk update
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const image of images) {
        const request = new sql.Request(transaction);
        await request
          .input("id", sql.Int, parseInt(image.id))
          .input("displayOrder", sql.Int, parseInt(image.displayOrder)).query(`
            UPDATE CarouselImages 
            SET display_order = @displayOrder, updated_date = GETDATE() 
            WHERE id = @id
          `);
      }

      await transaction.commit();
      res.json({
        success: true,
        message: "Display orders updated successfully",
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error updating bulk display orders:", error);
    res.status(500).json({
      error: "Failed to update display orders",
      details: error.message,
    });
  }
});

const employeeHistoryHandler = async (req, res) => {
  const { employeeId, fromDate, toDate } = req.body;
  console.log(req.body);

  if (!employeeId || !fromDate || !toDate) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    await sql.connect(config);
    const request = new sql.Request();

    request.input("employeeId", sql.NVarChar, employeeId);
    request.input("FromDate", sql.Date, fromDate);
    request.input("ToDate", sql.Date, toDate);

    const query = `
  WITH EmployeeHistory AS (
    -- Data from Mx_UserShifts
    SELECT DISTINCT
        P2.USERID,
        P2.NAME,
        P1.Shift_date_from AS [DATE],
        P1.SHIFT_ID AS SHIFT,
        P1.LINE,
        P4.stage_name AS STAGE,
        CASE WHEN P5.ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN P5.ActualPunch IS NULL THEN 'No Punch'
            WHEN P5.ActualPunch <= CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN P5.ActualPunch IS NOT NULL THEN 
                CASE 
                    WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                    ELSE
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                END
            ELSE 0
        END AS LateMinutes
    FROM Mx_UserShifts P1
    LEFT JOIN MX_USERMST P2 ON P1.USERID = P2.USERID
    LEFT JOIN Mx_ShiftMst P3 ON P1.SHIFT_ID = P3.SFTID
    LEFT JOIN Mx_STAGEMASTER P4 ON P1.stage_id = P4.stage_id
    LEFT JOIN (
        -- Find ActualPunch using 45 min tolerance
        SELECT SW.USERID, SW.Shift_date_from,
               CASE 
                   WHEN EXISTS (
                       SELECT 1
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW.USERID
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, SW.ShiftStart) AND SW.ShiftStart
                   )
                   THEN (
                       SELECT MAX(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW.USERID
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, SW.ShiftStart) AND SW.ShiftStart
                   )
                   ELSE (
                       SELECT MIN(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW.USERID
                         AND A.Edatetime >= SW.ShiftStart
                         AND A.Edatetime <= SW.ShiftEnd
                   )
               END AS ActualPunch
        FROM (
            SELECT P1.USERID, P1.Shift_date_from, P1.SHIFT_ID,
                   DATEADD(DAY, DATEDIFF(DAY, 0, P1.Shift_date_from), 0) + CAST(P3.SFTSTTime AS DATETIME) AS ShiftStart,
                   CASE WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                        DATEADD(DAY, DATEDIFF(DAY, 0, P1.Shift_date_from) + 1, 0) + CAST(P3.SFTEDTime AS DATETIME)
                        ELSE DATEADD(DAY, DATEDIFF(DAY, 0, P1.Shift_date_from), 0) + CAST(P3.SFTEDTime AS DATETIME)
                   END AS ShiftEnd
            FROM Mx_UserShifts P1
            LEFT JOIN Mx_ShiftMst P3 ON P1.SHIFT_ID = P3.SFTID
        ) SW
    ) P5 ON P1.USERID = P5.USERID AND P1.Shift_date_from = P5.Shift_date_from
    WHERE P1.USERID = @EmployeeId
      AND P1.Shift_date_from BETWEEN @FromDate AND @ToDate

    UNION ALL

    -- Data from Mx_Userswap
    SELECT DISTINCT
        P2.USERID,
        P2.NAME,
        SW.Shift_date AS [DATE],
        SW.Shift_id AS SHIFT,
        SW.LINE,
        P4.stage_name AS STAGE,
        CASE WHEN P5.ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN P5.ActualPunch IS NULL THEN 'No Punch'
            WHEN P5.ActualPunch <= CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN P5.ActualPunch IS NOT NULL THEN 
                CASE 
                    WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                    ELSE
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                END
            ELSE 0
        END AS LateMinutes
    FROM Mx_Userswap SW
    LEFT JOIN MX_USERMST P2 ON SW.Swap_userid = P2.USERID
    LEFT JOIN Mx_ShiftMst P3 ON SW.Shift_id = P3.SFTID
    LEFT JOIN Mx_STAGEMASTER P4 ON SW.stage_id = P4.stage_id
    LEFT JOIN (
        SELECT SW2.Swap_userid, SW2.Shift_date,
               CASE 
                   WHEN EXISTS (
                       SELECT 1
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW2.Swap_userid
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)) 
                                             AND DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)
                   )
                   THEN (
                       SELECT MAX(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW2.Swap_userid
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)) 
                                             AND DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)
                   )
                   ELSE (
                       SELECT MIN(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW2.Swap_userid
                         AND A.Edatetime >= DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)
                         AND A.Edatetime <= CASE WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                                                     DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date) + 1, 0) + CAST(P3.SFTEDTime AS DATETIME)
                                                 ELSE
                                                     DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTEDTime AS DATETIME)
                                            END
                   )
               END AS ActualPunch
        FROM Mx_Userswap SW2
        LEFT JOIN Mx_ShiftMst P3 ON SW2.Shift_id = P3.SFTID
    ) P5 ON SW.Swap_userid = P5.Swap_userid AND SW.Shift_date = P5.Shift_date
    WHERE SW.Swap_userid = @EmployeeId
      AND SW.Shift_date BETWEEN @FromDate AND @ToDate

          UNION ALL

    -- Users present in attendance but not in UserShifts or UserSwap
    SELECT DISTINCT
        U.USERID,
        U.NAME,
        CAST(A.Edatetime AS DATE) AS [DATE],
        NULL AS SHIFT,
        NULL AS LINE,
        NULL AS STAGE,
        'Present' AS ATTENDANCE,
        'No Shift Assigned' AS PUNCTUALITY,
        0 AS LateMinutes
    FROM Mx_ATDEventTrn A
    INNER JOIN MX_USERMST U ON A.USERID = U.USERID
    WHERE A.USERID = @EmployeeId
      AND CAST(A.Edatetime AS DATE) BETWEEN @FromDate AND @ToDate
      AND NOT EXISTS (
            SELECT 1 FROM Mx_UserShifts S
            WHERE S.USERID = A.USERID
              AND S.Shift_date_from = CAST(A.Edatetime AS DATE)
      )
      AND NOT EXISTS (
            SELECT 1 FROM Mx_Userswap SW
            WHERE SW.Swap_userid = A.USERID
              AND SW.Shift_date = CAST(A.Edatetime AS DATE)
      )
    GROUP BY U.USERID, U.NAME, CAST(A.Edatetime AS DATE)


)
SELECT 
    ROW_NUMBER() OVER (ORDER BY [DATE] asc) AS SL_NO,
    CONVERT(VARCHAR(10), [DATE], 103) AS [DATE],
    SHIFT, LINE, STAGE, ATTENDANCE,
    CASE WHEN LateMinutes > 0 THEN PUNCTUALITY + ' (' + CAST(LateMinutes AS VARCHAR) + ' min late)' ELSE PUNCTUALITY END AS PUNCTUALITY
FROM EmployeeHistory
ORDER BY SL_NO;

  
  `;

    const result = await request.query(query);

    res.json({
      employeeId,
      fromDate,
      toDate,
      records: result.recordset,
    });

    console.log(result.recordset);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).send("Error fetching attendance history");
  } finally {
    await sql.close();
  }
};
app.post("/api/employee-history", employeeHistoryHandler);
app.post("/api/employee-history-inactive", employeeHistoryHandler);

app.get("/api/employees", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT userid, name, UserIDEnbl
      FROM dbo.MX_USERMST
      where ISNULL(UserIDEnbl, 0) = 1
      ORDER BY userid
    `);
    console.log("Employees Query Result:", result.recordset);

    res.json(result.recordset); // [{ userid: 101, name: 'John' }, { userid: 102, name: 'Alice' }]
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

app.get("/api/employees-showall", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT distinct userid, name, UserIDEnbl
      FROM dbo.MX_USERMST
      ORDER BY userid
    `);
    console.log("Employees Query Result:", result.recordset);
    res.json(result.recordset); // [{ userid: 101, name: 'John' }, { userid: 102, name: 'Alice' }]
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

app.get("/api/employees-inactive", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT userid, name, UserIDEnbl
      FROM dbo.MX_USERMST
      where ISNULL(UserIDEnbl, 0) = 0
      ORDER BY userid
    `);
    console.log("Inactive Employees Query Result:", result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching inactive employees:", err);
    res.status(500).json({ error: "Failed to fetch inactive employees" });
  }
});

// Detailed inactive employees list with pagination, search and leave-date filter
// (for "Inactive List Download" page)
// Query params:
//   limit, offset       -> pagination (ignored when all=1)
//   all=1               -> return every matching row (for Excel export)
//   search              -> matches Employee ID (USERID) or User Name (NAME)
//   fromDate, toDate    -> filter on LeaveDT (YYYY-MM-DD), inclusive
// Returns { total, rows }
app.get("/api/inactive-employees-list", async (req, res) => {
  try {
    const all = req.query.all === "1" || req.query.all === "true";
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const search = (req.query.search || "").trim();
    const fromDate = (req.query.fromDate || "").trim();
    const toDate = (req.query.toDate || "").trim();
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;

    if (fromDate && !dateRe.test(fromDate))
      return res.status(400).json({ error: "Invalid fromDate format. Use YYYY-MM-DD" });
    if (toDate && !dateRe.test(toDate))
      return res.status(400).json({ error: "Invalid toDate format. Use YYYY-MM-DD" });

    const pool = await sql.connect(config);

    // Build the WHERE clause and register the matching parameters on a request.
    const conditions = ["ISNULL(u.UserIDEnbl, 0) = 0"];
    const bindParams = (request) => {
      if (search) request.input("search", sql.NVarChar, `%${search}%`);
      if (fromDate) request.input("fromDate", sql.Date, fromDate);
      if (toDate) request.input("toDate", sql.Date, toDate);
      return request;
    };
    if (search) conditions.push("(u.USERID LIKE @search OR u.NAME LIKE @search)");
    if (fromDate) conditions.push("CAST(u.LeaveDT AS DATE) >= @fromDate");
    if (toDate) conditions.push("CAST(u.LeaveDT AS DATE) <= @toDate");
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const baseSelect = `
      SELECT
        u.NAME          AS Username,
        u.USERID        AS EmployeeID,
        u.JoinDT        AS JoinDT,
        u.ConfirmDT     AS ConfirmDT,
        u.LeaveDT       AS LeaveDT,
        u.EnrollDT      AS EnrollDT,
        u.Qualification AS Education,
        des.Name        AS Designation
      FROM dbo.Mx_UserMst AS u
      LEFT JOIN dbo.Mx_DesignationMst AS des ON u.DSGID = des.DSGID
      ${whereClause}
      ORDER BY u.USERID`;

    const countResult = await bindParams(pool.request()).query(`
      SELECT COUNT(*) AS total
      FROM dbo.Mx_UserMst AS u
      ${whereClause}`);
    const total = countResult.recordset[0].total;

    let rows;
    if (all) {
      const result = await bindParams(pool.request()).query(baseSelect);
      rows = result.recordset;
    } else {
      const result = await bindParams(pool.request())
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit)
        .query(`${baseSelect} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
      rows = result.recordset;
    }

    res.json({ total, rows });
  } catch (err) {
    console.error("Error fetching inactive employees list:", err);
    res.status(500).json({ error: "Failed to fetch inactive employees list" });
  }
});

const punchReportHandler = async (req, res) => {
  try {
    console.log(req.query);
    // 1. Read & validate query-string parameters
    const userId = req.query.userid; // NVARCHAR(50)
    const { fromDate } = req.query; // YYYY-MM-DD
    const { toDate } = req.query; // YYYY-MM-DD

    if (!userId || !fromDate || !toDate)
      return res.status(400).json({
        error:
          "Missing required 'userid', 'fromDate' and 'toDate' (YYYY-MM-DD)",
      });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate))
      return res
        .status(400)
        .json({ error: "Invalid fromDate format. Use YYYY-MM-DD" });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate))
      return res
        .status(400)
        .json({ error: "Invalid toDate format. Use YYYY-MM-DD" });

    // Validate date range
    if (new Date(fromDate) > new Date(toDate))
      return res
        .status(400)
        .json({ error: "fromDate cannot be later than toDate" });

    const earlyGrace = Number.isFinite(+req.query.earlyGrace)
      ? +req.query.earlyGrace
      : 45;
    const lateGrace = Number.isFinite(+req.query.lateGrace)
      ? +req.query.lateGrace
      : 15;

    // 2. Get a pooled SQL connection (mssql)
    const pool = await sql.connect(config);

    // 3. The updated query to handle date ranges
    const query = `
DECLARE @UserId     NVARCHAR(50) = @UserIdParam;
DECLARE @FromDate   DATE         = @FromDateParam;
DECLARE @ToDate     DATE         = @ToDateParam;
DECLARE @EarlyGrace INT          = @EarlyGraceParam;
DECLARE @LateGrace  INT          = @LateGraceParam;

WITH DateRange AS (
    SELECT @FromDate AS WorkDate
    UNION ALL
    SELECT DATEADD(DAY,1,WorkDate)
    FROM   DateRange
    WHERE  WorkDate < @ToDate
),

RawPunches AS (
    SELECT DISTINCT UserId, Edatetime
    FROM dbo.Mx_ATDEventTrn
    WHERE UserId = @UserId
),
DistinctPunches AS (
    SELECT UserId, Edatetime
    FROM (
        SELECT UserId, Edatetime,
               LAG(Edatetime) OVER (PARTITION BY UserId ORDER BY Edatetime) AS PrevPunch
        FROM RawPunches
    ) T
    WHERE PrevPunch IS NULL
       OR DATEDIFF(SECOND, PrevPunch, Edatetime) > 60
),

ShiftInfoByDate AS (
    SELECT DR.WorkDate,
           -- Direct shift assignment
           (SELECT TOP 1 Shift_ID
            FROM  dbo.Mx_UserShifts
            WHERE UserId = @UserId
              AND Shift_date_from = DR.WorkDate) AS DirectShiftID,
           
           -- Swap shift assignment  
           (SELECT TOP 1 Shift_ID
            FROM  dbo.Mx_Userswap
            WHERE Swap_userid = @UserId
              AND Shift_date  = DR.WorkDate) AS SwapShiftID,
           
           -- IMPROVED: Automatic detection with better night shift handling
           (SELECT TOP 1 SM.SFTID
            FROM dbo.Mx_ShiftMst SM
            CROSS APPLY (
                 SELECT 
                 MIN(Edatetime) AS FirstPunch,
                 MAX(Edatetime) AS LastPunch
                 FROM DistinctPunches
                 WHERE Edatetime >= CAST(DR.WorkDate AS DATETIME2)
                 AND Edatetime < DATEADD(HOUR,42, CAST(DR.WorkDate AS DATETIME2))
            ) P
            WHERE P.FirstPunch IS NOT NULL 
              AND P.LastPunch IS NOT NULL
              AND (
                  -- Flexible first punch: from early grace before start to late grace after end
                  P.FirstPunch BETWEEN 
                      DATEADD(MINUTE, -@EarlyGrace, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTSTTime), CAST(DR.WorkDate AS DATETIME2)))
                      AND 
                      DATEADD(MINUTE, @LateGrace, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTEDTime), 
                          CASE WHEN SM.SFTEDTime <= SM.SFTSTTime 
                               THEN DATEADD(DAY,1, CAST(DR.WorkDate AS DATETIME2)) 
                               ELSE CAST(DR.WorkDate AS DATETIME2) END))
              )
              AND (
                  -- Flexible last punch: from shift start to late grace after end
                  P.LastPunch BETWEEN 
                      DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTSTTime), CAST(DR.WorkDate AS DATETIME2))
                      AND 
                      DATEADD(MINUTE, @LateGrace, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTEDTime), 
                          CASE WHEN SM.SFTEDTime <= SM.SFTSTTime 
                               THEN DATEADD(DAY,1, CAST(DR.WorkDate AS DATETIME2)) 
                               ELSE CAST(DR.WorkDate AS DATETIME2) END))
              )
              AND (
                  -- Duration validation: ensure reasonable shift duration (4-16 hours)
                  DATEDIFF(HOUR, P.FirstPunch, P.LastPunch) BETWEEN 4 AND 16
              )
            ORDER BY 
                -- Prioritize shifts where punches are closest to expected times
                ABS(DATEDIFF(MINUTE, P.FirstPunch, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTSTTime), CAST(DR.WorkDate AS DATETIME2)))) +
                ABS(DATEDIFF(MINUTE, P.LastPunch, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTEDTime), 
                    CASE WHEN SM.SFTEDTime <= SM.SFTSTTime 
                         THEN DATEADD(DAY,1, CAST(DR.WorkDate AS DATETIME2)) 
                         ELSE CAST(DR.WorkDate AS DATETIME2) END)))
           ) AS AutoDetectedShiftID
    FROM DateRange DR
),

ShiftAssignmentType AS (
    SELECT WorkDate,
           COALESCE(DirectShiftID, SwapShiftID, AutoDetectedShiftID) AS ShiftID,
           CASE 
               WHEN DirectShiftID IS NOT NULL THEN CAST(DirectShiftID AS NVARCHAR(50))
               WHEN SwapShiftID IS NOT NULL THEN CAST(SwapShiftID AS NVARCHAR(50))
               WHEN AutoDetectedShiftID IS NOT NULL THEN CAST(AutoDetectedShiftID AS NVARCHAR(50)) + ' (Automatically Identified)'
               ELSE 'Not Assigned'
           END AS DisplayShiftID
    FROM ShiftInfoByDate
),

ShiftTimesByDate AS (
    SELECT  SAT.WorkDate,
            SAT.ShiftID,
            SAT.DisplayShiftID,
            SM.SFTID,
            SM.SFTSTTime,
            SM.SFTEDTime,
            SM.BRKSTTime,                                                        -- Break start time
            SM.BRKEDTime,                                                        -- Break end time
            CASE WHEN SM.SFTEDTime <= SM.SFTSTTime THEN 1 ELSE 0 END          AS IsOvernight,
            DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.SFTSTTime), CAST(SAT.WorkDate AS DATETIME2))                   AS ShiftStart,
            DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.SFTEDTime),
                         CASE WHEN SM.SFTEDTime <= SM.SFTSTTime
                              THEN DATEADD(DAY,1,CAST(SAT.WorkDate AS DATETIME2))
                              ELSE CAST(SAT.WorkDate AS DATETIME2) END)                                               AS ShiftEnd,
            -- Calculate break start datetime
            CASE WHEN SM.BRKSTTime IS NOT NULL 
                 THEN DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.BRKSTTime), CAST(SAT.WorkDate AS DATETIME2))
                 ELSE NULL END                                                   AS BreakStart,
            -- Calculate break end datetime  
            CASE WHEN SM.BRKEDTime IS NOT NULL 
                 THEN DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.BRKEDTime),
                           CASE WHEN SM.BRKEDTime <= SM.BRKSTTime
                                THEN DATEADD(DAY,1,CAST(SAT.WorkDate AS DATETIME2))
                                ELSE CAST(SAT.WorkDate AS DATETIME2) END)
                 ELSE NULL END                                                   AS BreakEnd
    FROM   ShiftAssignmentType SAT
    LEFT   JOIN dbo.Mx_ShiftMst SM ON SM.SFTID = SAT.ShiftID
),

PunchStats AS (
    SELECT  ST.WorkDate,
            ST.SFTID,
            COUNT(P.Edatetime)                                                   AS TotalPunchesShift,
            STRING_AGG( FORMAT(P.Edatetime,'HH:mm:ss'), ', ' ) WITHIN GROUP
            (ORDER BY P.Edatetime)                                               AS PunchList
    FROM   ShiftTimesByDate ST
    LEFT   JOIN DistinctPunches P
           ON  P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                               AND     DATEADD(MINUTE, @LateGrace, ST.ShiftEnd)
    GROUP  BY ST.WorkDate, ST.SFTID
),

PunchDataByDate AS (
    SELECT  ST.WorkDate,
            ST.SFTID,
            ST.DisplayShiftID,
            ST.SFTSTTime,
            ST.SFTEDTime,
            ST.BRKSTTime,
            ST.BRKEDTime,
            ST.IsOvernight,
            ST.ShiftStart,
            ST.ShiftEnd,
            ST.BreakStart,
            ST.BreakEnd,
            MIN(CASE
                    WHEN ST.IsOvernight = 0
                         AND P.Edatetime >= CAST(ST.WorkDate AS DATETIME2)
                         AND P.Edatetime <  DATEADD(DAY,1,CAST(ST.WorkDate AS DATETIME2))
                    THEN P.Edatetime
                    WHEN ST.IsOvernight = 1
                         AND P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                                         AND     DATEADD(MINUTE, @LateGrace,  ST.ShiftEnd)
                    THEN P.Edatetime
                END)                                                             AS FirstPunchDay,
            MAX(CASE
                    WHEN ST.IsOvernight = 0
                         AND P.Edatetime >= CAST(ST.WorkDate AS DATETIME2)
                         AND P.Edatetime <  DATEADD(DAY,1,CAST(ST.WorkDate AS DATETIME2))
                    THEN P.Edatetime
                    WHEN ST.IsOvernight = 1
                         AND P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                                         AND     DATEADD(MINUTE, @LateGrace,  ST.ShiftEnd)
                    THEN P.Edatetime
                END)                                                             AS LastPunchDay,
            MIN(CASE WHEN P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                                     AND     DATEADD(MINUTE, @LateGrace,  ST.ShiftEnd)
                     THEN P.Edatetime END)                                       AS FirstPunchShift,
            MAX(CASE WHEN P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                                     AND     DATEADD(MINUTE, @LateGrace,  ST.ShiftEnd)
                     THEN P.Edatetime END)                                       AS LastPunchShift
    FROM   ShiftTimesByDate ST
    LEFT   JOIN DistinctPunches P
           ON  P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                               AND     DATEADD(MINUTE, @LateGrace, ST.ShiftEnd)
    GROUP  BY ST.WorkDate, ST.SFTID, ST.DisplayShiftID, ST.SFTSTTime, ST.SFTEDTime, ST.BRKSTTime, ST.BRKEDTime,
              ST.IsOvernight, ST.ShiftStart, ST.ShiftEnd, ST.BreakStart, ST.BreakEnd
),

PunchSequence AS (
    SELECT  
        ST.WorkDate,
        ST.SFTID,
        P.Edatetime,
        ROW_NUMBER() OVER (PARTITION BY ST.WorkDate, ST.SFTID ORDER BY P.Edatetime) AS PunchNumber,
        CASE WHEN ROW_NUMBER() OVER (PARTITION BY ST.WorkDate, ST.SFTID ORDER BY P.Edatetime) % 2 = 1 
             THEN 'IN' 
             ELSE 'OUT' 
        END AS PunchType
    FROM   ShiftTimesByDate ST
    INNER  JOIN DistinctPunches P
           ON  P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                               AND DATEADD(MINUTE, @LateGrace, ST.ShiftEnd)
    WHERE  ST.SFTID IS NOT NULL
),

WorkingPairs AS (
    SELECT  
        PS_IN.WorkDate,
        PS_IN.SFTID,
        PS_IN.Edatetime AS PunchIn,
        PS_OUT.Edatetime AS PunchOut,
        PS_IN.PunchNumber,
        DATEDIFF(SECOND, PS_IN.Edatetime, PS_OUT.Edatetime) AS WorkingSeconds
    FROM   PunchSequence PS_IN
    LEFT   JOIN PunchSequence PS_OUT 
           ON  PS_IN.WorkDate = PS_OUT.WorkDate
           AND PS_IN.SFTID = PS_OUT.SFTID
           AND PS_IN.PunchNumber = PS_OUT.PunchNumber - 1
           AND PS_IN.PunchType = 'IN'
           AND PS_OUT.PunchType = 'OUT'
    WHERE  PS_IN.PunchType = 'IN'
),

WorkingHoursCalculation AS (
    SELECT  
        WorkDate,
        SFTID,
        SUM(CASE WHEN WorkingSeconds > 0 THEN WorkingSeconds ELSE 0 END) AS TotalWorkingSeconds,CONCAT(
  CAST(SUM(CASE WHEN WorkingSeconds > 0 THEN WorkingSeconds ELSE 0 END) / 3600 AS varchar(10)), ':',
  RIGHT('00' + CAST((SUM(CASE WHEN WorkingSeconds > 0 THEN WorkingSeconds ELSE 0 END) / 60) % 60 AS varchar(2)), 2)
) AS ActualHoursWorked,

        COUNT(CASE WHEN PunchOut IS NOT NULL THEN 1 END) AS CompletedWorkSessions,
        COUNT(CASE WHEN PunchOut IS NULL THEN 1 END) AS IncompleteWorkSessions,
        STRING_AGG(
            CASE WHEN PunchOut IS NOT NULL 
                 THEN FORMAT(PunchIn,'HH:mm') + '-' + FORMAT(PunchOut,'HH:mm') + ' (' + 
                      CAST(CAST(WorkingSeconds/3600.0 AS DECIMAL(10,2)) AS NVARCHAR(10)) + 'h)'
                 ELSE FORMAT(PunchIn,'HH:mm') + '-??? (incomplete)'
            END, 
            ', '
        ) WITHIN GROUP (ORDER BY PunchNumber) AS WorkingSessions
    FROM   WorkingPairs
    GROUP  BY WorkDate, SFTID
)


SELECT
    @UserId                                   AS UserId,
    PD.WorkDate                               AS WorkDate,
    PD.WorkDate                               AS Date,
    PD.DisplayShiftID                         AS ShiftID,
    PD.SFTSTTime                              AS ShiftStartTime,
    PD.SFTEDTime                              AS ShiftEndTime,
    PD.BRKSTTime                              AS BreakStartTime,
    PD.BRKEDTime                              AS BreakEndTime,
    PD.IsOvernight                            AS IsNightShift,
    PD.ShiftStart                             AS ShiftStartDateTime,
    PD.ShiftEnd                               AS ShiftEndDateTime,
    PD.BreakStart                             AS BreakStartDateTime,
    PD.BreakEnd                               AS BreakEndDateTime,

    PD.FirstPunchDay                          AS FirstPunchInDay,
    PD.LastPunchDay                           AS LastPunchInDay,
    PD.FirstPunchShift                        AS FirstPunchInShift,
    PD.LastPunchShift                         AS LastPunchInShift,
    FORMAT(PD.FirstPunchShift,'HH:mm')        AS firstpunch,
    FORMAT(PD.LastPunchShift ,'HH:mm')        AS lastpunch,

    -- Original calculations (for comparison)
    CONVERT(char(5),
        DATEADD(SECOND, DATEDIFF(SECOND, PD.ShiftStart, PD.ShiftEnd), 0),
        108) AS HoursWorkedInclusive,
    
    -- NEW: Actual working hours calculation
    COALESCE(WHC.ActualHoursWorked, '00:00')        AS ActualHoursWorked,
    COALESCE(WHC.CompletedWorkSessions, 0)    AS CompletedWorkSessions,
    COALESCE(WHC.IncompleteWorkSessions, 0)   AS IncompleteWorkSessions,
    WHC.WorkingSessions                       AS WorkingSessionsDetail,

    CASE WHEN PD.FirstPunchShift < PD.ShiftStart THEN DATEDIFF(MINUTE, PD.FirstPunchShift, PD.ShiftStart) ELSE 0 END AS EarlyArrivedMinutes,
    CASE WHEN PD.LastPunchShift  > PD.ShiftEnd   THEN DATEDIFF(MINUTE, PD.ShiftEnd     , PD.LastPunchShift) ELSE 0 END AS LateStayMinutes,

    PD.BreakStart                             AS GivenBreakStart,
    PD.BreakEnd                               AS GivenBreakEnd,
    NULL                                      AS TakenBreakStart,
    NULL                                      AS TakenBreakEnd,

    PS.TotalPunchesShift                      AS TotalPunches,
    PS.PunchList                              AS PunchTimes
FROM   PunchDataByDate PD
LEFT   JOIN PunchStats  PS
       ON  PS.WorkDate = PD.WorkDate
      AND PS.SFTID     = PD.SFTID
LEFT   JOIN WorkingHoursCalculation WHC
       ON  WHC.WorkDate = PD.WorkDate
       AND WHC.SFTID = PD.SFTID
WHERE  PD.WorkDate IS NOT NULL
ORDER  BY PD.WorkDate
OPTION (MAXRECURSION 0);


`;

    // 4. Execute with parameter binding
    const rs = await pool
      .request()
      .input("UserIdParam", sql.NVarChar(50), userId)
      .input("FromDateParam", sql.Date, fromDate)
      .input("ToDateParam", sql.Date, toDate)
      .input("EarlyGraceParam", sql.Int, earlyGrace)
      .input("LateGraceParam", sql.Int, lateGrace)
      .query(query);

    // 5. Return array of results (one row per date in range)
    console.log("Punch Report Result:", rs.recordset);
    return res.json(rs.recordset);
  } catch (err) {
    console.error("Error in /api/punch_report:", err);
    return res
      .status(500)
      .json({ error: "Server Error", details: String(err) });
  }
};
app.get("/api/punch_report", punchReportHandler);
app.get("/api/punch_report_inactive", punchReportHandler);

const employeePunctualityHandler = async (req, res) => {
  const { employeeId, fromDate, toDate } = req.body;
  console.log(req.body);
  if (!employeeId) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    await sql.connect(config);

    const request = new sql.Request();

    request.input("EmployeeId", sql.NVarChar, employeeId); // ✅ match SQL variable name

    request.input("FromDate", sql.Date, fromDate);
    request.input("ToDate", sql.Date, toDate);

    const query = `
WITH EmployeePunctuality AS (
    -- From Mx_UserShifts
    SELECT 
        U.USERID,
        U.NAME,
        S.Shift_date_from AS [DATE],
        CONCAT(FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm'), '-', FORMAT(CAST(MS.SFTEDTime AS DATETIME), 'HH:mm')) AS SHIFT,
        FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm') AS ScheduledStart,
        S.SHIFT_ID AS SHIFTNAME,
        S.LINE,
        ST.stage_name AS STAGE,
        FORMAT(ActualPunch, 'HH:mm') AS ActualPunch,
        CASE WHEN ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN ActualPunch IS NULL THEN 'No Punch'
            WHEN ActualPunch <= DATEADD(MINUTE, 10, ShiftStart) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN ActualPunch IS NOT NULL 
                THEN CASE WHEN DATEDIFF(MINUTE, ShiftStart, ActualPunch) < 0 THEN 0 ELSE DATEDIFF(MINUTE, ShiftStart, ActualPunch) END
            ELSE 0
        END AS LateMinutes
    FROM Mx_UserShifts S
    INNER JOIN MX_USERMST U ON S.USERID = U.USERID
    INNER JOIN Mx_ShiftMst MS ON S.SHIFT_ID = MS.SFTID
    LEFT JOIN Mx_STAGEMASTER ST ON S.stage_id = ST.stage_id
    LEFT JOIN Mx_UserLeaveMaster LM ON S.USERID = LM.UserID AND S.Shift_date_from = LM.LeaveDate
    CROSS APPLY (
        SELECT 
            ShiftStart = CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME),
            ShiftEnd = CASE WHEN MS.SFTEDTime < MS.SFTSTTime
                            THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME))
                            ELSE CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME)
                       END
    ) AS Shifts
    OUTER APPLY (
        SELECT ActualPunch = 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = S.USERID
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                THEN (
                    SELECT MAX(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = S.USERID
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                ELSE (
                    SELECT MIN(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = S.USERID
                      AND A2.Edatetime >= Shifts.ShiftStart
                      AND A2.Edatetime <= Shifts.ShiftEnd
                )
            END
    ) AS PunchCalc
    WHERE S.USERID = @EmployeeId
      AND S.Shift_date_from BETWEEN @FromDate AND @ToDate

    UNION ALL

    -- From Mx_Userswap
    SELECT 
        U.USERID,
        U.NAME,
        SW.Shift_date AS [DATE],
        CONCAT(FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm'), '-', FORMAT(CAST(MS.SFTEDTime AS DATETIME), 'HH:mm')) AS SHIFT,
        FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm') AS ScheduledStart,
        SW.Shift_id AS SHIFTNAME,
        SW.LINE,
        ST.stage_name AS STAGE,
        FORMAT(ActualPunch, 'HH:mm') AS ActualPunch,
        CASE WHEN ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN ActualPunch IS NULL THEN 'No Punch'
            WHEN ActualPunch <= DATEADD(MINUTE, 10, ShiftStart) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN ActualPunch IS NOT NULL 
                THEN CASE WHEN DATEDIFF(MINUTE, ShiftStart, ActualPunch) < 0 THEN 0 ELSE DATEDIFF(MINUTE, ShiftStart, ActualPunch) END
            ELSE 0
        END AS LateMinutes
    FROM Mx_Userswap SW
    INNER JOIN MX_USERMST U ON SW.Swap_userid = U.USERID
    INNER JOIN Mx_ShiftMst MS ON SW.Shift_id = MS.SFTID
    LEFT JOIN Mx_STAGEMASTER ST ON SW.stage_id = ST.stage_id
    LEFT JOIN Mx_UserLeaveMaster LM ON SW.Swap_userid = LM.UserID AND SW.Shift_date = LM.LeaveDate
    CROSS APPLY (
        SELECT 
            ShiftStart = CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME),
            ShiftEnd = CASE WHEN MS.SFTEDTime < MS.SFTSTTime
                            THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME))
                            ELSE CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME)
                       END
    ) AS Shifts
    OUTER APPLY (
        SELECT ActualPunch = 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = SW.Swap_userid
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                THEN (
                    SELECT MAX(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = SW.Swap_userid
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                ELSE (
                    SELECT MIN(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = SW.Swap_userid
                      AND A2.Edatetime >= Shifts.ShiftStart
                      AND A2.Edatetime <= Shifts.ShiftEnd
                )
            END
    ) AS PunchCalc
    WHERE SW.Swap_userid = @EmployeeId
      AND SW.Shift_date BETWEEN @FromDate AND @ToDate

    UNION ALL

    -- Users present in attendance but not in UserShifts or UserSwap
    SELECT
        U.USERID,
        U.NAME,
        CAST(A.Edatetime AS DATE) AS [DATE],
        NULL AS SHIFT,
        NULL AS ScheduledStart,
        NULL AS SHIFTNAME,
        NULL AS LINE,
        NULL AS STAGE,
        FORMAT(MIN(A.Edatetime), 'HH:mm') AS ActualPunch,
        'Present (No Shift)' AS ATTENDANCE,
        'No Shift Assigned' AS PUNCTUALITY,
        0 AS LateMinutes
    FROM Mx_ATDEventTrn A
    INNER JOIN MX_USERMST U ON A.USERID = U.USERID
    WHERE A.USERID = @EmployeeId
      AND CAST(A.Edatetime AS DATE) BETWEEN @FromDate AND @ToDate
      AND NOT EXISTS (
            SELECT 1 FROM Mx_UserShifts S 
            WHERE S.USERID = A.USERID 
              AND S.Shift_date_from = CAST(A.Edatetime AS DATE)
        )
      AND NOT EXISTS (
            SELECT 1 FROM Mx_Userswap SW 
            WHERE SW.Swap_userid = A.USERID 
              AND SW.Shift_date = CAST(A.Edatetime AS DATE)
        )
    GROUP BY U.USERID, U.NAME, CAST(A.Edatetime AS DATE)
)
SELECT 
    USERID, 
    NAME, 
    CONVERT(VARCHAR(10), [DATE], 103) AS [DATE],    
    SHIFTNAME,
    SHIFT,
    LINE, 
    CASE 
        WHEN ScheduledStart IS NOT NULL 
        THEN FORMAT(DATEADD(MINUTE, -15, CAST(ScheduledStart AS DATETIME)), 'HH:mm')
        ELSE 'N/A'
    END AS ScheduledStart, 
    STAGE, 
    ATTENDANCE, 
    ActualPunch,
    CASE 
        WHEN ActualPunch IS NULL THEN 'No Punch'
        WHEN TRY_CAST(ActualPunch AS TIME) IS NULL THEN 'No Punch'
        WHEN ScheduledStart IS NOT NULL AND DATEDIFF(MINUTE, DATEADD(MINUTE, -15, CAST(ScheduledStart AS DATETIME)), TRY_CAST(ActualPunch AS TIME)) <= 0 
            THEN 'On Time'
        ELSE 'Late (' + CAST(DATEDIFF(MINUTE, DATEADD(MINUTE, -15, CAST(ScheduledStart AS DATETIME)), TRY_CAST(ActualPunch AS TIME)) AS VARCHAR) + ' mins late)'
    END AS PUNCTUALITY
FROM EmployeePunctuality
ORDER BY EmployeePunctuality.[DATE] ASC;


 `;

    const result = await request.query(query);
    console.log(result.recordset);
    res.json({
      employeeId,
      records: result.recordset,
    });
  } catch (err) {
    console.error("Error fetching punctuality:", err);
    res.status(500).send("Error fetching punctuality details");
  } finally {
    await sql.close();
  }
};
app.post("/api/employee-punctuality", employeePunctualityHandler);
app.post("/api/employee-punctuality-inactive", employeePunctualityHandler);

app.post("/api/jobcard-upload", async (req, res) => {
  const records = req.body; // Expecting an array like [{ Edatetime, UserID, Job_Target, ... }, ...]

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Records array is required" });
  }

  const batchSize = 50; // Process in batches
  let totalInserted = 0;
  let totalUpdated = 0;

  try {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    const request = new sql.Request(transaction);

    for (let i = 0; i < records.length; i += batchSize) {
      let QUERY1 = "";
      const batch = records.slice(i, i + batchSize);

      for (let rec of batch) {
        const {
          Edatetime,
          UserID,
          Job_Target,
          Job_Actual,
          Job_Rejns,
          job_5S,
          PPE,
          Job_Disclipline,
        } = rec;

        if (!Edatetime || !UserID) {
          return res.status(400).json({
            error: "Edatetime and UserID are required in each record",
          });
        }

        if (QUERY1.length > 0) {
          QUERY1 += " UNION ALL ";
        }

        QUERY1 += `
          SELECT 
            CAST('${Edatetime}' AS DATE) AS Edatetime,
            '${UserID}' AS UserID,
            ${Job_Target || 0} AS Job_Target,
            ${Job_Actual || 0} AS Job_Actual,
            ${Job_Rejns || 0} AS Job_Rejns,
            ${job_5S || 0} AS job_5S,
            ${PPE || 0} AS PPE,
            ${Job_Disclipline || 0} AS Job_Disclipline
        `;
      }

      const insertQuery = `
        MERGE Mx_UserJobCard AS target
        USING (${QUERY1}) AS source
        ON target.Edatetime = source.Edatetime AND target.UserID = source.UserID
        WHEN MATCHED THEN
          UPDATE SET 
            target.Job_Target = source.Job_Target,
            target.Job_Actual = source.Job_Actual,
            target.Job_Rejns = source.Job_Rejns,
            target.job_5S = source.job_5S,
            target.PPE = source.PPE,
           target.Job_Disclipline = source.Job_Disclipline
        WHEN NOT MATCHED THEN
          INSERT (Edatetime, UserID, Job_Target, Job_Actual, Job_Rejns,job_5S,PPE,Job_Disclipline)
          VALUES (source.Edatetime, source.UserID, source.Job_Target, source.Job_Actual, source.Job_Rejns,source.job_5S, source.PPE, source.Job_Disclipline)
        OUTPUT
          $action AS Action; -- Will return 'INSERT' or 'UPDATE' per row
      `;

      const result = await request.query(insertQuery);

      result.recordset.forEach((row) => {
        if (row.Action === "INSERT") totalInserted++;
        else if (row.Action === "UPDATE") totalUpdated++;
      });
    }

    await transaction.commit();
    await sql.close();

    res.json({
      success: true,
      message: "Job card data processed successfully.",
      inserted: totalInserted,
      updated: totalUpdated,
    });
  } catch (error) {
    console.error("Error processing job card:", error);
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    res.status(500).json({ error: "Error inserting/updating job card" });
  }
});

// --- Weightage Master APIs ---

app.get("/api/weightage", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT * FROM Mx_JobCardWeightage ORDER BY IsSystem DESC, CategoryName",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching weightages:", err);
    res.status(500).json({ error: "Failed to fetch weightages" });
  }
});

app.post("/api/weightage", async (req, res) => {
  const { categoryName, weightage, isSystem } = req.body;
  try {
    const pool = await sql.connect(config);
    await pool
      .request()
      .input("CategoryName", sql.NVarChar, categoryName)
      .input("Weightage", sql.Int, weightage)
      .input("IsSystem", sql.Bit, isSystem || 0)
      .query(
        "INSERT INTO Mx_JobCardWeightage (CategoryName, Weightage, IsSystem) VALUES (@CategoryName, @Weightage, @IsSystem)",
      );
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding weightage:", err);
    res.status(500).json({ error: "Failed to add weightage" });
  }
});

app.post("/api/weightage", async (req, res) => {
  const { categoryName, weightage } = req.body;
  try {
    const pool = await sql.connect(config);

    // Check if category already exists
    const check = await pool
      .request()
      .input("CategoryName", sql.NVarChar, categoryName)
      .query(
        "SELECT COUNT(*) as count FROM Mx_JobCardWeightage WHERE CategoryName = @CategoryName",
      );

    if (check.recordset[0].count > 0) {
      return res.status(400).json({ error: "Category already exists" });
    }

    await pool
      .request()
      .input("CategoryName", sql.NVarChar, categoryName)
      .input("Weightage", sql.Int, weightage)
      .input("IsSystem", sql.Bit, 0) // Default to non-system
      .query(
        "INSERT INTO Mx_JobCardWeightage (CategoryName, Weightage, IsSystem) VALUES (@CategoryName, @Weightage, @IsSystem)",
      );

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding weightage:", err);
    res.status(500).json({ error: "Failed to add weightage" });
  }
});

app.put("/api/weightage/:id", async (req, res) => {
  const { id } = req.params;
  const { weightage } = req.body; // Only allowing weightage update for simplicity first
  try {
    const pool = await sql.connect(config);
    await pool
      .request()
      .input("ID", sql.Int, id)
      .input("Weightage", sql.Int, weightage)
      .query(
        "UPDATE Mx_JobCardWeightage SET Weightage = @Weightage WHERE ID = @ID",
      );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating weightage:", err);
    res.status(500).json({ error: "Failed to update weightage" });
  }
});

app.delete("/api/weightage/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(config);

    // Optional: Check if system category before delete?
    // For now, allow delete, assuming frontend handles IsSystem check or user is admin.

    await pool
      .request()
      .input("ID", sql.Int, id)
      .query("DELETE FROM Mx_JobCardWeightage WHERE ID = @ID");

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting weightage:", err);
    res.status(500).json({ error: "Failed to delete weightage" });
  }
});

async function getEmployeeJobReport(pool, employeeId, fromDate, toDate, line) {
  const request = pool.request();
  request.input("FromDate", sql.Date, fromDate);
  request.input("ToDate", sql.Date, toDate);
  request.input("EmployeeId", sql.VarChar, employeeId || null);
  request.input("Line", sql.VarChar, line || null);

  /* 
     OPTIMIZED QUERY FOR MILLIONS OF RECORDS
     Key Optimizations:
     1. Temp tables with indexes for filtered data
     2. Pre-calculated shift windows
     3. Single-pass punch time lookup
     4. Eliminated redundant OUTER APPLY
     5. Early filtering on all tables
  */

  const query = `
    SET NOCOUNT ON;
    
    -- Fetch weightages once
    DECLARE @W_Performance DECIMAL(10,2), @W_Attendance DECIMAL(10,2), @W_Punctuality DECIMAL(10,2),
            @W_Rejections DECIMAL(10,2), @W_5S DECIMAL(10,2), @W_PPE DECIMAL(10,2), 
            @W_Safety DECIMAL(10,2), @W_Discipline DECIMAL(10,2);

    SELECT 
        @W_Performance = MAX(CASE WHEN CategoryName = 'Performance' THEN Weightage ELSE 0 END),
        @W_Attendance = MAX(CASE WHEN CategoryName = 'Attendance' THEN Weightage ELSE 0 END),
        @W_Punctuality = MAX(CASE WHEN CategoryName = 'Punctuality' THEN Weightage ELSE 0 END),
        @W_Rejections = MAX(CASE WHEN CategoryName = 'Rejections' THEN Weightage ELSE 0 END),
        @W_5S = MAX(CASE WHEN CategoryName = '5S' THEN Weightage ELSE 0 END),
        @W_PPE = MAX(CASE WHEN CategoryName = 'PPE' THEN Weightage ELSE 0 END),
        @W_Safety = MAX(CASE WHEN CategoryName = 'Safety' THEN Weightage ELSE 0 END),
        @W_Discipline = MAX(CASE WHEN CategoryName = 'Discipline' THEN Weightage ELSE 0 END)
    FROM Mx_JobCardWeightage WITH (NOLOCK);

    -- Create indexed temp table for filtered shifts (swaps + regular)
    CREATE TABLE #EffectiveShifts (
        USERID VARCHAR(50) NOT NULL,
        ShiftDate DATE NOT NULL,
        SHIFTNAME VARCHAR(50),
        stage_id INT,
        LINE VARCHAR(50),
        IsSwap BIT,
        INDEX IX_User_Date NONCLUSTERED (USERID, ShiftDate),
        INDEX IX_Date NONCLUSTERED (ShiftDate)
    );

    -- Insert swaps first (highest priority)
    INSERT INTO #EffectiveShifts (USERID, ShiftDate, SHIFTNAME, stage_id, LINE, IsSwap)
    SELECT 
        Swap_userid,
        Shift_date,
        Shift_id,
        stage_id,
        LINE,
        1
    FROM Mx_Userswap WITH (NOLOCK)
    WHERE Shift_date BETWEEN @FromDate AND @ToDate
      AND (@EmployeeId IS NULL OR Swap_userid = @EmployeeId)
      AND (@Line IS NULL OR LINE = @Line);

    -- Insert regular shifts (only if not swapped)
    INSERT INTO #EffectiveShifts (USERID, ShiftDate, SHIFTNAME, stage_id, LINE, IsSwap)
    SELECT 
        S.USERID,
        S.Shift_date_from,
        S.SHIFT_ID,
        S.stage_id,
        S.LINE,
        0
    FROM Mx_UserShifts S WITH (NOLOCK)
    WHERE S.Shift_date_from BETWEEN @FromDate AND @ToDate
      AND (@EmployeeId IS NULL OR S.USERID = @EmployeeId)
      AND (@Line IS NULL OR S.LINE = @Line)
      AND NOT EXISTS (
          SELECT 1 FROM #EffectiveShifts ES 
          WHERE ES.USERID = S.USERID AND ES.ShiftDate = S.Shift_date_from
      );

    -- Create temp table for shift windows (pre-calculated datetimes)
    CREATE TABLE #ShiftWindows (
        USERID VARCHAR(50) NOT NULL,
        ShiftDate DATE NOT NULL,
        SHIFTNAME VARCHAR(50),
        stage_id INT,
        LINE VARCHAR(50),
        ShiftDisplay VARCHAR(20),
        ScheduledStartTime VARCHAR(10),
        ShiftStartDateTime DATETIME,
        ShiftEndDateTime DATETIME,
        PunchWindowStart DATETIME,
        INDEX IX_User_Date NONCLUSTERED (USERID, ShiftDate)
    );

    -- Calculate shift windows once
    INSERT INTO #ShiftWindows
    SELECT 
        ES.USERID,
        ES.ShiftDate,
        ES.SHIFTNAME,
        ES.stage_id,
        ES.LINE,
        CONCAT(FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm'), '-', FORMAT(CAST(MS.SFTEDTime AS DATETIME), 'HH:mm')) AS ShiftDisplay,
        FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm') AS ScheduledStartTime,
        -- Shift start datetime
        CAST(CONVERT(VARCHAR(10), ES.ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME) AS ShiftStartDateTime,
        -- Shift end datetime (handle overnight shifts)
        CASE 
            WHEN MS.SFTEDTime < MS.SFTSTTime
            THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), ES.ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME))
            ELSE CAST(CONVERT(VARCHAR(10), ES.ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME)
        END AS ShiftEndDateTime,
        -- Punch window start (45 min before shift)
        DATEADD(MINUTE, -45, CAST(CONVERT(VARCHAR(10), ES.ShiftDate, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME)) AS PunchWindowStart
    FROM #EffectiveShifts ES
    LEFT JOIN Mx_ShiftMst MS WITH (NOLOCK) ON ES.SHIFTNAME = MS.SFTID;

    -- Create temp table for first punch times (indexed for fast lookup)
    CREATE TABLE #PunchTimes (
        USERID VARCHAR(50) NOT NULL,
        ShiftDate DATE NOT NULL,
        FirstPunchTime DATETIME,
        INDEX IX_User_Date NONCLUSTERED (USERID, ShiftDate)
    );

    -- Get first punch for each user/shift using indexed query
    INSERT INTO #PunchTimes
    SELECT 
        SW.USERID,
        SW.ShiftDate,
        MIN(A.Edatetime) AS FirstPunchTime
    FROM #ShiftWindows SW
    INNER JOIN Mx_ATDEventTrn A WITH (NOLOCK) 
        ON A.USERID = SW.USERID
        AND A.Edatetime >= SW.PunchWindowStart
        AND A.Edatetime <= SW.ShiftEndDateTime
    GROUP BY SW.USERID, SW.ShiftDate;

    -- Main query: Join all temp tables
    WITH EmployeeJobReport AS (
        SELECT 
            U.USERID,
            U.NAME,
            SW.ShiftDate AS [DATE],
            SW.ShiftDisplay AS SHIFT,
            SW.ScheduledStartTime AS ScheduledStart,
            SW.LINE,
            ST.stage_name AS STAGE,
            SW.SHIFTNAME,
            FORMAT(PT.FirstPunchTime, 'HH:mm') AS ActualPunch,
            
            -- Attendance status
            CASE 
                WHEN PT.FirstPunchTime IS NOT NULL THEN 'Present' 
                WHEN LM.LeaveType = 'Authorized' THEN 'Authorized Leave' 
                ELSE 'Absent' 
            END AS ATTENDANCE_Status,

            ISNULL(J.Job_Target, 0) AS Job_Target,
            ISNULL(J.Job_Actual, 0) AS Job_Actual,
            ISNULL(J.Job_Rejns, 0) AS Job_Rejns,
            ISNULL(J.job_5S, 0) AS Job_5S,
            ISNULL(J.PPE, 0) AS PPE,
            ISNULL(J.Job_Disclipline, 0) AS Job_Disclipline,
            
            -- Pre-calculated values for punctuality
            SW.ShiftStartDateTime,
            PT.FirstPunchTime
            
        FROM #ShiftWindows SW
        INNER JOIN MX_USERMST U WITH (NOLOCK) ON SW.USERID = U.USERID
        LEFT JOIN #PunchTimes PT ON SW.USERID = PT.USERID AND SW.ShiftDate = PT.ShiftDate
        LEFT JOIN Mx_UserJobCard J WITH (NOLOCK) ON SW.USERID = J.USERID AND J.Edatetime = SW.ShiftDate
        LEFT JOIN Mx_STAGEMASTER ST WITH (NOLOCK) ON SW.stage_id = ST.stage_id
        LEFT JOIN Mx_UserLeaveMaster LM WITH (NOLOCK) ON SW.USERID = LM.UserID AND SW.ShiftDate = LM.LeaveDate
    )
    SELECT 
        USERID, 
        NAME,
        CONVERT(VARCHAR(10), [DATE], 103) AS Date,
        [DATE] AS RawDate,
        SHIFTNAME, 
        STAGE, 
        LINE, 
        ActualPunch, 
        ScheduledStart,
        Job_Target AS Target,
        Job_Actual AS Actual,
        
        -- Performance calculation
        CAST(CASE 
            WHEN Job_Target > 0 
            THEN (CAST(Job_Actual AS FLOAT) / Job_Target) * @W_Performance 
            ELSE 0 
        END AS DECIMAL(10,2)) AS Performance,

        -- Attendance calculation
        CAST(CASE 
            WHEN ATTENDANCE_Status IN ('Present', 'Authorized Leave') 
            THEN @W_Attendance 
            ELSE 0 
        END AS DECIMAL(10,2)) AS Attendance,

        ATTENDANCE_Status,

        -- Punctuality (5 minutes before shift start)
        CAST(CASE 
            WHEN FirstPunchTime IS NOT NULL 
                 AND FirstPunchTime <= DATEADD(MINUTE, -5, ShiftStartDateTime)
            THEN @W_Punctuality
            ELSE 0 
        END AS DECIMAL(10,2)) AS Punctuality,

        Job_5S AS [5S],
        Job_Rejns AS Rejections,
        PPE AS Safety,
        Job_Disclipline AS Discipline,

        -- Total calculation
        CAST(
            (CASE WHEN Job_Target > 0 THEN (CAST(Job_Actual AS FLOAT) / Job_Target) * @W_Performance ELSE 0 END)
            + (CASE WHEN ATTENDANCE_Status IN ('Present', 'Authorized Leave') THEN @W_Attendance ELSE 0 END)
            + (CASE WHEN FirstPunchTime IS NOT NULL AND FirstPunchTime <= DATEADD(MINUTE, -5, ShiftStartDateTime)
                    THEN @W_Punctuality ELSE 0 END)
            + ISNULL(Job_Rejns, 0) 
            + ISNULL(Job_5S, 0) 
            + ISNULL(PPE, 0) 
            + ISNULL(Job_Disclipline, 0)
        AS DECIMAL(10,2)) AS Total
    FROM EmployeeJobReport
    ORDER BY RawDate ASC
    OPTION (MAXDOP 4);

    -- Cleanup temp tables
    DROP TABLE #EffectiveShifts;
    DROP TABLE #ShiftWindows;
    DROP TABLE #PunchTimes;
  `;

  return request.query(query);
}

const employeeJobReportHandler = async (req, res) => {
  const { employeeId, fromDate, toDate } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await getEmployeeJobReport(
      pool,
      employeeId,
      fromDate,
      toDate,
    );
    console.log("Jobreport Query Result:", result.recordset);
    res.json({
      employeeId,
      records: result.recordset,
    });
  } catch (err) {
    console.error("Error fetching Jobreport:", err);
    res.status(500).send("Error fetching Jobreport details");
  }
};
app.post("/api/employee-Jobreport", employeeJobReportHandler);
app.post("/api/employee-Jobreport-inactive", employeeJobReportHandler);

const monthlyJobCardReportHandler = async (req, res) => {
  console.log("Monthly Job Card Report Request:", req.body);
  const { fromMonth, toMonth, employeeId, line } = req.body;

  if (!fromMonth || !toMonth) {
    return res
      .status(400)
      .json({ error: "From Month and To Month are required" });
  }

  try {
    const pool = await sql.connect(config);

    // Calculate start and end dates
    const startDate = new Date(fromMonth + "-01");
    const endDate = new Date(toMonth + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const fromDateStr = startDate.toISOString().split("T")[0];
    const toDateStr = endDate.toISOString().split("T")[0];

    console.log(
      `Generating Monthly Report from ${fromDateStr} to ${toDateStr} for Emp: ${employeeId || "ALL"}, Line: ${line || "ALL"}`,
    );

    // Fetch report
    const result = await getEmployeeJobReport(
      pool,
      employeeId || null,
      fromDateStr,
      toDateStr,
      line || null,
    );
    console.log("Monthly Report Row Count:", result.recordset.length);

    // Aggregate data to avoid JSON stringify limit
    const records = result.recordset;
    const userMap = new Map();

    records.forEach((r) => {
      const uid = r.UserID || r.USERID;
      const uName = r.Name || r.NAME;
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          userId: uid,
          name: uName,
          monthlyScores: {},
        });
      }
      const user = userMap.get(uid);

      // Determine Month Key (YYYY-MM)
      let rDate = null;
      if (r.RawDate) rDate = new Date(r.RawDate);
      else if (r.Edatetime) rDate = new Date(r.Edatetime);

      if (rDate && !isNaN(rDate.getTime())) {
        const monthKey = rDate.toISOString().substring(0, 7); // "YYYY-MM"

        if (!user.monthlyScores[monthKey]) {
          user.monthlyScores[monthKey] = {
            count: 0,
            perf: 0,
            att: 0,
            punct: 0,
            rej: 0,
            s5: 0,
            safe: 0,
            disc: 0,
          };
        }

        const m = user.monthlyScores[monthKey];
        m.count++;
        m.perf += r.Performance || 0;

        // Attendance Logic match frontend
        // Server already returns calculated Attendance score in 'r.Attendance'
        m.att += r.Attendance || 0;

        m.punct += r.Punctuality || 0;
        m.rej += r.Rejections || 0;
        m.s5 += r["5S"] || 0;
        m.safe += r.Safety || 0;
        m.disc += r.Discipline || 0;
      }
    });

    // Finalize Averages
    const summary = Array.from(userMap.values()).map((u) => {
      const outcomes = {};
      Object.keys(u.monthlyScores).forEach((mKey) => {
        const data = u.monthlyScores[mKey];
        const count = data.count || 1;

        // Calculate Total Score for the month
        const avgPerf = data.perf / count;
        const avgAtt = data.att / count;
        const avgPunct = data.punct / count;
        const avgRej = data.rej / count;
        const avgS5 = data.s5 / count;
        const avgSafe = data.safe / count;
        const avgDisc = data.disc / count;

        const total =
          avgPerf + avgAtt + avgPunct + avgRej + avgS5 + avgSafe + avgDisc;
        outcomes[mKey] = total.toFixed(2);
      });
      return {
        id: u.userId,
        name: u.name,
        monthlyScores: outcomes,
      };
    });

    res.json({
      success: true,
      summary: summary, // Return summary instead of raw records
      fromDate: fromDateStr,
      toDate: toDateStr,
    });
  } catch (err) {
    console.error("Error generating monthly report:", err);
    res
      .status(500)
      .json({ error: "Error generating monthly report", details: err.message });
  }
};
app.post("/api/monthly-job-card-report", monthlyJobCardReportHandler);
app.post("/api/monthly-job-card-report-inactive", monthlyJobCardReportHandler);

const ExcelJS = require("exceljs");

// Helper for Weighted Score (Backend Implementation)
function calculateWeightedScoreBackend(userData) {
  const count = userData.length || 1;
  const avgPerformance =
    userData.reduce(
      (sum, item) => sum + (parseFloat(item.Performance) || 0),
      0,
    ) / count;

  // Attendance Special Logic: return 5 if Attendance is 5 AND Status is Authorized/Authorized Leave
  const avgAttendance =
    userData.reduce((sum, item) => {
      const val =
        item.Attendance === 5 &&
        (item.ATTENDANCE_Status === "Authorized Leave" ||
          item.ATTENDANCE_Status === "Authorized")
          ? 5
          : parseFloat(item.Attendance) || 0;
      return sum + val;
    }, 0) / count;

  const avgPunctuality =
    userData.reduce(
      (sum, item) => sum + (parseFloat(item.Punctuality) || 0),
      0,
    ) / count;
  const avgRejections =
    userData.reduce(
      (sum, item) => sum + (parseFloat(item.Rejections) || 0),
      0,
    ) / count;
  const avg5S =
    userData.reduce((sum, item) => sum + (parseFloat(item["5S"]) || 0), 0) /
    count;
  const avgSafe =
    userData.reduce((sum, item) => sum + (parseFloat(item.Safety) || 0), 0) /
    count; // Use Safety
  const avgDisc =
    userData.reduce(
      (sum, item) => sum + (parseFloat(item.Discipline) || 0),
      0,
    ) / count; // Use Discipline

  const totalScore =
    avgPerformance +
    avgAttendance +
    avgPunctuality +
    avgRejections +
    avg5S +
    avgSafe +
    avgDisc;

  return {
    count: count,
    avgPerformance: parseFloat(avgPerformance.toFixed(2)),
    avgAttendance: parseFloat(avgAttendance.toFixed(2)),
    avgPunctuality: parseFloat(avgPunctuality.toFixed(2)),
    avgRejections: parseFloat(avgRejections.toFixed(2)),
    avg5S: parseFloat(avg5S.toFixed(2)),
    avgPPE: parseFloat(avgSafe.toFixed(2)),
    avgDiscipline: parseFloat(avgDisc.toFixed(2)),
    totalScore: parseFloat(totalScore.toFixed(2)),
  };
}

const monthlyJobCardExcelHandler = async (req, res) => {
  const { fromMonth, toMonth, employeeId, line } = req.body;
  console.log("Monthly Job Card Excel Request:", req.body);

  if (!fromMonth || !toMonth) {
    return res
      .status(400)
      .json({ error: "From Month and To Month are required" });
  }

  try {
    const pool = await sql.connect(config);
    const startDate = new Date(fromMonth + "-01");
    const endDate = new Date(toMonth + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const fromDateStr = startDate.toISOString().split("T")[0];
    const toDateStr = endDate.toISOString().split("T")[0];

    console.log(
      `Generating Monthly Report from ${fromDateStr} to ${toDateStr} for Emp: ${employeeId || "ALL"}`,
    );

    const result = await getEmployeeJobReport(
      pool,
      employeeId || null,
      fromDateStr,
      toDateStr,
      line || null,
    );
    const records = result.recordset;

    if (!records || records.length === 0) {
      return res.status(404).json({ error: "No records found" });
    }

    // Set Headers for Streaming Download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Monthly_Report_${fromMonth}.xlsx`,
    );

    // Initialize Streaming Workbook
    const workbook = new excel.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    // Group Data
    const usersMap = new Map();
    records.forEach((r) => {
      const uid = r.UserID || r.USERID;
      const name = r.Name || r.NAME;

      if (!usersMap.has(uid)) {
        usersMap.set(uid, {
          id: uid,
          name: name,
          data: [],
          monthData: new Map(),
        });
      }

      const user = usersMap.get(uid);
      user.data.push(r);

      // Fix: Use RawDate (Date object) for reliable YYYY-MM extraction
      let rDateObj = null;
      if (r.RawDate) {
        rDateObj = new Date(r.RawDate);
      } else if (r.Edatetime) {
        rDateObj = new Date(r.Edatetime);
      } else if (r.Date) {
        // Fallback for string DD/MM/YYYY - tough, but let's try assuming standard ISO if fail
        // But SQL usually returns RawDate if requested.
        const parts = r.Date.split("/");
        if (parts.length === 3)
          rDateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }

      if (rDateObj && !isNaN(rDateObj.getTime())) {
        const mKey = rDateObj.toISOString().substring(0, 7); // YYYY-MM
        if (!user.monthData.has(mKey)) {
          user.monthData.set(mKey, []);
        }
        user.monthData.get(mKey).push(r);
      }
    });

    // ----------------------------------------------------
    // Utility for Headers
    // ----------------------------------------------------
    const generateMonthKeys = (startStr, endStr) => {
      let current = new Date(startStr + "-01");
      const end = new Date(endStr + "-01");
      const keys = [];
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        keys.push({
          key: `${y}-${m}`,
          label: current.toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
        });
        current.setMonth(current.getMonth() + 1);
      }
      return keys;
    };

    const monthList = generateMonthKeys(fromMonth, toMonth);

    // ----------------------------------------------------
    // SHEET 1: Monthly Summary
    // ----------------------------------------------------
    const wsSummary = workbook.addWorksheet("Monthly Summary");

    const summaryHeaders = [
      "Sl no",
      "ID No",
      "Name",
      ...monthList.map((m) => m.label), // Month Names
    ];

    // Titles
    const lastColIndex = summaryHeaders.length;

    // Note: User removed title cells in one edit but usually titles are good.
    // I will leave them minimal to avoid "Merged cells" issues if that was the user's concern,
    // but typically headers are requested. I'll stick to a standard table header.
    // If user deleted them, I should maybe respect that?
    // User deleted rows 0-11 in frontend array, but that was frontend code.
    // In backend generated Excel, let's keep it simple.

    wsSummary.getRow(1).values = summaryHeaders;
    wsSummary.getRow(1).font = { bold: true };
    wsSummary.getRow(1).commit();

    let index = 1;
    usersMap.forEach((user) => {
      const rowData = [index++, user.id, user.name ? user.name.trim() : ""];

      monthList.forEach((m) => {
        const monthRecords = user.monthData.get(m.key);
        if (monthRecords && monthRecords.length > 0) {
          const stats = calculateWeightedScoreBackend(monthRecords);
          rowData.push(stats.totalScore);
        } else {
          rowData.push(0);
        }
      });
      wsSummary.addRow(rowData).commit();
    });
    wsSummary.commit();

    // ----------------------------------------------------
    // INDIVIDUAL SHEETS (Grouped by Month)
    // ----------------------------------------------------
    usersMap.forEach((user) => {
      let sheetName = String(user.id)
        .replace(/[^a-zA-Z0-9_\-\s]/g, "_")
        .substring(0, 30);

      const wsUser = workbook.addWorksheet(sheetName);

      wsUser.getCell("A1").value =
        `Employee Daily Report: ${user.name} (${user.id})`;
      wsUser.getCell("A1").font = { bold: true, size: 12 };
      try {
        wsUser.mergeCells("A1:G1");
      } catch (e) {}
      wsUser.getRow(1).commit();

      const userHeaders = [
        "S.No",
        "Date",
        "Shift",
        "Stage",
        "Line",
        "Target",
        "Actual",
        "Performance",
        "Attendance",
        "Punctuality",
        "Rejections",
        "5S",
        "Safety",
        "Discipline",
        "Total",
      ];

      let serialNo = 1;
      let grandTotalTarget = 0;
      let grandTotalActual = 0;
      // Accumulators for weighted averages need careful handling across months
      // Actually, standard logic is avg of averages or weighted avg?
      // calculateWeightedScoreBackend takes all records. So we can just run it on all user.data for Grand Total.

      monthList.forEach((mObj) => {
        const mRecords = user.monthData.get(mObj.key);
        if (mRecords && mRecords.length > 0) {
          // Month Header
          wsUser.addRow([]); // Spacer
          const titleRow = wsUser.addRow([mObj.label]);
          titleRow.font = { bold: true, underline: true };
          titleRow.commit();

          // Column Headers
          const hRow = wsUser.addRow(userHeaders);
          hRow.font = { bold: true };
          hRow.commit();

          mRecords.forEach((item) => {
            wsUser
              .addRow([
                serialNo++,
                item.Date || item.Edatetime,
                item.SHIFTNAME,
                item.STAGE,
                item.LINE,
                parseFloat(item.Target) || 0,
                parseFloat(item.Actual) || 0,
                parseFloat(item.Performance) || 0,
                item.Attendance === 5 &&
                item.ATTENDANCE_Status?.includes("Auth")
                  ? "5 (Auth)"
                  : parseFloat(item.Attendance) || 0,
                parseFloat(item.Punctuality) || 0,
                parseFloat(item.Rejections) || 0,
                parseFloat(item["5S"]) || 0,
                parseFloat(item.Safety) || 0,
                parseFloat(item.Discipline) || 0,
                parseFloat(item.Total) || 0,
              ])
              .commit();
          });

          // Month Subtotal
          const mStats = calculateWeightedScoreBackend(mRecords);
          const mSumTarget = mRecords.reduce(
            (s, i) => s + (parseFloat(i.Target) || 0),
            0,
          );
          const mSumActual = mRecords.reduce(
            (s, i) => s + (parseFloat(i.Actual) || 0),
            0,
          );

          const subTotalRow = wsUser.addRow([
            "Month Total",
            "",
            "",
            "",
            "",
            mSumTarget,
            mSumActual,
            mStats.avgPerformance,
            mStats.avgAttendance,
            mStats.avgPunctuality,
            mStats.avgRejections,
            mStats.avg5S,
            mStats.avgPPE,
            mStats.avgDiscipline,
            mStats.totalScore,
          ]);
          subTotalRow.font = { bold: true, italic: true };
          subTotalRow.commit();
        }
      });

      // Grand Total
      wsUser.addRow([]).commit();
      const allStats = calculateWeightedScoreBackend(user.data);
      const allTarget = user.data.reduce(
        (s, i) => s + (parseFloat(i.Target) || 0),
        0,
      );
      const allActual = user.data.reduce(
        (s, i) => s + (parseFloat(i.Actual) || 0),
        0,
      );

      const grandTotalRow = wsUser.addRow([
        "GRAND TOTAL",
        "",
        "",
        "",
        "",
        allTarget,
        allActual,
        allStats.avgPerformance,
        allStats.avgAttendance,
        allStats.avgPunctuality,
        allStats.avgRejections,
        allStats.avg5S,
        allStats.avgPPE,
        allStats.avgDiscipline,
        allStats.totalScore,
      ]);
      grandTotalRow.font = {
        bold: true,
        size: 11,
        color: { argb: "FF0000FF" },
      }; // Blue color
      grandTotalRow.commit();

      wsUser.commit();
    });

    await workbook.commit();
  } catch (err) {
    console.error("Error generating monthly excel:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Error generating monthly report",
        details: err.message,
      });
    } else {
      res.end();
    }
  }
};
app.post("/api/monthly-job-card-excel", monthlyJobCardExcelHandler);
app.post("/api/monthly-job-card-excel-inactive", monthlyJobCardExcelHandler);

// New Endpoint for User Details (Skills Page Enhancement)


const unitWiseReportHandler = async (req, res) => {
  const { fromMonth, toMonth, shift, line } = req.body; // Added line

  if (!fromMonth || !toMonth) {
    return res
      .status(400)
      .json({ error: "From Month and To Month are required" });
  }

  try {
    const pool = await sql.connect(config);

    // Dates
    // Dates
    const startDate = new Date(fromMonth + "-01");
    const endDate = new Date(toMonth + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const fromDateStr = startDate.toISOString().split("T")[0];
    const toDateStr = endDate.toISOString().split("T")[0];

    console.log(`Unit Wise Report: Params`, { fromMonth, toMonth, shift });

    // 1. Fetch ALL data (Corrected to pass line)
    const result = await getEmployeeJobReport(
      pool,
      null,
      fromDateStr,
      toDateStr,
      line,
    );
    let records = result.recordset;
    console.log(`Unit Wise Report: DB returned ${records.length} records`);
    if (records.length > 0) {
      console.log("Unit Wise Sample Record:", records[0]); // Check structure
    }

    // 2. Filter by Shift (if provided)
    if (shift && shift !== "") {
      records = records.filter(
        (r) => r.SHIFTNAME === shift || r.SHIFT === shift,
      );
      console.log(
        `Unit Wise Report: After Shift Filter ${records.length} records`,
      );
    }

    // 3. Aggregate by User
    const userMap = new Map();

    records.forEach((r) => {
      const uid = r.USERID || r.UserID || r.userid;
      const name = r.NAME || r.Name || r.name;
      if (!uid) return; // Skip invalid

      // Filter: Only include days where a Job Card Target exists.
      if (!r.Target || r.Target <= 0) return;

      if (!userMap.has(uid)) {
        userMap.set(uid, {
          USERID: uid,
          NAME: name,
          totalDays: 0,
          totalPoints: 0,
          totalAttendance: 0,
          totalPunctuality: 0,
          totalRejections: 0,
          total5S: 0,
          totalPPE: 0, // Safety/PPE
          totalDiscipline: 0,
          monthly: {}, // Store monthly aggregates
        });
      }
      const u = userMap.get(uid);
      u.totalDays++;
      u.totalPoints += parseFloat(r.Performance) || 0;

      // Attendance Logic: 5 if Authorized/Authorized Leave, else usage
      let attVal = parseFloat(r.Attendance) || 0;
      if (
        r.Attendance === 5 &&
        (r.ATTENDANCE_Status === "Authorized Leave" ||
          r.ATTENDANCE_Status === "Authorized")
      ) {
        attVal = 5;
      }
      u.totalAttendance += attVal;

      u.totalPunctuality += parseFloat(r.Punctuality) || 0;
      u.totalRejections += parseFloat(r.Rejections) || 0;
      u.total5S += parseFloat(r["5S"]) || 0;
      u.totalPPE += parseFloat(r.Safety) || 0;
      u.totalDiscipline += parseFloat(r.Discipline) || 0;

      // [NEW] Monthly Aggregation
      const dateObj = new Date(r.RawDate || r.Date);
      if (!isNaN(dateObj)) {
        const monthKey = dateObj.toLocaleString("default", {
          month: "short",
          year: "2-digit",
        }); // e.g. "Jan 24"
        if (!u.monthly[monthKey]) {
          u.monthly[monthKey] = {
            count: 0,
            perf: 0,
            att: 0,
            punct: 0,
            rej: 0,
            s5: 0,
            safe: 0,
            disc: 0,
          };
        }
        const m = u.monthly[monthKey];
        m.count++;
        m.perf += parseFloat(r.Performance) || 0;
        m.att += attVal;
        m.punct += parseFloat(r.Punctuality) || 0;
        m.rej += parseFloat(r.Rejections) || 0;
        m.s5 += parseFloat(r["5S"]) || 0;
        m.safe += parseFloat(r.Safety) || 0;
        m.disc += parseFloat(r.Discipline) || 0;
      }
    });

    const aggregated = Array.from(userMap.values())
      .map((u) => {
        const count = u.totalDays > 0 ? u.totalDays : 1;
        const avgPerf = u.totalPoints / count;
        const avgAtt = u.totalAttendance / count;
        const avgPunct = u.totalPunctuality / count;
        const avgRej = u.totalRejections / count;
        const avg5S = u.total5S / count;
        const avgPPE = u.totalPPE / count;
        const avgDisc = u.totalDiscipline / count;

        const totalScore =
          avgPerf + avgAtt + avgPunct + avgRej + avg5S + avgPPE + avgDisc;

        // [NEW] Calculate Monthly Scores
        const monthlyScores = {};
        for (const [mKey, mVal] of Object.entries(u.monthly)) {
          const mCount = mVal.count > 0 ? mVal.count : 1;
          const mScore =
            mVal.perf / mCount +
            mVal.att / mCount +
            mVal.punct / mCount +
            mVal.rej / mCount +
            mVal.s5 / mCount +
            mVal.safe / mCount +
            mVal.disc / mCount;
          monthlyScores[mKey] = parseFloat(mScore.toFixed(2));
        }

        return {
          USERID: u.USERID,
          NAME: u.NAME,
          totalScore: totalScore.toFixed(2),
          avgPerformance: avgPerf.toFixed(2),
          avgAttendance: avgAtt.toFixed(2),
          avgRejections: avgRej.toFixed(2),
          monthlyScores: monthlyScores,
        };
      })
      .sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));

    res.json({
      success: true,
      records: aggregated,
      fromDate: fromDateStr,
      toDate: toDateStr,
    });
  } catch (err) {
    console.error("Error generating unit wise report:", err);
    res.status(500).json({
      error: "Error generating unit wise report",
      details: err.message,
    });
  }
};
app.post("/api/unit-wise-report", unitWiseReportHandler);
app.post("/api/unit-wise-report-inactive", unitWiseReportHandler);

app.get("/download-templatejob", (req, res) => {
  const filePath = path.join(
    __dirname,

    "../master/public",

    "EmployeeJobCardSampleData.xlsx",
  );

  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);

      res.status(500).send("Error downloading file");
    }
  });
});

// --- LEAVE MANAGEMENT APIS ---

async function ensureLeaveTableExists(pool) {
  const query = `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mx_UserLeaveMaster' AND xtype='U')
    BEGIN
      CREATE TABLE Mx_UserLeaveMaster (
          LeaveID INT IDENTITY(1,1) PRIMARY KEY,
          UserID NVARCHAR(50),
          LeaveDate DATE,
          LeaveType NVARCHAR(10),
          Remarks NVARCHAR(255),
          CreatedDate DATETIME DEFAULT GETDATE(),
          CreatedBy NVARCHAR(50),
          IsDeleted BIT DEFAULT 0,
          LeaveCategory NVARCHAR(20) -- Added LeaveCategory column
      )
    END
    
    -- Schema Migration: Add LeaveCategory column if it doesn't exist
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('Mx_UserLeaveMaster') 
      AND name = 'LeaveCategory'
    )
    BEGIN
      ALTER TABLE Mx_UserLeaveMaster ADD LeaveCategory NVARCHAR(20);
    END
  `;
  try {
    await pool.request().query(query);
  } catch (e) {
    console.error("Error checking/creating leave table", e);
  }
}

app.get("/api/leave/absent", async (req, res) => {
  const { fromDate, toDate, shift, line, userLine } = req.query;
  if (!fromDate || !toDate)
    return res.status(400).send("From Date and To Date are required");

  try {
    const pool = await sql.connect(config);
    await ensureLeaveTableExists(pool);

    // Build dynamic LINE filter
    let lineFilter = "";
    if (userLine) {
      // If userLine is provided (non-admin user), restrict to their LINE(s)
      const userLines = userLine.split(',').map(l => l.trim());
      const lineList = userLines.map(l => `'${l}'`).join(',');
      lineFilter = `AND ISNULL(S.LINE, A.Original_LINE) IN (${lineList})`;
    } else if (line && line !== "null" && line !== "undefined") {
      // If specific line filter is selected
      lineFilter = `AND ISNULL(S.LINE, A.Original_LINE) = @Line`;
    }

    const query = `
      WITH Assignments AS (
        SELECT
            US.USERID,
            US.stage_id AS Original_Stage_ID,
            US.LINE AS Original_LINE,
            US.SHIFT_ID,
            US.Shift_date_from,
            SM.SFTName AS ShiftName,
            SM.SFTSTTime AS StartTime,
            SM.SFTEDTime AS EndTime,
            CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME) AS ShiftStartDateTime,
            CASE WHEN SM.SFTEDTime < SM.SFTSTTime
                 THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME))
                 ELSE CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME)
            END AS ShiftEndDateTime
        FROM dbo.Mx_UserShifts US
        LEFT JOIN dbo.Mx_ShiftMst SM ON US.SHIFT_ID = SM.SFTID
        LEFT JOIN dbo.MX_USERMST U ON US.USERID = U.USERID
        WHERE US.Shift_date_from BETWEEN @FromDate AND @ToDate
          AND ISNULL(U.UserIDEnbl, 0) = 1
      ),
      Swaps AS (
        SELECT
            SW.SWAP_USERID,
            SW.STAGE_ID,
            SW.LINE,
            SW.SHIFT_DATE
        FROM dbo.Mx_Userswap SW
        WHERE SW.SHIFT_DATE BETWEEN @FromDate AND @ToDate
      ),
      SmartPunches AS (
        SELECT 
            A.USERID,
            A.SHIFT_ID,
            A.ShiftStartDateTime,
            A.ShiftEndDateTime,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM Mx_ATDEventTrn E2
                    WHERE E2.USERID = A.USERID
                      AND E2.EDateTime BETWEEN DATEADD(MINUTE, -45, A.ShiftStartDateTime) AND A.ShiftStartDateTime
                )
                THEN (
                    SELECT MAX(E2.EDateTime)
                    FROM Mx_ATDEventTrn E2
                    WHERE E2.USERID = A.USERID
                      AND E2.EDateTime BETWEEN DATEADD(MINUTE, -45, A.ShiftStartDateTime) AND A.ShiftStartDateTime
                )
                ELSE (
                    SELECT MIN(E2.EDateTime)
                    FROM Mx_ATDEventTrn E2
                    WHERE E2.USERID = A.USERID
                      AND E2.EDateTime >= A.ShiftStartDateTime
                      AND E2.EDateTime <= A.ShiftEndDateTime
                )
            END AS PUNCHIN
        FROM Assignments A
      )

      SELECT DISTINCT
        COALESCE(SP.USERID, A.USERID, S.SWAP_USERID) AS USERID,
        COALESCE(AU.NAME, SU.NAME) AS NAME,
        A.SHIFT_ID,
        ISNULL(S.LINE, A.Original_LINE) AS LINE,
        CONVERT(VARCHAR(10), A.Shift_date_from, 120) AS ShiftDate,
        L.LeaveID, 
        L.LeaveType, 
        L.Remarks,
        L.LeaveCategory 
      FROM SmartPunches SP
      INNER JOIN Assignments A ON SP.USERID = A.USERID
      LEFT JOIN Swaps S ON A.USERID = S.SWAP_USERID
          AND A.Original_Stage_ID = S.STAGE_ID
          AND A.Original_LINE = S.LINE
          AND S.SHIFT_DATE = A.Shift_date_from
      LEFT JOIN dbo.MX_USERMST AU ON A.USERID = AU.USERID
      LEFT JOIN dbo.MX_USERMST SU ON S.SWAP_USERID = SU.USERID
      LEFT JOIN Mx_UserLeaveMaster L ON L.UserID = SP.USERID AND L.LeaveDate = A.Shift_date_from
      WHERE SP.PUNCHIN IS NULL
        AND (@Shift IS NULL OR A.SHIFT_ID = @Shift)
        ${lineFilter}
      ORDER BY ShiftDate, NAME
    `;

    const request = pool.request();
    request.input("FromDate", sql.Date, fromDate);
    request.input("ToDate", sql.Date, toDate);
    request.input(
      "Shift",
      sql.VarChar,
      shift && shift !== "null" && shift !== "undefined" ? shift : null,
    );
    
    // Only add @Line parameter if not using userLine-based filtering
    if (!userLine) {
      request.input(
        "Line",
        sql.VarChar,
        line && line !== "null" && line !== "undefined" ? line : null,
      );
    }

    console.log("Executing Absent Query with Range:", {
      fromDate,
      toDate,
      shift: shift && shift !== "null" && shift !== "undefined" ? shift : null,
      line: line && line !== "null" && line !== "undefined" ? line : null,
      userLine: userLine || "N/A (Admin)",
    });

    const result = await request.query(query);
    console.log("Absent Query Row Count:", result.recordset.length);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching absent employees:", err);
    res.status(500).send({ error: "Server Error", details: err.message });
  }
});

app.post("/api/leave", async (req, res) => {
  const { userId, date, leaveType, remarks, createdBy, leaveCategory } =
    req.body;

  try {
    const pool = await sql.connect(config);
    await ensureLeaveTableExists(pool);

    // Check if exists
    const checkQuery =
      "SELECT LeaveID FROM Mx_UserLeaveMaster WHERE UserID = @UserID AND LeaveDate = @LeaveDate";
    const request = pool.request();
    request.input("UserID", sql.NVarChar, userId);
    request.input("LeaveDate", sql.Date, date);
    const check = await request.query(checkQuery);

    if (check.recordset.length > 0) {
      // Update
      const updateQuery = `
            UPDATE Mx_UserLeaveMaster 
            SET LeaveType = @LeaveType, Remarks = @Remarks, CreatedBy = @CreatedBy, LeaveCategory = @LeaveCategory, CreatedDate = GETDATE()
            WHERE LeaveID = @LeaveID
        `;
      request.input("LeaveID", sql.Int, check.recordset[0].LeaveID);
      request.input("LeaveType", sql.NVarChar, leaveType);
      request.input("Remarks", sql.NVarChar, remarks);
      request.input("LeaveCategory", sql.NVarChar, leaveCategory || null);
      request.input("CreatedBy", sql.NVarChar, createdBy || "System");
      await request.query(updateQuery);
    } else {
      // Insert
      const insertQuery = `
            INSERT INTO Mx_UserLeaveMaster (UserID, LeaveDate, LeaveType, Remarks, CreatedBy, LeaveCategory)
            VALUES (@UserID, @LeaveDate, @LeaveType, @Remarks, @CreatedBy, @LeaveCategory)
        `;
      request.input("LeaveType", sql.NVarChar, leaveType);
      request.input("Remarks", sql.NVarChar, remarks);
      request.input("LeaveCategory", sql.NVarChar, leaveCategory || null);
      request.input("CreatedBy", sql.NVarChar, createdBy || "System");
      await request.query(insertQuery);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving leave:", err);
    res.status(500).send({ error: "Server Error", details: err.message });
  }
});

sql
  .connect(config)
  .then((pool) => {
    console.log("✅ Connected to database");
    // Start server only if DB connected
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });
