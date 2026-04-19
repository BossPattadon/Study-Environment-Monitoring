const express = require("express");
const cors = require("cors");

const sensorRoutes = require("./routes/sensor.routes");
const iqAirRoutes = require("./routes/iqAir.routes");
const openaqRoutes = require("./routes/openaq.routes");
const openweatherRoutes = require("./routes/openweather.routes");
const studyIndexRoutes = require("./routes/studyIndex.routes");
const reportsRoutes = require("./routes/reports.routes");
const settingsRoutes = require("./routes/settings.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/sensors", sensorRoutes);
app.use("/api/iq-air", iqAirRoutes);
app.use("/api/openaq", openaqRoutes);
app.use("/api/openweather", openweatherRoutes);
app.use("/api/study-index", studyIndexRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/settings", settingsRoutes);

module.exports = app;