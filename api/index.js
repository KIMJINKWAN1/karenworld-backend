const express = require("express");
const app = express();

app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({ status: "ok", remaining: 19900000 });
});

module.exports = (req, res) => app(req, res); 