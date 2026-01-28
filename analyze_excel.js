const XLSX = require('xlsx');
const filename = "d:/Developer/React Dev/Master/Master/Unit-3 Line-A&B DEC-25 AE&JE Job cards.xlsx";

try {
    const workbook = XLSX.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    console.log(`Sheet: ${sheetName}`);
    console.log(`Range: ${worksheet['!ref']}`);
    
    // Check merges
    console.log("Merges:", JSON.stringify(worksheet['!merges'] || []));

    // Print first 10 rows
    const data = XLSX.utils.sheet_to_json(worksheet, {header: 1, range: 0, raw: false});
    console.log("First 15 rows:");
    data.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

} catch (e) {
    console.error("Error reading file:", e.message);
}
