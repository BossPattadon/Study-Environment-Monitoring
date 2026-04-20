const express = require("express");
const router = express.Router();
const controller = require("../controllers/iqAir.controller");

router.get("/latest", controller.getLatest);
router.get("/history", controller.getHistory);

module.exports = router;
