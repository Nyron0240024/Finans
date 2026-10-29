const STORAGE_KEY = "moi-dengi-plans-v1";
const TRANSACTIONS_KEY = "moi-dengi-transactions-v1";

const $ = id => document.getElementById(id);

const types = {
  credit: "Кредит / долг",
  saving: "Накопление",
  income: "Цель по доходу",
  other: "Другая цель"
};

const categoryNames = {
  work: "Работа / заработок",
  fuel: "Топливо",
  food: "Продукты",
  home: "Дом и счета",
  shopping: "Покупки",
  transport: "Транспорт",
  debt: "Выплата долга",
  other: "Другое"
};

// Форматирование денежных сумм
function money(value) {
  return Math.round(value).toLocaleString("ru-RU") + " сум";
}

// Защита текста при отображении в HTML
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Проверка даты
function dateToLocal(value) {
  if (!value || typeof value !== "string") return null;

  const parts = value.split("-").map(Number);

  if (parts.length !== 3 || parts.some(n => !n)) {
    return null;
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  if (
    date.getFullYear() !== parts[0] ||
    date.getMonth() !== parts[1] - 1 ||
    date.getDate() !== parts[2]
  ) {
    return null;
  }

  return date;
}

// Дата в формате ГГГГ-ММ-ДД
function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Количество дней между датами
function daysBetween(from, to) {
  const a = Date.UTC(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  );

  const b = Date.UTC(
    to.getFullYear(),
    to.getMonth(),
    to.getDate()
  );

  return Math.round((b - a) / 86400000);
}

// Информация о сроке выполнения плана
function deadlineInfo(plan) {
  const deadline = dateToLocal(plan.deadline);
  const start = dateToLocal(plan.startDate);

  if (!deadline || !start) {
    return {
      text: "Срок не указан",
      daily: null
    };
  }

  const today = dateToLocal(dateString(new Date()));
  const daysLeft = daysBetween(today, deadline);
  const remaining = Math.max(0, plan.target - plan.current);

  let text;

  if (remaining === 0) {
    text = "Цель достигнута!";
  } else if (daysLeft < 0) {
    text = `Просрочено на ${Math.abs(daysLeft)} дн.`;
  } else if (daysLeft === 0) {
    text = "Последний день — сегодня";
  } else {
    text = `Осталось ${daysLeft} дн.`;
  }

  const daily = remaining === 0
    ? 0
    : daysLeft > 0
      ? Math.ceil(remaining / daysLeft)
      : null;

  return {
    text,
    daily,
    start,
    deadline,
    daysLeft
  };
}

// Загрузка планов
function loadPlans() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved.filter(plan =>
      plan &&
      typeof plan.id === "string" &&
      typeof plan.name === "string" &&
      Number.isSafeInteger(plan.target) &&
      Number.isSafeInteger(plan.current) &&
      plan.target > 0 &&
      plan.current >= 0 &&
      ["credit", "saving", "income", "other"].includes(plan.type)
    );
  } catch {
    return [];
  }
}

let plans = loadPlans();

// Сохранение планов
function savePlans() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(plans)
    );
  } catch {
    alert("Не удалось сохранить данные. Проверь свободное место.");
  }
}

