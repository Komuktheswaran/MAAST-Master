# MAAST — Resume Section

> This section is written for use in a personal resume, portfolio, or LinkedIn profile. Copy and edit as needed.

---

## D. One-Liner (Under Project Name on Resume)

**Full-stack manpower tracking system managing shift allocation, biometric attendance, and skill ratings for 500+ factory workers across multiple production lines.**

---

## A. Project Summary

I built MAAST to solve a real problem — our plant was running entirely on spreadsheets and daily headcounts that someone had to manually cross-check against biometric punch data. There was no easy way to know, at 6:05 AM when Shift 2 starts, which stations were undermanned or which employees hadn't shown up. 

MAAST replaced that whole workflow. It pulls punch data from the biometric system, cross-references it with the pre-uploaded shift schedule, and gives supervisors a real-time dashboard showing exactly who's present, who's absent, and who might be covering for someone else. Beyond just attendance, it also tracks skill ratings per production stage — so you can see that 3 of the 4 people assigned to the welding station are rated "A" today, while the assembly line has two rookies.

The system handles 500+ employee records, multiple shifts (including night shifts that cross midnight), leave, job card data, and a swap/cover system for last-minute absences.

---

## B. Key Contributions

- **Designed the entire database schema from scratch** — 15 tables covering shift allocation, skill tracking, swap management, attendance events, leave, job cards, and image storage. The tricky part was keeping the biometric ERP tables (read-only) separate from the app tables I control, so nothing breaks if the ERP schema changes.

- **Built the attendance detection engine** — This was the hardest part. Biometric punches come in raw with no context. I had to write SQL CTEs that calculate whether a punch belongs to Shift 1, Shift 2, or a night shift that ends at 2 AM, with a 45-minute early grace window and 30-minute late grace window. It also handles mid-shift swaps and flags employees punching in for the wrong shift entirely.

- **Implemented the shift upload pipeline** — Admins upload an Excel file where columns are dates and rows are employees. The parser validates stage names against the master, checks if employees are active, detects duplicate rows, and upserts records in batches of 50 to avoid SQL timeouts. Failed rows are returned to the user with specific reasons.

- **Stage Master serial reordering** — Took a few tries to get right. When you insert a stage at position 3, you need to shift everything ≥ 3 up by one, insert the new stage, then renormalize the whole sequence in a single transaction so there are no gaps or duplicates. Done atomically with SQL transactions.

- **Built 18 React components** from scratch, including an Excel parser, real-time attendance board, skill matrix editor, employee history viewer, and a punch timeline report that shows every IN/OUT pair per day with break analysis.

- **Deployed on Windows Server + IIS + iisnode** — The team's infrastructure was Windows-only, so I had to figure out iisnode (which isn't as popular as PM2 on Linux). Got it working with URL rewriting and proper request size limits for the large file uploads.

---

## C. Tech Highlights

- **Node.js + Express:** Built the entire REST API layer — 60+ endpoints in a single `server.js`. Handles file uploads (Multer), Excel generation (ExcelJS), and complex SQL CTE queries for attendance reporting.

- **Microsoft SQL Server:** Wrote multi-CTE queries for attendance calculation — some with 6 nested CTEs that cross-reference shift assignments, actual punches, swap records, and shift master timings. Used window functions, `STRING_AGG`, `CROSS APPLY`, and `OPTION (MAXRECURSION 0)` for date-range generation.

- **React (v18):** Built the complete frontend with 18 feature components. Used Material UI for the component library, React Router for navigation, and sessionStorage for lightweight auth state. Implemented a theme context for dark/light mode.

- **ExcelJS:** Generated dynamic Excel upload templates with built-in dropdown data validation (stage names from the DB) so users can only pick valid stages, reducing upload errors significantly.

- **mssql + msnodesqlv8:** Used Windows Authentication against an on-premises SQL Server — more complex setup than standard SQL auth, but required for the network environment. Handles connection pooling automatically.

- **IIS + iisnode:** Configured Windows IIS to serve Node.js with the iisnode module, including URL rewriting rules to route API calls and static React files correctly, plus request size limits for 500MB payloads.

---

## E. Interview Talking Points

- **Talk about the attendance engine.** The whole challenge was: biometric punches are just raw timestamps with no context. A punch at 5:55 AM might mean Shift 1 (6 AM start) or it might be someone staying late from the night shift. The solution uses a ±45 minute window around shift start to assign punches to shifts, handles overnight shifts by checking if `EndTime < StartTime`, and has a fallback to auto-detect shifts even without assignment data. From the interviewer's angle, this is interesting because it's a classic "fuzzy matching" problem on time-series data.

- **Talk about the Excel upload architecture.** Most people think "upload a file, write it to DB" is simple. With 1000 rows of per-day shift data, it's not. I had to validate each row against DB state, deduplicate within the batch (last row wins for same user+date), batch to 50 rows to avoid SQL timeouts, and return per-row failure reasons with enough detail that users can fix their Excel and re-upload without guessing what went wrong.

- **Talk about the decision to keep everything in one server.js.** I know it looks scary at 5400 lines. But for this team, splitting into modules and routers adds cognitive overhead when you're the only developer and you need to trace through the whole flow quickly. If the project grows, it would obviously need to be split. But for a 1-person, 6-month build for an internal tool, the "one big file" approach meant zero configuration friction and all the code in one Ctrl+F searchable place. Worth mentioning the trade-offs honestly.
