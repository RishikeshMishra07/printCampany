const xlsx = require('xlsx');

// Generate test data with some valid rows and some intentional duplicates/frauds
const data = [
  {
    "Account_No": "10000000001",
    "Employee_Code": "IMS101",
    "Employee_Name": "Ramesh Kumar",
    "Client": "Sbi Recovery",
    "Product": "Credit Card",
    "Bucket": "Write-Off",
    "Location": "Delhi",
    "Money_Collected": "15000",
    "Payment_Mode": "ONLINE",
    "TL_Name": "Neha Singh",
    "AM": "Deepak Sharma",
    "APH": "Naveen",
    "PH": "Sanjay",
    "Phone_No": "9876543210"
  },
  {
    "Account_No": "10000000002",
    "Employee_Code": "IMS102",
    "Employee_Name": "Suresh Das",
    "Client": "Sbi Recovery",
    "Product": "Credit Card",
    "Bucket": "Write-Off",
    "Location": "Delhi",
    "Money_Collected": "20000",
    "Payment_Mode": "CASH",
    "TL_Name": "Neha Singh",
    "AM": "Deepak Sharma",
    "APH": "Naveen",
    "PH": "Sanjay",
    "Phone_No": "9876543211"
  },
  // 🚨 INTRA-FILE DUPLICATE (Same as Row 1)
  {
    "Account_No": "10000000001",
    "Employee_Code": "IMS101",
    "Employee_Name": "Ramesh Kumar",
    "Client": "Sbi Recovery",
    "Product": "Credit Card",
    "Bucket": "Write-Off",
    "Location": "Delhi",
    "Money_Collected": "15000",
    "Payment_Mode": "ONLINE",
    "TL_Name": "Neha Singh",
    "AM": "Deepak Sharma",
    "APH": "Naveen",
    "PH": "Sanjay",
    "Phone_No": "9876543210"
  },
  // 🚨 ZERO AMOUNT FRAUD
  {
    "Account_No": "10000000003",
    "Employee_Code": "IMS103",
    "Employee_Name": "Vikash",
    "Client": "Sbi Recovery",
    "Product": "Credit Card",
    "Bucket": "Write-Off",
    "Location": "Delhi",
    "Money_Collected": "10",
    "Payment_Mode": "ONLINE",
    "TL_Name": "Neha Singh",
    "AM": "Deepak Sharma",
    "APH": "Naveen",
    "PH": "Sanjay",
    "Phone_No": "9876543212"
  },
  // 🚨 SPLIT PAYMENT FRAUD (Same account 10000000002 as Row 2, but different amount, same upload date)
  {
    "Account_No": "10000000002",
    "Employee_Code": "IMS102",
    "Employee_Name": "Suresh Das",
    "Client": "Sbi Recovery",
    "Product": "Credit Card",
    "Bucket": "Write-Off",
    "Location": "Delhi",
    "Money_Collected": "5000",
    "Payment_Mode": "CASH",
    "TL_Name": "Neha Singh",
    "AM": "Deepak Sharma",
    "APH": "Naveen",
    "PH": "Sanjay",
    "Phone_No": "9876543211"
  },
  // 🚨 MULTI-AGENT FRAUD (Account 10000000001 claimed by IMS999)
  {
    "Account_No": "10000000001",
    "Employee_Code": "IMS999",
    "Employee_Name": "Fake Agent",
    "Client": "Sbi Recovery",
    "Product": "Credit Card",
    "Bucket": "Write-Off",
    "Location": "Delhi",
    "Money_Collected": "15000",
    "Payment_Mode": "ONLINE",
    "TL_Name": "Neha Singh",
    "AM": "Deepak Sharma",
    "APH": "Naveen",
    "PH": "Sanjay",
    "Phone_No": "9876543210"
  }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
xlsx.writeFile(wb, "test_bpo_fraud_upload.xlsx");
console.log("Excel file generated successfully: test_bpo_fraud_upload.xlsx");
