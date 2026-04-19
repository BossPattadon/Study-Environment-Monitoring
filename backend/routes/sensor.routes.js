const express = require("express");
const router = express.Router();

const controller = require("../controllers/sensor.controller");

router.get("/latest", controller.getLatestData);
router.get("/range", controller.getByRange);
router.get("/", controller.getAllData);
router.post("/", controller.saveSensorData);

module.exports = router;