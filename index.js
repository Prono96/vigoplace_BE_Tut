const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const verifyToken = require("./middlewares/authMiddleware");

const app = express();
app.use(express.json());

const DB_PATH = path.join(__dirname, "users.json");

// Helper function to read the database
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return { users: [] };
  }
}

// Helper function to write to the database
async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to database:", err);
  }
}

app.get("/users", async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST METHOD
// POST (Create) a new user
app.post("/users", async (req, res) => {
  try {
    const db = await readDB();
    const newUser = {
      id: db.users.length > 0 ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
      name: req.body.name,
      email: req.body.email,
    };

    db.users.push(newUser);
    await writeDB(db);

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

//   PUT METHOD
// PUT (Update) an existing user
app.put("/users/:id", async (req, res) => {
  try {
    const db = await readDB();
    const index = db.users.findIndex((u) => u.id === parseInt(req.params.id));

    if (index === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = {
      ...db.users[index],
      name: req.body.name || db.users[index].name,
      email: req.body.email || db.users[index].email,
    };

    db.users[index] = updatedUser;
    await writeDB(db);

    return res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const db = await readDB();

    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 13);

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = db.users.find((u) => u.email === email);
    if (user) {
      return res.status(401).json({ error: "Email exists already" });
    }

    const newUser = {
      id: db.users.length > 0 ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
      name: name,
      email: email,
      password: hashedPassword,
      role: 'user'
    };
    db.users.push(newUser);
    await writeDB(db);

    const token = jwt.sign({ userId: newUser.id }, "secret_key", {
      expiresIn: "1h",
    });
    res.status(201).json({ newUser, token });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const db = await readDB();
    const { email, password } = req.body;

    const user = db.users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, "secret_key", {
      expiresIn: "1h",
    });
    res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: "Failed to login user" });
  }
});

app.get("/users/:id", verifyToken, async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find((u) => u.id === parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
