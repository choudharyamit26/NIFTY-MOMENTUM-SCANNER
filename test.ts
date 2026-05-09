async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/scan");
    const data = await res.json();
    console.log("Success:", data.data.length, "results");
    console.log(data.data);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
