const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");

// ✅ create app first
const app = express();

// ✅ then apply middlewares
app.use(cors());
app.use(bodyParser.json());

// ✅ setup session AFTER app is created
app.use(
  session({
    secret: "yourSecretKey123", // change this to any random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set true only if using HTTPS
  })
);

// ✅ import routes AFTER middlewares
const bookingRoutes = require("./routes/bookingRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const adminRoutes = require("./routes/admin"); // make sure this filename matches exactly

// Use CommonJS require for newsletter route too
const newsletterRoutes = require("./routes/newsletter");

// ✅ define route paths
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/admin", adminRoutes); // added /api/admin for consistency
app.use("/newsletter", newsletterRoutes); // newsletter routes at /newsletter

// ✅ start server
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
