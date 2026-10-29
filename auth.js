
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const registerButton = document.getElementById("registerButton");
const logoutButton = document.getElementById("logoutButton");

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "Выполняется вход…";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  authMessage.textContent = error
    ? "Ошибка входа: " + error.message
    : "Вход выполнен.";
});

registerButton.addEventListener("click", async () => {
  authMessage.textContent = "Создаём аккаунт…";

  const { data, error } = await supabaseClient.auth.signUp({
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
  }
});

logoutButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  authMessage.textContent = error
    ? "Ошибка выхода: " + error.message
    : "Ты вышел из аккаунта.";
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  logoutButton.hidden = !session;

  authForm.hidden = !!session;
  document.getElementById("authPanel").hidden = !!session;
  authMessage.textContent = session
    ? "Вы вошли: " + session.user.email
    : "Войди в аккаунт или зарегистрируйся.";

  document.querySelector(".app").hidden = !session;
});
