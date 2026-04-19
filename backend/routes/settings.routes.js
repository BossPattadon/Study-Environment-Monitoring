const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/settings.controller");

router.get("/weights",  controller.getWeights);
router.put("/weights",  controller.putWeights);

module.exports = router;
