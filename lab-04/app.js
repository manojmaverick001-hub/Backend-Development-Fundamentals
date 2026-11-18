const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let sqlite3 = null;
let sqlite = null;

try {
  sqlite3 = require("sqlite3");
  sqlite = require("sqlite");
} catch (e) {
  // Serverless fallback if native C++ bindings cannot load
}

const app = express();

// Task 1: Add app.use(express.json()) so request body can be parsed
app.use(express.json());

// Task 5: Keep JWT secret key in a constant for now (moved to .env in Lab 8)
const JWT_SECRET = process.env.JWT_SECRET || "MY_SECRET_TOKEN";
const PORT = process.env.PORT || 3000;

// Prepare database path (handle Vercel /tmp copy for serverless read-only filesystem)
let dbPath = path.join(__dirname, "userData.db");
if (process.env.VERCEL) {
  const tmpDbPath = path.join("/tmp", "userData.db");
  try {
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, tmpDbPath);
    }
    dbPath = tmpDbPath;
  } catch (err) {
    console.error("Could not copy DB to /tmp:", err.message);
  }
}

let db = null;

// In-memory fallback for serverless environments where native sqlite3 bindings might be unavailable
let inMemoryUsers = [];

// Helper to validate non-empty string
const isBlank = (val) => typeof val !== "string" || val.trim() === "";

// Task 2: Initialize SQLite DB and create the `user` table
const initializeDBAndServer = async () => {
  try {
    if (sqlite && sqlite3) {
      db = await sqlite.open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      // Create user table with unique username, name, and hashed password column
      await db.run(`
        CREATE TABLE IF NOT EXISTS user (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          password TEXT NOT NULL
        );
      `);

      console.log("Connected to SQLite database: userData.db");
    } else {
      console.log("Running in-memory user store fallback.");
    }

    // Only listen if not imported by test suite or serverless handler
    if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server Running at http://localhost:${PORT}/`);
      });
    }
  } catch (error) {
    console.error(`DB Initialization Error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Root route - Overview of Lab 4
app.get("/", (request, response) => {
  response.status(200).json({
    lab: "Lab 4: Registration, login and JWT",
    course: "Backend Development Fundamentals (Year II Term II)",
    institution: "Aurora Deemed to be University",
    faculty: "Yugandhar Sir",
    student: {
      name: "G. Manoj Kumar Reddy",
      registrationNumber: "252U1R3076",
      section: "CSE-DS-2B(307)",
    },
    endpoints: [
      { method: "POST", path: "/register/", description: "Register a new user with bcrypt-hashed password" },
      { method: "POST", path: "/login/", description: "Authenticate user and receive a signed JWT token" },
      { method: "GET", path: "/users/", description: "Inspect stored users to verify password hashes" },
    ],
  });
});

// Task 3: POST /register/ - Register a new user
app.post(["/register", "/register/"], async (request, response) => {
  try {
    const { username, name, password } = request.body || {};

    // Validate request body
    if (isBlank(username) || isBlank(name) || isBlank(password)) {
      return response.status(400).json({
        message: "Invalid payload: username, name, and password are required",
      });
    }

    const trimmedUsername = username.trim();
    const trimmedName = name.trim();

    if (db) {
      // Check if user already exists using parameterized query
      const selectUserQuery = `SELECT * FROM user WHERE username = ?;`;
      const dbUser = await db.get(selectUserQuery, [trimmedUsername]);

      if (dbUser !== undefined) {
        // Reject existing username with 400
        return response.status(400).json({ message: "User already exists" });
      }

      // Hash password with bcrypt (salt rounds: 10)
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save user with hashed password
      const createUserQuery = `
        INSERT INTO user (username, name, password)
        VALUES (?, ?, ?);
      `;
      await db.run(createUserQuery, [trimmedUsername, trimmedName, hashedPassword]);

      return response.status(200).json({ message: "User created successfully" });
    }

    // In-memory fallback
    const existing = inMemoryUsers.find((u) => u.username === trimmedUsername);
    if (existing) {
      return response.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    inMemoryUsers.push({
      id: inMemoryUsers.length + 1,
      username: trimmedUsername,
      name: trimmedName,
      password: hashedPassword,
    });

    return response.status(200).json({ message: "User created successfully" });
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
});

// Task 4 & 5: POST /login/ - User login with JWT token generation
app.post(["/login", "/login/"], async (request, response) => {
  try {
    const { username, password } = request.body || {};

    // Validate request body
    if (isBlank(username) || isBlank(password)) {
      return response.status(400).json({
        message: "Invalid payload: username and password are required",
      });
    }

    const trimmedUsername = username.trim();
    let dbUser = null;

    if (db) {
      // Find user using parameterized query
      const selectUserQuery = `SELECT * FROM user WHERE username = ?;`;
      dbUser = await db.get(selectUserQuery, [trimmedUsername]);
    } else {
      dbUser = inMemoryUsers.find((u) => u.username === trimmedUsername);
    }

    // Return 400 for unknown user
    if (dbUser === undefined || dbUser === null) {
      return response.status(400).json({ message: "Invalid user" });
    }

    // Compare provided password with stored bcrypt hash
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      // Task 5: Put only username (never password) in token payload
      const payload = {
        username: dbUser.username,
      };

      // Sign JWT token with secret constant
      const jwtToken = jwt.sign(payload, JWT_SECRET);

      return response.status(200).json({ jwt_token: jwtToken });
    } else {
      // Return 400 for wrong password
      return response.status(400).json({ message: "Invalid password" });
    }
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
});

// Extra Verification Route: GET /users/ - Demonstrates password hashes stored in database
app.get(["/users", "/users/"], async (request, response) => {
  try {
    if (db) {
      const selectAllUsersQuery = `SELECT id, username, name, password FROM user ORDER BY id ASC;`;
      const usersList = await db.all(selectAllUsersQuery);
      return response.status(200).json(usersList);
    }
    return response.status(200).json(inMemoryUsers);
  } catch (error) {
    return response.status(500).json({ message: error.message });
  }
});

// Catch-all 404 handler
app.use((request, response) => {
  response.status(404).json({ message: "Route not found" });
});

// Error-handling middleware for malformed JSON request bodies
app.use((error, request, response, next) => {
  if (error.type === "entity.parse.failed") {
    return response.status(400).json({ message: "Invalid JSON in request body" });
  }
  return response.status(500).json({ message: error.message });
});

// Initialize database and start server
initializeDBAndServer();

module.exports = app;

