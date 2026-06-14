const fetch = require('node-fetch') || globalThis.fetch;

async function run() {
  const req = await fetch('http://localhost:3000/api/store/stock-counts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      count_date: "2026-06-14",
      counted_by: "Test",
      status: "Closed",
      items_json: [
        { item_id: 10, physical_qty: 1500, difference: 1 }
      ]
    })
  });
  const text = await req.text();
  console.log(req.status, text);
}
run();
