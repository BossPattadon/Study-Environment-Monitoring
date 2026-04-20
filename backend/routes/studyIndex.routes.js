const express = require("express");
const router = express.Router();
const controller = require("../controllers/studyIndex.controller");

router.get("/latest", controller.getLatest);
router.get("/history", controller.getHistory);
router.get("/daily-scores", controller.getDailyScores);
router.get("/hourly-averages", controller.getHourlyAverages);

module.exports = router;
