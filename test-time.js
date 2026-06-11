
async function test() {
  try {
    const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Kolkata");
    const data = await res.json();
    const dt = new Date(data.datetime);
    console.log("WorldTimeAPI:", dt.toISOString(), dt.getTime(), Date.now());
  } catch(e) { console.log("worldtime failed", e.message); }
  
  try {
    const res2 = await fetch("https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata");
    const data2 = await res2.json();
    const dt2 = new Date(data2.year + "-" + String(data2.month).padStart(2, "0") + "-" + String(data2.day).padStart(2, "0") + "T" + String(data2.hour).padStart(2, "0") + ":" + String(data2.minute).padStart(2, "0") + ":" + String(data2.seconds).padStart(2, "0") + "+05:30");
    console.log("TimeAPI:", dt2.toISOString(), dt2.getTime());
  } catch(e) { console.log("timeapi failed", e.message); }
}
test();

