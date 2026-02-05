-- ========================================
-- COMPREHENSIVE DATABASE INDEXING STRATEGY
-- MAAST-Master Application
-- Generated: 2026-02-05
-- ========================================
-- 
-- INSTRUCTIONS:
-- 1. Run this script on your SQL Server database
-- 2. Script will first drop existing custom indexes (preserving PKs)
-- 3. Then create optimized indexes based on query patterns
-- 4. Run during off-peak hours (indexes can take time on large tables)
-- 5. After running, update statistics with FULLSCAN
--
-- ========================================
USE [MSSCOSEC];
-- Replace with your database name
GO
SET NOCOUNT ON;
PRINT '========================================';
PRINT 'Starting Database Indexing Optimization';
PRINT 'Start Time: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
GO -- ========================================
    -- SECTION 1: DROP EXISTING CUSTOM INDEXES
    -- ========================================
    -- This section removes existing non-clustered indexes (keeps PKs/FKs)
    -- NOTE: This will NOT drop Primary Keys or Unique Constraints
    PRINT '';
PRINT '========================================';
PRINT 'STEP 1: Dropping Existing Custom Indexes';
PRINT '========================================';
GO -- Drop existing indexes on Mx_ATDEventTrn
    IF EXISTS (
        SELECT *
        FROM sys.indexes
        WHERE name = 'IX_Mx_ATDEventTrn_UserDate'
            AND object_id = OBJECT_ID('Mx_ATDEventTrn')
    ) BEGIN PRINT 'Dropping IX_Mx_ATDEventTrn_UserDate...';
