const XLSX = require('xlsx');

function inspectExcel(filePath) {
    console.log(`Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Get range
    const range = XLSX.utils.decode_range(sheet['!ref']);
    console.log(`Sheet Range: ${sheet['!ref']} (Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1})`);

    // Read first 10 rows to understand headers and structure
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
    
    console.log("\n--- First 10 Rows ---");
    data.slice(0, 10).forEach((row, idx) => {
        console.log(`Row ${idx}:`, JSON.stringify(row));
    });

    console.log("\n--- Merge Cells ---");
    if (sheet['!merges']) {
        sheet['!merges'].slice(0, 5).forEach(m => {
            console.log(`Merge: r${m.s.r}c${m.s.c} -> r${m.e.r}c${m.e.c}`);
        });
    }
}

inspectExcel('D:\\Developer\\React Dev\\Master\\Master\\Unit-3 Line-A&B DEC-25 AE&JE Job cards.xlsx');
