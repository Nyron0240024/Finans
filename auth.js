const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const registerButton = document.getElementById("registerButton");
const logoutButton = document.getElementById("logoutButton");
const authPanel = document.getElementById("authPanel");
const app = document.querySelector(".app");

async function updateAuthUI() {
  const { data: { session }, error } =
    await window.supabaseClient.auth.getSession();

  if (error) {
    authMessage.textContent = "Ошибка: " + error.message;
    return;
  }

  authPanel.hidden = !!session;
  app.hidden = !session;
  logoutButton.hidden = !session;

  authMessage.textContent = session
    ? "Вы вошли: " + session.user.email
    : "Войди в аккаунт или зарегистрируйся.";
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "Выполняется вход…";

  const { error } = await window.supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) {
    authMessage.textContent = "Ошибка входа: " + error.message;
    return;
  }

  await updateAuthUI();
});

registerButton.addEventListener("click", async () => {
  authMessage.textContent = "Создаём аккаунт…";

  const { data, error } = await window.supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) {
    authMessage.textContent = "Ошибка регистрации: " + error.message;
  } else if (!data.session) {
    authMessage.textContent =
      "Аккаунт создан. Проверь почту и подтверди регистрацию.";
  } else {
    authMessage.textContent = "Аккаунт создан. Вход выполнен.";
    await updateAuthUI();
  }
});

logoutButton.addEventListener("click", async () => {
  const { error } = await window.supabaseClient.auth.signOut();

  if (error) {
    authMessage.textContent = "Ошибка выхода: " + error.message;
    return;
  }

  await updateAuthUI();
});

window.supabaseClient.auth.onAuthStateChange(() => {
  setTimeout(updateAuthUI, 0);
});

updateAuthUI();
