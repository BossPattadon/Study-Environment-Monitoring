const express = require("express");
const router = express.Router();
const controller = require("../controllers/reports.controller");

router.get("/daily", controller.getDaily);

module.exports = router;
