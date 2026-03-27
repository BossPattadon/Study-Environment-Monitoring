const express = require("express");
const router = express.Router();

const controller = require("../controllers/sensor.controller");

router.get("/", controller.getAllData);
router.get("/latest", controller.getLatestData);

module.exports = router;