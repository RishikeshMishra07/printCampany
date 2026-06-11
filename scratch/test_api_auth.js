const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/incentives?month=6&year=2026',
  method: 'GET',
  headers: {
    'Cookie': 'auth_session=' + encodeURIComponent(JSON.stringify({
      employee_id: 'IMS123',
      name: 'Admin User',
      role: 'admin'
    }))
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data.substring(0, 1000));
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
