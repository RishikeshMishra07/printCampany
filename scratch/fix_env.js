const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found!");
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// We are going to find a line like DB_PASSWORD=something
const passwordMatch = envContent.match(/^DB_PASSWORD=(.*)$/m);

if (!passwordMatch) {
  console.log("❌ Please add a line at the bottom of .env.local like this:\nDB_PASSWORD=your_actual_password");
  process.exit(1);
}

let rawPassword = passwordMatch[1].trim();

// Remove quotes if they added them
if (rawPassword.startsWith('"') && rawPassword.endsWith('"')) {
  rawPassword = rawPassword.slice(1, -1);
} else if (rawPassword.startsWith("'") && rawPassword.endsWith("'")) {
  rawPassword = rawPassword.slice(1, -1);
}

// URL-encode the password safely
const encodedPassword = encodeURIComponent(rawPassword);

const newUrl = `postgresql://postgres:${encodedPassword}@paymentfilesystemims.cd0ii8iysxip.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=require`;

// Update DATABASE_URL in the file
if (envContent.includes('DATABASE_URL=')) {
  envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${newUrl}"`);
} else {
  envContent = `DATABASE_URL="${newUrl}"\n` + envContent;
}

fs.writeFileSync(envPath, envContent);

console.log("✅ Successfully generated a valid DATABASE_URL and updated your .env.local!");
console.log("You can now safely run: node update_db.js");
