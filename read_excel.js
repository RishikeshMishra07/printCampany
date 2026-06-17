const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const altPath = path.join(__dirname, 'File', 'ALL STOCK -JUNE-26-27 (1).xlsx');

try {
  const workbook = XLSX.readFile(altPath);
  console.log("Found Sheets:", workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    if (worksheet) {
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Save each sheet's full data to a JSON file to avoid overwhelming the console
      const safeName = sheetName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const outPath = path.join(__dirname, `${safeName}_data.json`);
      
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
      console.log(`Saved full data of sheet "${sheetName}" to ${safeName}_data.json (Total Rows: ${data.length})`);
    }
  });
  
  console.log("\nAll sheets read successfully!");
} catch(e) {
  console.error("Error:", e.message);
}