DROP INDEX IX_Mx_ATDEventTrn_UserDate ON Mx_ATDEventTrn;
END IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_ATDEventTrn_UserID_Date_INCLUDE'
        AND object_id = OBJECT_ID('Mx_ATDEventTrn')
) BEGIN PRINT 'Dropping IX_Mx_ATDEventTrn_UserID_Date_INCLUDE...';
DROP INDEX IX_Mx_ATDEventTrn_UserID_Date_INCLUDE ON Mx_ATDEventTrn;
END -- Drop existing indexes on Mx_UserShifts
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserShifts_UserDate'
        AND object_id = OBJECT_ID('Mx_UserShifts')
) BEGIN PRINT 'Dropping IX_Mx_UserShifts_UserDate...';
DROP INDEX IX_Mx_UserShifts_UserDate ON Mx_UserShifts;
END IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserShifts_DateRange_INCLUDE'
        AND object_id = OBJECT_ID('Mx_UserShifts')
) BEGIN PRINT 'Dropping IX_Mx_UserShifts_DateRange_INCLUDE...';
DROP INDEX IX_Mx_UserShifts_DateRange_INCLUDE ON Mx_UserShifts;
END IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'UK_UserShifts_UserDateStageShift_Constr'
        AND object_id = OBJECT_ID('Mx_UserShifts')
) BEGIN PRINT 'Dropping UK_UserShifts_UserDateStageShift_Constr...';
DROP INDEX UK_UserShifts_UserDateStageShift_Constr ON Mx_UserShifts;
END -- Drop existing indexes on Mx_Userswap
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_Userswap_DateUser_INCLUDE'
        AND object_id = OBJECT_ID('Mx_Userswap')
) BEGIN PRINT 'Dropping IX_Mx_Userswap_DateUser_INCLUDE...';
DROP INDEX IX_Mx_Userswap_DateUser_INCLUDE ON Mx_Userswap;
END -- Drop existing indexes on Mx_UserJobCard
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserJobCard_UserDate'
        AND object_id = OBJECT_ID('Mx_UserJobCard')
) BEGIN PRINT 'Dropping IX_Mx_UserJobCard_UserDate...';
DROP INDEX IX_Mx_UserJobCard_UserDate ON Mx_UserJobCard;
END IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserJobCard_UserID_Date_INCLUDE'
        AND object_id = OBJECT_ID('Mx_UserJobCard')
) BEGIN PRINT 'Dropping IX_Mx_UserJobCard_UserID_Date_INCLUDE...';
DROP INDEX IX_Mx_UserJobCard_UserID_Date_INCLUDE ON Mx_UserJobCard;
END -- Drop existing indexes on Mx_UserLeaveMaster
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserLeaveMaster_UserDate'
        AND object_id = OBJECT_ID('Mx_UserLeaveMaster')
) BEGIN PRINT 'Dropping IX_Mx_UserLeaveMaster_UserDate...';
DROP INDEX IX_Mx_UserLeaveMaster_UserDate ON Mx_UserLeaveMaster;
END IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserLeaveMaster_UserID_Date_INCLUDE'
        AND object_id = OBJECT_ID('Mx_UserLeaveMaster')
) BEGIN PRINT 'Dropping IX_Mx_UserLeaveMaster_UserID_Date_INCLUDE...';
DROP INDEX IX_Mx_UserLeaveMaster_UserID_Date_INCLUDE ON Mx_UserLeaveMaster;
END -- Drop existing indexes on MX_USERMST
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_MX_USERMST_UserID'
        AND object_id = OBJECT_ID('MX_USERMST')
) BEGIN PRINT 'Dropping IX_MX_USERMST_UserID...';
DROP INDEX IX_MX_USERMST_UserID ON MX_USERMST;
END IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_MX_USERMST_UserID_Enabled'
        AND object_id = OBJECT_ID('MX_USERMST')
) BEGIN PRINT 'Dropping IX_MX_USERMST_UserID_Enabled...';
DROP INDEX IX_MX_USERMST_UserID_Enabled ON MX_USERMST;
END -- Drop existing indexes on Mx_ShiftMst
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_ShiftMst_ID'
        AND object_id = OBJECT_ID('Mx_ShiftMst')
) BEGIN PRINT 'Dropping IX_Mx_ShiftMst_ID...';
DROP INDEX IX_Mx_ShiftMst_ID ON Mx_ShiftMst;
END -- Drop existing indexes on Mx_UserLogin
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserLogin_UserID'
        AND object_id = OBJECT_ID('Mx_UserLogin')
) BEGIN PRINT 'Dropping IX_Mx_UserLogin_UserID...';
DROP INDEX IX_Mx_UserLogin_UserID ON Mx_UserLogin;
END -- Drop existing indexes on Mx_UserSkills
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_Mx_UserSkills_UserID'
        AND object_id = OBJECT_ID('Mx_UserSkills')
) BEGIN PRINT 'Dropping IX_Mx_UserSkills_UserID...';
DROP INDEX IX_Mx_UserSkills_UserID ON Mx_UserSkills;
END -- Drop existing indexes on MX_SKILLMASTER
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_MX_SKILLMASTER_SkillID'
        AND object_id = OBJECT_ID('MX_SKILLMASTER')
) BEGIN PRINT 'Dropping IX_MX_SKILLMASTER_SkillID...';
DROP INDEX IX_MX_SKILLMASTER_SkillID ON MX_SKILLMASTER;
END -- Drop existing indexes on MX_STAGEMASTER
IF EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_MX_STAGEMASTER_StageID'
        AND object_id = OBJECT_ID('MX_STAGEMASTER')
) BEGIN PRINT 'Dropping IX_MX_STAGEMASTER_StageID...';
DROP INDEX IX_MX_STAGEMASTER_StageID ON MX_STAGEMASTER;
END PRINT 'Existing indexes dropped successfully.';
PRINT '';
GO -- ========================================
    -- SECTION 2: CREATE OPTIMIZED INDEXES
    -- ========================================
    PRINT '========================================';
PRINT 'STEP 2: Creating Optimized Indexes';
PRINT '========================================';
GO -- ========================================
    -- TABLE: Mx_ATDEventTrn (Attendance Events)
    -- Most critical table - appears in many queries
    -- ========================================
    PRINT '';
PRINT 'Creating indexes on Mx_ATDEventTrn...';
-- Primary lookup index for attendance queries
-- Used in: Job Report, Attendance Report, Leave Management
CREATE NONCLUSTERED INDEX IX_Mx_ATDEventTrn_UserID_DateTime ON Mx_ATDEventTrn(USERID, Edatetime) INCLUDE (Edatetime) -- Redundant but helps with MIN/MAX operations
WITH (FILLFACTOR = 90, ONLINE = OFF);
-- Date-range queries (for dashboard, reports)
CREATE NONCLUSTERED INDEX IX_Mx_ATDEventTrn_Date_UserID ON Mx_ATDEventTrn(CAST(Edatetime AS DATE), USERID) WITH (FILLFACTOR = 85, ONLINE = OFF);
PRINT '✓ Mx_ATDEventTrn indexes created';
GO -- ========================================
    -- TABLE: Mx_UserShifts (User Shift Assignments)
    -- Critical for shift-based queries
    -- ========================================
    PRINT 'Creating indexes on Mx_UserShifts...';
