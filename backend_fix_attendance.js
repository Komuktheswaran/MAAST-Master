// FIXED /api/attendance endpoint
// This now uses the same shift time window logic as /api/attendance/showAll

app.get("/api/attendance", async (req, res) => {
  const { date, shifts, lines } = req.query;
  console.log(req.query);
  let pool = await sql.connect(config);

  try {
    const shiftList = shifts.split(",").map((s) => s.trim());
    const lineList = lines.split(",").map((l) => l.trim());

    const result = await pool.request().input("Date", sql.Date, new Date(date))
      .query(`
        WITH Assignments AS (
    SELECT
        US.USERID,
        US.stage_id,
        US.LINE,
        US.SHIFT_ID,
        US.Shift_date_from,
        SM.SFTName AS ShiftName,
        SM.SFTSTTime AS StartTime,
        SM.SFTEDTime AS EndTime,
        -- Smart shift calculation (handles night shifts)
        CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTSTTime, 108) AS DATETIME) AS ShiftStartDateTime,
        CASE WHEN SM.SFTEDTime < SM.SFTSTTime
             THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME))
             ELSE CAST(CONVERT(VARCHAR(10), US.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), SM.SFTEDTime, 108) AS DATETIME)
        END AS ShiftEndDateTime
    FROM dbo.Mx_UserShifts US
    LEFT JOIN dbo.Mx_ShiftMst SM ON US.SHIFT_ID = SM.SFTID
    LEFT JOIN dbo.MX_USERMST U ON US.USERID = U.USERID
    WHERE US.Shift_date_from = @Date
      AND ISNULL(U.UserIDEnbl, 0) = 1
      AND US.SHIFT_ID IN (${shiftList.map((_, i) => `'${shiftList[i]}'`).join(",")})
      AND US.LINE IN (${lineList.map((_, i) => `'${lineList[i]}'`).join(",")})
),
SmartPunches AS (
    SELECT 
        A.USERID,
        A.SHIFT_ID,
        A.stage_id,
        A.LINE,
        A.ShiftStartDateTime,
        A.ShiftEndDateTime,
        -- Smart punch IN logic (same as showAll endpoint)
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

SELECT 
    ST.Stage_name,
    SP.LINE,
    SP.SHIFT_ID,
    SM.SFTSTTime,
    COUNT(*) AS ALLOT,
    SUM(CASE WHEN SP.PUNCHIN IS NOT NULL THEN 1 ELSE 0 END) AS PRESENT,
    SUM(CASE WHEN SP.PUNCHIN IS NULL THEN 1 ELSE 0 END) AS ABSENT,
    -- Add first punch time for debugging
    MIN(SP.PUNCHIN) AS FirstPunchIn,
    -- Add punctuality status
    SUM(CASE 
        WHEN SP.PUNCHIN IS NULL THEN 0
        WHEN SP.PUNCHIN <= DATEADD(MINUTE, -10, SP.ShiftStartDateTime) THEN 1
        ELSE 0
    END) AS OnTime,
    SUM(CASE 
        WHEN SP.PUNCHIN IS NOT NULL 
        AND SP.PUNCHIN > DATEADD(MINUTE, -10, SP.ShiftStartDateTime) THEN 1
        ELSE 0
    END) AS Late
FROM SmartPunches SP
LEFT JOIN dbo.Mx_STAGEMASTER ST ON SP.stage_id = ST.Stage_Serial
LEFT JOIN dbo.Mx_ShiftMst SM ON SP.SHIFT_ID = SM.SFTID
GROUP BY ST.Stage_name, SP.LINE, SP.SHIFT_ID, SM.SFTSTTime
ORDER BY ALLOT DESC;
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
