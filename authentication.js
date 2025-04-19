const express = require('express');
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");

const DB_PATH = path.join(__dirname, "users.json");


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

// Middleware for basic auth
const basicAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required');
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  
  if (!base64Credentials) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).send('Malformed authorization header');
  }
  
  try {
    // Decode credentials
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    // Validate credentials exist
    if (!username || !password) {
      res.set('WWW-Authenticate', 'Basic');
      return res.status(401).send('Invalid credentials format');
    }
    
    // Validate against your hardcoded values
    if (username === 'admin' && password === 'password') {
      return next();
    }
    
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).send('Invalid credentials');
  } catch (err) {
    res.set('WWW-Authenticate', 'Basic');
    return res.status(401).send('Invalid authorization header');
  }
};


router.get('/protected', basicAuth, (req, res) => {
    console.log("user authenticated successfully")
  res.send('Welcome to the protected route!');
});


router.post("/users", async (req, res) => {
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

module.exports = router;