const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Example route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is running!' });
});

// SQLite DB (adjust path if needed)
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'), (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to SQLite database.');
});

// Use Render dynamic port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
