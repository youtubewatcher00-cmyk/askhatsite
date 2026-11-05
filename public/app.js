const form = document.getElementById("authForm");
const tabs = document.querySelectorAll(".tab");
const message = document.getElementById("message");
const authCard = document.getElementById("authCard");
const dashboard = document.getElementById("dashboard");
let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.mode === mode));
  document.getElementById("formTitle").textContent = mode === "login" ? "Жүйеге қош келдіңіз" : "Жаңа аккаунт ашу";
  document.getElementById("formSubtitle").textContent = mode === "login"
    ? "Тіркелген логин мен құпиясөзді қайта енгізіңіз."
    : "Жаңа аккаунт жасау үшін мәліметтерді толтырыңыз.";
  document.getElementById("submitBtn").querySelector("span").textContent = mode === "login" ? "Жүйеге кіру" : "Тіркелу";
  document.getElementById("password").setAttribute("autocomplete", mode === "login" ? "current-password" : "new-password");
  message.textContent = "";
}
tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

document.getElementById("showPass").addEventListener("click", () => {
  const input = document.getElementById("password");
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  document.getElementById("showPass").textContent = visible ? "ЖАСЫРУ" : "КӨРСЕТУ";
});

function showDashboard(user) {
  authCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  document.getElementById("welcomeName").textContent = user.username;
  document.getElementById("userId").textContent = user.id;
  document.getElementById("userLogin").textContent = user.username;
}
function showAuth() {
  dashboard.classList.add("hidden");
  authCard.classList.remove("hidden");
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = document.getElementById("submitBtn");
  button.disabled = true;
  message.textContent = "Серверге сұраныс жіберілуде...";
  const payload = {
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value
  };
  try {
    const response = await fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Қате пайда болды.");

    if (mode === "register") {
      // Тіркелуден кейін автоматты түрде кіру режиміне ауыстырамыз.
      document.getElementById("username").value = data.username;
      document.getElementById("password").value = "";
      setMode("login");
      message.textContent = "✓ Тіркелу сәтті! Енді құпиясөзіңізді қайта енгізіп, жүйеге кіріңіз.";
      document.getElementById("password").focus();
    } else {
      form.reset();
      showDashboard(data.user);
    }
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showAuth();
  setMode("login");
});

(async function restoreSession() {
  try {
    const response = await fetch("/api/me");
    if (response.ok) {
      const data = await response.json();
      showDashboard(data.user);
    }
  } catch (_) {}
})();