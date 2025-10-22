// serviceController.js
const db = require("../models/serviceModel");

// Get all services
exports.getAllServices = (req, res) => {
  db.all("SELECT * FROM services", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Add a new service
exports.addService = (req, res) => {
  const { title, description } = req.body;

  db.run(
    `INSERT INTO services (title, description) VALUES (?, ?)`,
    [title, description],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, title, description });
    }
  );
};
