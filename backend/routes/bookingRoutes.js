const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../database/db.sqlite");

// POST /api/bookings
router.post("/", (req, res) => {
  const { name, phone, service, date, note } = req.body;

  console.log("📩 Incoming booking data:", req.body);

  if (!name || !phone || !service || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = new sqlite3.Database(dbPath);
  const sql = `INSERT INTO bookings (name, phone, service, date, note) VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [name, phone, service, date, note], function (err) {
    if (err) {
      console.error("❌ Database insert error:", err.message);
      res.status(500).json({ error: err.message });
    } else {
      console.log("✅ Booking saved successfully:", { id: this.lastID, name });
      res.json({ message: "Booking received successfully", id: this.lastID });
    }
  });

  db.close();
});

// GET /api/bookings — fetch all bookings
router.get("/", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const sql = "SELECT * FROM bookings ORDER BY created_at DESC";

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Failed to fetch bookings:", err.message);
      res.status(500).json({ error: "Failed to fetch bookings" });
    } else {
      res.json(rows);
    }
  });

  db.close();
});

// DELETE /api/bookings/:id — delete a booking by ID
router.delete("/:id", (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { id } = req.params;

  const sql = "DELETE FROM bookings WHERE id = ?";
  db.run(sql, [id], function (err) {
    if (err) {
      console.error("❌ Failed to delete booking:", err.message);
      res.status(500).json({ error: "Failed to delete booking" });
    } else {
      res.json({ message: "Booking deleted successfully" });
    }
  });

  db.close();
});


module.exports = router;
