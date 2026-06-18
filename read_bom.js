const xlsx = require('xlsx');
const workbook = xlsx.readFile('d:\\Office\\printCampany\\File\\ALL PARTS BOM.xlsx');
console.log('Sheets:', workbook.SheetNames);
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  console.log(`\nSheet: ${sheetName}`);
  console.log(data.slice(0, 2));
}
