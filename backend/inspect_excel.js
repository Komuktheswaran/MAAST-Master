const ExcelJS = require('exceljs');
const path = require('path');

const filePath = String.raw`d:\Developer\React Dev\Master\Master\Unit_Wise_Report_2025-04_to_2025-06 (2).xlsx`;

async function readExcel() {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile(filePath);
        console.log("Workbook loaded.");
        
        workbook.eachSheet((sheet, id) => {
            console.log(`Sheet ${id}: ${sheet.name}`);
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber <= 5) {
                    console.log(`Row ${rowNumber}:`, row.values);
                }
            });
        });

    } catch (error) {
        console.error("Error reading file:", error);
    }
}

readExcel();
