const express = require("express");
const router = express.Router();
const controller = require("../controllers/openaq.controller");

router.get("/latest", controller.getLatest);

module.exports = router;
