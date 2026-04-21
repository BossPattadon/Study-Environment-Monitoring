const express = require("express");
const router = express.Router();
const controller = require("../controllers/forecast.controller");

router.get("/models", controller.getModels);
router.get("/", controller.getForecast);

module.exports = router;