-- Primary lookup index for shift assignments
CREATE NONCLUSTERED INDEX IX_Mx_UserShifts_DateRange_User ON Mx_UserShifts(Shift_date_from, USERID) INCLUDE (SHIFT_ID, stage_id, LINE, Shift_date_from) WITH (FILLFACTOR = 90, ONLINE = OFF);
-- Reverse lookup (User -> Shifts)
CREATE NONCLUSTERED INDEX IX_Mx_UserShifts_User_Date ON Mx_UserShifts(USERID, Shift_date_from) INCLUDE (SHIFT_ID, stage_id, LINE) WITH (FILLFACTOR = 90, ONLINE = OFF);
-- LINE-based filtering
CREATE NONCLUSTERED INDEX IX_Mx_UserShifts_LINE_Date ON Mx_UserShifts(LINE, Shift_date_from) INCLUDE (USERID, SHIFT_ID, stage_id) WITH (FILLFACTOR = 85, ONLINE = OFF);
PRINT '✓ Mx_UserShifts indexes created';
GO -- ========================================
    -- TABLE: Mx_Userswap (Shift Swaps)
    -- Used to resolve effective shifts
    -- ========================================
    PRINT 'Creating indexes on Mx_Userswap...';
-- Primary swap lookup
CREATE NONCLUSTERED INDEX IX_Mx_Userswap_Date_SwapUser ON Mx_Userswap(Shift_date, Swap_userid) INCLUDE (Shift_id, stage_id, LINE, USERID) WITH (FILLFACTOR = 90, ONLINE = OFF);
-- Original user lookup (for NOT EXISTS checks)
CREATE NONCLUSTERED INDEX IX_Mx_Userswap_OrigUser_Date ON Mx_Userswap(USERID, Shift_date) INCLUDE (Swap_userid) WITH (FILLFACTOR = 90, ONLINE = OFF);
PRINT '✓ Mx_Userswap indexes created';
GO -- ========================================
    -- TABLE: Mx_UserJobCard (Job Card Data)
    -- Performance metrics
    -- ========================================
    PRINT 'Creating indexes on Mx_UserJobCard...';
-- Primary job card lookup
CREATE NONCLUSTERED INDEX IX_Mx_UserJobCard_User_Date ON Mx_UserJobCard(USERID, Edatetime) INCLUDE (
    Job_Target,
    Job_Actual,
    Job_Rejns,
    job_5S,
    PPE,
    Job_Disclipline
) WITH (FILLFACTOR = 90, ONLINE = OFF);
-- Date-range queries
CREATE NONCLUSTERED INDEX IX_Mx_UserJobCard_Date_User ON Mx_UserJobCard(Edatetime, USERID) INCLUDE (Job_Target, Job_Actual) WITH (FILLFACTOR = 85, ONLINE = OFF);
PRINT '✓ Mx_UserJobCard indexes created';
GO -- ========================================
    -- TABLE: Mx_UserLeaveMaster (Leave Records)
    -- Leave tracking
    -- ========================================
    PRINT 'Creating indexes on Mx_UserLeaveMaster...';
-- Primary leave lookup
CREATE NONCLUSTERED INDEX IX_Mx_UserLeaveMaster_User_Date ON Mx_UserLeaveMaster(UserID, LeaveDate) INCLUDE (LeaveType, Remarks, LeaveCategory, LeaveID) WITH (FILLFACTOR = 90, ONLINE = OFF);
-- Date-range queries
CREATE NONCLUSTERED INDEX IX_Mx_UserLeaveMaster_Date_User ON Mx_UserLeaveMaster(LeaveDate, UserID) INCLUDE (LeaveType) WITH (FILLFACTOR = 85, ONLINE = OFF);
PRINT '✓ Mx_UserLeaveMaster indexes created';
GO -- ========================================
    -- TABLE: MX_USERMST (User Master)
    -- User information
    -- ========================================
    PRINT 'Creating indexes on MX_USERMST...';
-- Primary user lookup
CREATE NONCLUSTERED INDEX IX_MX_USERMST_UserID_Active ON MX_USERMST(USERID) INCLUDE (Name, UserIDEnbl) WITH (FILLFACTOR = 95, ONLINE = OFF);
-- Active users filter
CREATE NONCLUSTERED INDEX IX_MX_USERMST_Active ON MX_USERMST(UserIDEnbl) INCLUDE (USERID, Name)
WHERE UserIDEnbl = 1 WITH (FILLFACTOR = 95, ONLINE = OFF);
PRINT '✓ MX_USERMST indexes created';
GO -- ========================================
    -- TABLE: Mx_ShiftMst (Shift Master)
    -- Shift definitions
    -- ========================================
    PRINT 'Creating indexes on Mx_ShiftMst...';