// Отображение планов
function render() {
  const container = $("plans");
  container.innerHTML = "";

  $("emptyState").classList.toggle(
    "hidden",
    plans.length > 0
  );

  const totalTarget = plans.reduce(
    (sum, plan) => sum + plan.target,
    0
  );

  const totalCurrent = plans.reduce(
    (sum, plan) => sum + Math.min(plan.current, plan.target),
    0
  );

  const totalPercent = totalTarget
    ? Math.round(totalCurrent / totalTarget * 100)
    : 0;

  $("totalCurrent").textContent = money(totalCurrent);
  $("totalTarget").textContent = money(totalTarget);
  $("totalPercent").textContent = totalPercent + "%";

  $("totalBar").style.width =
    Math.min(totalPercent, 100) + "%";

  plans.forEach(plan => {
    const percent = Math.min(
      100,
      Math.round(plan.current / plan.target * 100)
    );

    const remaining = Math.max(
      0,
      plan.target - plan.current
    );

    const info = deadlineInfo(plan);

    const startText = plan.startDate
      ? new Date(
          plan.startDate + "T12:00:00"
        ).toLocaleDateString("ru-RU")
      : "Не указана";

    const deadlineText = plan.deadline
      ? new Date(
          plan.deadline + "T12:00:00"
        ).toLocaleDateString("ru-RU")
      : "Не указан";

    const dailyText = info.daily !== null
      ? money(info.daily)
      : "Срок истёк";

    const card = document.createElement("article");
    card.className = "plan";

    card.innerHTML = `
      <div class="plan-top">
        <div>
          <div class="plan-name">
            ${escapeHTML(plan.name)}
          </div>

          <div class="plan-type">
            ${types[plan.type]}
          </div>
        </div>

        <div class="percent">
          ${percent}%
        </div>
      </div>

      <div class="plan-amount">
        <strong>${money(plan.current)}</strong>
        <span> / ${money(plan.target)}</span>
      </div>

      <div class="progress">
        <div
          class="progress-fill"
          style="width:${percent}%"
        ></div>
      </div>

      <div class="deadline-info">
        <div>
          Начало: <strong>${startText}</strong>
        </div>

        <div>
          Крайний срок: <strong>${deadlineText}</strong>
        </div>

        <div class="deadline-count">
          ${escapeHTML(info.text)}
        </div>

        <div class="daily-needed">
          Нужно в день: <strong>${dailyText}</strong>
        </div>
      </div>

      <div class="plan-bottom">
        <span class="remaining">
          ${
            remaining > 0
              ? "Осталось " + money(remaining)
              : "Цель достигнута!"
          }
        </span>

        <div class="actions">
          <button
            class="small-button"
            data-action="add"
            data-id="${escapeHTML(plan.id)}"
          >
            + Сумма
          </button>

          <button
            class="small-button delete-button"
            data-action="delete"
            data-id="${escapeHTML(plan.id)}"
          >
            Удалить
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Показать форму создания плана
$("showForm").addEventListener("click", () => {
  $("planForm").classList.remove("hidden");
  $("planName").focus();
});

// Отмена создания плана
$("cancelForm").addEventListener("click", () => {
  $("planForm").reset();

  $("planCurrent").value = "0";
  $("planStart").value = dateString(new Date());
  $("planDeadline").value = "";

  $("planForm").classList.add("hidden");
});

// Создание плана
$("planForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("planName").value.trim();
  const type = $("planType").value;
  const target = Number($("planTarget").value);
  const current = Number($("planCurrent").value);
  const startDate = $("planStart").value;
  const deadline = $("planDeadline").value;

  const start = dateToLocal(startDate);
  const end = dateToLocal(deadline);
  const today = dateToLocal(dateString(new Date()));

  if (
    !name ||
    !Object.hasOwn(types, type) ||
    !Number.isSafeInteger(target) ||
    target <= 0 ||
    !Number.isSafeInteger(current) ||
    current < 0
  ) {
    alert("Проверь название и суммы.");
    return;
  }

  if (current > target) {
    alert("Начальная сумма не должна превышать общую цель.");
    return;
  }

  if (!start || !end || end < start) {
    alert("Проверь даты начала и крайнего срока.");
    return;
  }

  if (end < today) {
    alert("Крайний срок не может быть в прошлом.");
    return;
  }

  plans.unshift({
    id: crypto.randomUUID(),
    name,
    type,
    target,
    current,
    startDate,
    deadline
  });

  savePlans();
  render();

  $("planForm").reset();
  $("planCurrent").value = "0";
  $("planStart").value = dateString(new Date());

  $("planForm").classList.add("hidden");
});

// Кнопки планов: увеличить сумму или удалить
$("plans").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const plan = plans.find(
    item => item.id === button.dataset.id
  );

  if (!plan) return;

  if (button.dataset.action === "add") {
    const input = prompt(
      "На сколько сум увеличить выплаченную или накопленную сумму?"
    );

    if (input === null || input.trim() === "") return;

    const amount = Number(
      input.replace(/[\s,]/g, "")
    );

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      alert("Введи положительную целую сумму.");
      return;
    }

    if (amount > Number.MAX_SAFE_INTEGER - plan.current) {
      alert("Слишком большая сумма.");
      return;
    }

    plan.current += amount;

    savePlans();
    render();
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Удалить план «${plan.name}»?`)) {
      return;
    }

    plans = plans.filter(
      item => item.id !== plan.id
    );

    savePlans();
    render();
  }
});

// Установить дату начала по умолчанию
$("planStart").value = dateString(new Date());

// Загрузка финансовых операций
function loadTransactions() {
  try {
    const items = JSON.parse(
      localStorage.getItem(TRANSACTIONS_KEY) || "[]"
    );

    if (!Array.isArray(items)) return [];

    return items.filter(item =>
      item &&
      typeof item.id === "string" &&
      ["income", "expense"].includes(item.type) &&
      Number.isSafeInteger(item.amount) &&
      item.amount > 0 &&
      typeof item.date === "string" &&
      dateToLocal(item.date) !== null &&
      Object.hasOwn(categoryNames, item.category)
    );
  } catch {
    return [];
  }
}

let transactions = loadTransactions();
let editingTransactionId = null;

// Автоматическое форматирование суммы:
// 1500000 превращается в 1 500 000
function formatAmountInput(input) {
  const digits = input.value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");

  input.value = digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    " "
  );
}

$("transactionAmount").addEventListener("input", () => {
  formatAmountInput($("transactionAmount"));
});

// Сохранение финансовых операций
function saveTransactions() {
  try {
    localStorage.setItem(
      TRANSACTIONS_KEY,
      JSON.stringify(transactions)
    );
  } catch {
    alert("Не удалось сохранить операции. Проверь свободное место.");
  }
}

