require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Run: lsof -ti:${PORT} | xargs kill -9`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

function shutdown(signal) {
  console.log(`\n${signal} received — closing server and DB pool...`);
  server.close(() => {
    pool.end((err) => {
      if (err) console.error("Error closing DB pool:", err);
      else console.log("DB pool closed. Goodbye.");
      process.exit(0);
    });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));