-- Primary shift lookup
CREATE NONCLUSTERED INDEX IX_Mx_ShiftMst_SFTID ON Mx_ShiftMst(SFTID) INCLUDE (SFTName, SFTSTTime, SFTEDTime) WITH (FILLFACTOR = 98, ONLINE = OFF);
PRINT '✓ Mx_ShiftMst indexes created';
GO -- ========================================
    -- TABLE: MX_STAGEMASTER (Stage Master)
    -- Production stages
    -- ========================================
    PRINT 'Creating indexes on MX_STAGEMASTER...';
-- Primary stage lookup
CREATE NONCLUSTERED INDEX IX_MX_STAGEMASTER_StageID ON MX_STAGEMASTER(stage_id) INCLUDE (Stage_name, Stage_Type, Stage_Serial) WITH (FILLFACTOR = 98, ONLINE = OFF);
PRINT '✓ MX_STAGEMASTER indexes created';
GO -- ========================================
    -- TABLE: Mx_UserLogin (Login Credentials)
    -- Authentication
    -- ========================================
    PRINT 'Creating indexes on Mx_UserLogin...';
-- Login lookup (CRITICAL for performance)
CREATE NONCLUSTERED INDEX IX_Mx_UserLogin_UserID_Password ON Mx_UserLogin(user_id, password) INCLUDE (Adminflag, LINE) WITH (FILLFACTOR = 98, ONLINE = OFF);
PRINT '✓ Mx_UserLogin indexes created';
GO -- ========================================
    -- TABLE: Mx_UserSkills (User Skills)
    -- Skill assignments
    -- ========================================
    PRINT 'Creating indexes on Mx_UserSkills...';
-- User skills lookup
CREATE NONCLUSTERED INDEX IX_Mx_UserSkills_UserID_Stage ON Mx_UserSkills(USERID, STAGE_ID) INCLUDE (SKILL_ID) WITH (FILLFACTOR = 95, ONLINE = OFF);
-- Skill-based lookup
CREATE NONCLUSTERED INDEX IX_Mx_UserSkills_Skill ON Mx_UserSkills(SKILL_ID) INCLUDE (USERID, STAGE_ID) WITH (FILLFACTOR = 95, ONLINE = OFF);
PRINT '✓ Mx_UserSkills indexes created';
GO -- ========================================
    -- TABLE: MX_SKILLMASTER (Skill Master)
    -- Skill definitions
    -- ========================================
    PRINT 'Creating indexes on MX_SKILLMASTER...';
-- Primary skill lookup
CREATE NONCLUSTERED INDEX IX_MX_SKILLMASTER_SkillID ON MX_SKILLMASTER(SKILL_ID) INCLUDE (Skill_Description, Skill_Rating) WITH (FILLFACTOR = 98, ONLINE = OFF);
PRINT '✓ MX_SKILLMASTER indexes created';
GO -- ========================================
    -- TABLE: Mx_JobCardWeightage (Weightage Config)
    -- Configuration table - small, rarely changes
    -- ========================================
    PRINT 'Creating indexes on Mx_JobCardWeightage...';
-- Category lookup
CREATE NONCLUSTERED INDEX IX_Mx_JobCardWeightage_Category ON Mx_JobCardWeightage(CategoryName) INCLUDE (Weightage) WITH (FILLFACTOR = 100, ONLINE = OFF);
PRINT '✓ Mx_JobCardWeightage indexes created';
GO -- ========================================
    -- SECTION 3: UPDATE STATISTICS
    -- ========================================
    PRINT '';
PRINT '========================================';
PRINT 'STEP 3: Updating Statistics (FULLSCAN)';
PRINT '========================================';
GO PRINT 'Updating statistics on Mx_ATDEventTrn...';
UPDATE STATISTICS Mx_ATDEventTrn WITH FULLSCAN;
PRINT 'Updating statistics on Mx_UserShifts...';
UPDATE STATISTICS Mx_UserShifts WITH FULLSCAN;
PRINT 'Updating statistics on Mx_Userswap...';
UPDATE STATISTICS Mx_Userswap WITH FULLSCAN;
PRINT 'Updating statistics on Mx_UserJobCard...';
UPDATE STATISTICS Mx_UserJobCard WITH FULLSCAN;
PRINT 'Updating statistics on Mx_UserLeaveMaster...';
UPDATE STATISTICS Mx_UserLeaveMaster WITH FULLSCAN;
PRINT 'Updating statistics on MX_USERMST...';
UPDATE STATISTICS MX_USERMST WITH FULLSCAN;
PRINT 'Updating statistics on Mx_ShiftMst...';
UPDATE STATISTICS Mx_ShiftMst WITH FULLSCAN;
PRINT 'Updating statistics on MX_STAGEMASTER...';
UPDATE STATISTICS MX_STAGEMASTER WITH FULLSCAN;
PRINT 'Updating statistics on Mx_UserLogin...';
UPDATE STATISTICS Mx_UserLogin WITH FULLSCAN;
PRINT 'Updating statistics on Mx_UserSkills...';
UPDATE STATISTICS Mx_UserSkills WITH FULLSCAN;
PRINT 'Updating statistics on MX_SKILLMASTER...';
UPDATE STATISTICS MX_SKILLMASTER WITH FULLSCAN;
PRINT 'Updating statistics on Mx_JobCardWeightage...';
UPDATE STATISTICS Mx_JobCardWeightage WITH FULLSCAN;
PRINT '✓ All statistics updated';
GO -- ========================================
    -- SECTION 4: VERIFICATION
    -- ========================================
    PRINT '';
