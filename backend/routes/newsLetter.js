const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const router = express.Router();
const dbPath = path.join(__dirname, "..", "database", "db.sqlite");
const db = new sqlite3.Database(dbPath);

// Make sure table exists
db.run(
  `CREATE TABLE IF NOT EXISTS newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`
);

// Subscribe endpoint
router.post("/subscribe", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: "Email is required" });

  const q = "INSERT INTO newsletter (email) VALUES (?)";
  db.run(q, [email], function (err) {
    if (err) {
      if (err.message && err.message.includes("UNIQUE")) {
        return res.status(400).json({ success: false, error: "Email already subscribed" });
      }
      console.error("Newsletter insert error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
    return res.json({ success: true, message: "Subscribed successfully", id: this.lastID });
  });
});

// Get all subscribers (admin)
router.get("/subscribers", (req, res) => {
  const q = "SELECT id, email, subscribed_at FROM newsletter ORDER BY subscribed_at DESC";
  db.all(q, [], (err, rows) => {
    if (err) {
      console.error("Newsletter select error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
    res.json(rows);
  });
});

// Delete subscriber
router.delete("/delete/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ success: false, error: "Invalid id" });

  const q = "DELETE FROM newsletter WHERE id = ?";
  db.run(q, [id], function (err) {
    if (err) {
      console.error("Newsletter delete error:", err);
      return res.status(500).json({ success: false, error: "Server error" });
    }
    return res.json({ success: true, message: "Subscriber deleted" });
  });
});

module.exports = router;
