const express = require("express");
const router = express.Router();
const controller = require("../controllers/openweather.controller");

router.get("/latest", controller.getLatest);
router.get("/history", controller.getHistory);

module.exports = router;
