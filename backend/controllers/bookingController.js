// bookingController.js
const db = require("../models/bookingModel");

// Save a new booking
exports.createBooking = (req, res) => {
  const { name, phone, service, message } = req.body;

  db.run(
    `INSERT INTO bookings (name, phone, service, message) VALUES (?, ?, ?, ?)`,
    [name, phone, service, message],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, success: true });
    }
  );
};

// Fetch all bookings
exports.getBookings = (req, res) => {
  db.all(`SELECT * FROM bookings ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};
