const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database/db.sqlite");

// ------------------- Admin Login -------------------
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const query = "SELECT * FROM admins WHERE username = ? AND password = ?";
  db.get(query, [username, password], (err, row) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (!row) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    // Save session for logged-in admin
    req.session.admin = { id: row.id, username: row.username };
    return res.json({ success: true, message: "Login successful", admin: row });
  });
});

// ------------------- Admin Logout -------------------
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// ------------------- Update Admin Credentials -------------------
router.put("/update", (req, res) => {
  const { adminId, newUsername, newPassword } = req.body;

  if (!adminId || !newUsername || !newPassword) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  const query = "UPDATE admins SET username = ?, password = ? WHERE id = ?";
  db.run(query, [newUsername, newPassword, adminId], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    return res.json({ success: true, message: "Credentials updated successfully" });
  });
});

// ------------------- Create New Admin -------------------
router.post("/create", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  db.get("SELECT * FROM admins WHERE username = ?", [username], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (row) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    db.run("INSERT INTO admins (username, password) VALUES (?, ?)", [username, password], function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
      }

      return res.json({ success: true, message: "✅ New admin created successfully!" });
    });
  });
});

// ------------------- Get All Admins -------------------
router.get("/all", (req, res) => {
  db.all("SELECT id, username FROM admins ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to load admins" });
    return res.json(rows);
  });
});

// ------------------- Delete Admin -------------------
router.delete("/delete/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (id === 1) {
    return res.json({ success: false, message: "Cannot delete super admin!" });
  }

  db.run("DELETE FROM admins WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ success: false, message: "Server error" });
    res.json({ success: true, message: "Admin deleted successfully" });
  });
});

module.exports = router;
