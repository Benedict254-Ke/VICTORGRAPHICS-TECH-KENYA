// backend/controllers/adminController.js
import db from "../database/db.js";

export const createAdmin = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "All fields are required" });

  const query = "INSERT INTO admins (username, password) VALUES (?, ?)";
  db.run(query, [username, password], (err) => {
    if (err) {
      console.error("Error inserting admin:", err.message);
      return res.status(500).json({ error: "Failed to create admin" });
    }
    res.json({ message: "Admin created successfully" });
  });
};

export const loginAdmin = (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM admins WHERE username = ? AND password = ?";

  db.get(query, [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ message: "Login successful" });
  });
};
