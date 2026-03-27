const express = require("express");
const cors = require("cors");

const sensorRoutes = require("./routes/sensor.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/sensors", sensorRoutes);

module.exports = app;