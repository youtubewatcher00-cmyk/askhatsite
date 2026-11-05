require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.txt");

if (!process.env.SESSION_SECRET) {
  console.error("Қате: .env файлында SESSION_SECRET көрсетілмеген!");
  process.exit(1);
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "# Қолданушылар тізімі. Әр жол — бір JSON жазбасы.\n", "utf8");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

function readUsers() {
  return fs.readFileSync(USERS_FILE, "utf8")
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith("#"))
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function appendUser(user) {
  // Бір қолданушы бір JSON жолы ретінде data/users.txt файлына толық жазылады.
  fs.appendFileSync(USERS_FILE, JSON.stringify(user) + "\n", "utf8");
}

function safeUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

app.post("/api/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3 || username.length > 24) {
      return res.status(400).json({ message: "Логин 3–24 таңбадан тұруы керек." });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return res.status(400).json({ message: "Логинде латын әріптері, сандар, _ . - ғана қолданылсын." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Құпиясөз кемінде 8 таңба болуы керек." });
    }

    const users = readUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ message: "Бұл логин тіркелген. Басқа логин таңдаңыз." });
    }

    const id = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), -1) + 1;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id,
      username,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    appendUser(user);

    // Маңызды: тіркелгеннен кейін сессия ашылмайды.
    // Қолданушыға кіру бетіне ауысып, логин/құпиясөзді қайта енгізу керек.
    res.status(201).json({
      message: "Тіркелу сәтті аяқталды! Енді кіру бетінде логин мен құпиясөзді қайта енгізіңіз.",
      username
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Серверде қате пайда болды. Қайта көріңіз." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const user = readUsers().find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Логин немесе құпиясөз қате." });
    }

    req.session.user = safeUser(user);
    res.json({ message: "Жүйеге сәтті кірдіңіз!", user: req.session.user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Серверде қате пайда болды." });
  }
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Жүйеге кірмегенсіз." });
  res.json({ user: req.session.user });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Жүйеден шығу кезінде қате болды." });
    res.clearCookie("connect.sid");
    res.json({ message: "Жүйеден шықтыңыз." });
  });
});

app.listen(PORT, () => {
  console.log("------------------------------------------");
  console.log(" IT ИНФРАҚҰРЫЛЫМ САБАҒЫ — САЙТ ІСКЕ ҚОСЫЛДЫ");
  console.log(` http://localhost:${PORT}`);
  console.log(` Қолданушылар файлы: ${USERS_FILE}`);
  console.log("------------------------------------------");
});