// Отображение истории и пересчёт баланса
function renderTransactions() {
  const container = $("transactions");
  container.innerHTML = "";

  $("emptyTransactions").classList.toggle(
    "hidden",
    transactions.length > 0
  );

  const now = new Date();

  const monthPrefix =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

  let incomeMonth = 0;
  let expenseMonth = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(item => {
    if (item.type === "income") {
      totalIncome += item.amount;

      if (item.date.startsWith(monthPrefix)) {
        incomeMonth += item.amount;
      }
    } else {
      totalExpense += item.amount;

      if (item.date.startsWith(monthPrefix)) {
        expenseMonth += item.amount;
      }
    }
  });

  $("realBalance").textContent =
    money(totalIncome - totalExpense);

  $("monthIncome").textContent =
    money(incomeMonth);

  $("monthExpense").textContent =
    money(expenseMonth);

  const sorted = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date) ||
    b.id.localeCompare(a.id)
  );

  sorted.forEach(item => {
    const card = document.createElement("article");
    card.className = "plan";

    const isIncome = item.type === "income";
    const date = dateToLocal(item.date);

    const dateText = date
      ? date.toLocaleDateString("ru-RU")
      : item.date;

    card.innerHTML = `
      <div class="plan-top">
        <div>
          <div class="plan-name">
            ${escapeHTML(categoryNames[item.category])}
          </div>

          <div class="transaction-note">
            ${dateText}${
              item.note
                ? " · " + escapeHTML(item.note)
                : ""
            }
          </div>
        </div>

        <div class="${
          isIncome
            ? "transaction-income"
            : "transaction-expense"
        }">
          ${isIncome ? "+" : "−"}${money(item.amount)}
        </div>
      </div>

      <div class="plan-bottom">
        <span class="remaining">
          ${isIncome ? "Доход" : "Расход"}
        </span>

        <div class="actions">
          <button
            class="small-button"
            data-transaction-edit="${escapeHTML(item.id)}"
          >
            Редактировать
          </button>

          <button
            class="small-button delete-button"
            data-transaction-delete="${escapeHTML(item.id)}"
          >
            Удалить
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Установить текущую дату для новой операции
$("transactionDate").value = dateString(new Date());

// Сохранение или редактирование операции
$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();

  const type = $("transactionType").value;

  const amount = Number(
    $("transactionAmount").value.replace(/\s/g, "")
  );

  const category = $("transactionCategory").value;
  const date = $("transactionDate").value;
  const note = $("transactionNote").value.trim();

  if (
    !["income", "expense"].includes(type) ||
    !Object.hasOwn(categoryNames, category) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !dateToLocal(date)
  ) {
    alert("Проверь тип операции, сумму и дату.");
    return;
  }

  const data = {
    type,
    amount,
    category,
    date,
    note
  };

  if (editingTransactionId) {
    const index = transactions.findIndex(
      item => item.id === editingTransactionId
    );

    if (index !== -1) {
      transactions[index] = {
        ...transactions[index],
        ...data
      };
    }
  } else {
    transactions.push({
      id: crypto.randomUUID(),
      ...data
    });
  }

  editingTransactionId = null;

  $("transactionForm").querySelector(
    'button[type="submit"]'
  ).textContent = "Сохранить операцию";

  saveTransactions();
  renderTransactions();

  $("transactionForm").reset();
  $("transactionAmount").value = "";
  $("transactionNote").value = "";
  $("transactionDate").value = dateString(new Date());
});

// Редактирование и удаление операций
$("transactions").addEventListener("click", event => {
  const editButton = event.target.closest(
    "[data-transaction-edit]"
  );

  // Редактирование операции
  if (editButton) {
    const item = transactions.find(
      transaction =>
        transaction.id === editButton.dataset.transactionEdit
    );

    if (!item) return;

    editingTransactionId = item.id;

    $("transactionType").value = item.type;

    $("transactionAmount").value =
      item.amount
        .toLocaleString("ru-RU")
        .replace(/\u00A0/g, " ");

    $("transactionCategory").value = item.category;
    $("transactionDate").value = item.date;
    $("transactionNote").value = item.note || "";

    $("transactionForm").querySelector(
      'button[type="submit"]'
    ).textContent = "Сохранить изменения";

    $("transactionForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    $("transactionAmount").focus();

    return;
  }

  // Удаление операции
  const deleteButton = event.target.closest(
    "[data-transaction-delete]"
  );

  if (!deleteButton) return;

  const id = deleteButton.dataset.transactionDelete;

  const item = transactions.find(
    transaction => transaction.id === id
  );

  if (!item) return;

  if (!confirm("Удалить эту операцию? Баланс будет пересчитан.")) {
    return;
  }

  transactions = transactions.filter(
    transaction => transaction.id !== id
  );

  // Если удаляется редактируемая операция, сбросить форму
  if (editingTransactionId === id) {
    editingTransactionId = null;

    $("transactionForm").reset();
    $("transactionAmount").value = "";
    $("transactionDate").value = dateString(new Date());

    $("transactionForm").querySelector(
      'button[type="submit"]'
    ).textContent = "Сохранить операцию";
  }

  saveTransactions();
  renderTransactions();
});

// Первоначальное отображение приложения
render();
renderTransactions();