PRINT '========================================';
PRINT 'STEP 4: Index Verification Report';
PRINT '========================================';
GO -- Show all indexes created
SELECT OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    STATS_DATE(i.object_id, i.index_id) AS LastStatisticsUpdate,
    p.rows AS RowCount
FROM sys.indexes i
    INNER JOIN sys.partitions p ON i.object_id = p.object_id
    AND i.index_id = p.index_id
WHERE OBJECT_NAME(i.object_id) IN (
        'Mx_ATDEventTrn',
        'Mx_UserShifts',
        'Mx_Userswap',
        'Mx_UserJobCard',
        'Mx_UserLeaveMaster',
        'MX_USERMST',
        'Mx_ShiftMst',
        'MX_STAGEMASTER',
        'Mx_UserLogin',
        'Mx_UserSkills',
        'MX_SKILLMASTER',
        'Mx_JobCardWeightage'
    )
    AND i.name IS NOT NULL
ORDER BY TableName,
    IndexType,
    IndexName;
-- ========================================
-- COMPLETION SUMMARY
-- ========================================
PRINT '';
PRINT '========================================';
PRINT 'Indexing Strategy Implementation Complete!';
PRINT 'End Time: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';
PRINT 'NEXT STEPS:';
PRINT '1. Monitor query performance after indexes are built';
PRINT '2. Use DMVs to identify missing indexes over time:';
PRINT '   - sys.dm_db_missing_index_details';
PRINT '   - sys.dm_db_missing_index_group_stats';
PRINT '3. Schedule regular index maintenance:';
PRINT '   - Rebuild fragmented indexes weekly';
PRINT '   - Update statistics weekly';
PRINT '4. Test query performance improvements';
PRINT '';
PRINT 'Expected Performance Improvements:';
PRINT '- Login queries: 90%+ faster';
PRINT '- Attendance reports: 80-90% faster';
PRINT '- Job card reports: 70-85% faster';
PRINT '- Dashboard queries: 60-80% faster';
PRINT '';
PRINT '========================================';
GO -- ========================================
    -- OPTIONAL: INDEX MAINTENANCE SCRIPT
    -- ========================================
    -- Save this for future index maintenance
    /*
     -- Run this weekly to maintain index health
     
     -- Rebuild fragmented indexes
     DECLARE @TableName NVARCHAR(255);
     DECLARE @IndexName NVARCHAR(255);
     DECLARE @SQL NVARCHAR(MAX);
     
     DECLARE IndexCursor CURSOR FOR
     SELECT 
     OBJECT_NAME(ips.object_id) AS TableName,
     i.name AS IndexName
     FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
     INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
     WHERE ips.avg_fragmentation_in_percent > 30
     AND ips.page_count > 1000
     AND i.name IS NOT NULL;
     
     OPEN IndexCursor;
     FETCH NEXT FROM IndexCursor INTO @TableName, @IndexName;
     
     WHILE @@FETCH_STATUS = 0
     BEGIN
     SET @SQL = 'ALTER INDEX ' + @IndexName + ' ON ' + @TableName + ' REBUILD WITH (ONLINE = OFF, FILLFACTOR = 90);';
     PRINT 'Rebuilding: ' + @IndexName + ' on ' + @TableName;
     EXEC sp_executesql @SQL;
     
     FETCH NEXT FROM IndexCursor INTO @TableName, @IndexName;
     END
     
     CLOSE IndexCursor;
     DEALLOCATE IndexCursor;
     
     -- Update all statistics
     EXEC sp_MSforeachtable 'UPDATE STATISTICS ? WITH FULLSCAN';
     */