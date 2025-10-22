// serviceRoutes.js
const express = require("express");
const { getAllServices, addService } = require("../controllers/serviceController");
const router = express.Router();

router.get("/", getAllServices);
router.post("/", addService);

module.exports = router;
