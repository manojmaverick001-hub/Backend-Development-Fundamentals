const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

const seedUsers = [
  {
    username: "rahul",
    name: "Rahul Attuluri",
    plainPassword: "rahul@password",
  },
  {
    username: "manoj",
    name: "G. Manoj Kumar Reddy",
    plainPassword: "manoj@password",
  },
];

async function initializeDatabase() {
  console.log("Connecting to SQLite database at:", dbPath);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  console.log("Setting up user table...");
  await db.exec(`
    DROP TABLE IF EXISTS user;
    CREATE TABLE user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);

  console.log("Seeding sample users with bcrypt hashed passwords...");
  for (const user of seedUsers) {
    const hashedPassword = await bcrypt.hash(user.plainPassword, 10);
    await db.run(
      `INSERT INTO user (username, name, password) VALUES (?, ?, ?);`,
      [user.username, user.name, hashedPassword]
    );
    console.log(`Seeded user: ${user.username} (Password hashed: ${hashedPassword.substring(0, 15)}...)`);
  }

  const allUsers = await db.all(`SELECT id, username, name, password FROM user;`);
  console.log("\nDatabase verification — Stored users (showing hashed passwords only):");
  console.table(allUsers);

  await db.close();
  console.log("\nDatabase initialization complete!");
}

initializeDatabase().catch((err) => {
  console.error("Initialization error:", err.message);
  process.exit(1);
});

