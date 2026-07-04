const STORE_KEY = "budgetapp_v1_data";
const DEMO_DATA_VERSION = 2;

const demoBillCategories = [
  ["Rent", 1500, "Rent payment", "Main Bank"],
  ["Utilities", 180, "Utilities", "Credit Card"],
  ["Phone", 60, "Mobile plan", "Credit Card"],
  ["Insurance", 220, "Insurance premium", "Main Bank"],
  ["Internet", 75, "Broadband bill", "Credit Card"],
  ["Subscriptions", 95, "Software and media subscriptions", "Credit Card"],
  ["Gym", 88, "Gym membership", "Credit Card"],
  ["Childcare", 620, "Childcare fee", "Main Bank"],
  ["Loan", 780, "Loan repayment", "Main Bank"],
  ["Taxes", 360, "Tax provision", "Main Bank"],
  ["Medical Plan", 140, "Medical plan", "Credit Card"],
  ["Storage", 45, "Storage rental", "Credit Card"]
];

const demoMonthlyExpenseCategories = [
  ["Food", 650, "Groceries", "Main Bank"],
  ["Transport", 220, "Transit and rides", "Main Bank"],
  ["Shopping", 300, "Shopping", "Credit Card"],
  ["Entertainment", 180, "Streaming and cinema", "Credit Card"],
  ["Dining Out", 420, "Restaurant meal", "Credit Card"],
  ["Coffee", 120, "Coffee", "Credit Card"],
  ["Groceries", 480, "Supermarket", "Main Bank"],
  ["Personal Care", 160, "Personal care", "Credit Card"],
  ["Healthcare", 240, "Clinic and pharmacy", "Credit Card"],
  ["Education", 260, "Courses and books", "Main Bank"],
  ["Travel", 550, "Travel booking", "Credit Card"],
  ["Gifts", 180, "Gifts", "Credit Card"],
  ["Pets", 150, "Pet supplies", "Credit Card"],
  ["Home Supplies", 210, "Home supplies", "Credit Card"],
  ["Hobbies", 190, "Hobby spending", "Credit Card"]
];

const defaultData = {
  profile: {
    displayName: "Demo User",
    currency: "SGD",
    demoDataVersion: DEMO_DATA_VERSION
  },
  accounts: [
    { id: crypto.randomUUID(), name: "Main Bank", type: "Bank", openingBalance: 2500 },
    { id: crypto.randomUUID(), name: "Credit Card", type: "Credit Card", openingBalance: -300 }
  ],
  budgets: buildDemoBudgets(),
  incomeSubCategories: ["Salary", "Bonus", "Dividend", "Interest", "Side Income"],
  transactions: buildDemoTransactions()
};

function sampleTx(date, type, mainCategory, subCategory, description, amount, account) {
  return {
    id: crypto.randomUUID(),
    date,
    type,
    mainCategory,
    subCategory,
    description,
    amount,
    account
  };
}

function buildDemoBudgets() {
  return [
    ...demoBillCategories.map(([subCategory, amount]) => ({
      id: crypto.randomUUID(),
      mainCategory: "Bills",
      subCategory,
      amount
    })),
    ...demoMonthlyExpenseCategories.map(([subCategory, amount]) => ({
      id: crypto.randomUUID(),
      mainCategory: "Monthly Expenses",
      subCategory,
      amount
    }))
  ];
}

function buildDemoTransactions() {
  const rows = [];
  const expenseTemplates = [
    ...demoBillCategories.map(([subCategory, amount, description, account]) => ["Bills", subCategory, description, amount, account]),
    ...demoMonthlyExpenseCategories.map(([subCategory, amount, description, account]) => ["Monthly Expenses", subCategory, description, amount, account])
  ];
  const incomeTemplates = [
    ["Income", "Salary", "Monthly salary", 5000, "Main Bank"],
    ["Income", "Bonus", "Performance bonus", 900, "Main Bank"],
    ["Income", "Dividend", "Dividend payout", 160, "Investment"],
    ["Income", "Interest", "Bank interest", 28, "Main Bank"],
    ["Income", "Side Income", "Freelance work", 450, "Main Bank"]
  ];

  for (let year = 2024; year <= 2026; year += 1) {
    const lastMonth = year === 2026 ? 7 : 12;
    for (let month = 1; month <= lastMonth; month += 1) {
      const monthText = String(month).padStart(2, "0");
      const variation = 0.86 + ((year + month) % 7) * 0.045;

      expenseTemplates.forEach((item, index) => {
        const [mainCategory, subCategory, description, amount, account] = item;
        const day = String(3 + ((index * 3 + month) % 24)).padStart(2, "0");
        const monthlyShare = mainCategory === "Bills" ? 0.98 : 0.34 + (index % 4) * 0.08;
        rows.push(sampleTx(
          `${year}-${monthText}-${day}`,
          "Expense",
          mainCategory,
          subCategory,
          description,
          Math.round(amount * variation * monthlyShare),
          account
        ));

        if (mainCategory === "Monthly Expenses" && index % 3 === 0) {
          const secondDay = String(16 + ((index + month) % 10)).padStart(2, "0");
          rows.push(sampleTx(
            `${year}-${monthText}-${secondDay}`,
            "Expense",
            mainCategory,
            subCategory,
            `${description} extra`,
            Math.round(amount * variation * 0.16),
            account
          ));
        }
      });

      incomeTemplates.forEach((item, index) => {
        if (index > 0 && (month + index + year) % 3 !== 0) return;
        const [mainCategory, subCategory, description, amount, account] = item;
        const day = String(2 + index * 4).padStart(2, "0");
        rows.push(sampleTx(
          `${year}-${monthText}-${day}`,
          "Income",
          mainCategory,
          subCategory,
          description,
          Math.round(amount * variation),
          account
        ));
      });
    }
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function loadData() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    saveData(defaultData);
    return structuredClone(defaultData);
  }

  try {
    return normalizeData(JSON.parse(saved));
  } catch {
    saveData(defaultData);
    return structuredClone(defaultData);
  }
}

function normalizeData(data) {
  data.profile = data.profile || { displayName: "Demo User", currency: "SGD" };
  data.accounts = data.accounts || [];
  data.budgets = (data.budgets || []).map(item => ({
    id: item.id || crypto.randomUUID(),
    mainCategory: item.mainCategory || (item.category === "Bills" ? "Bills" : "Monthly Expenses"),
    subCategory: item.subCategory || item.category || "Other",
    amount: Number(item.amount) || 0
  }));
  data.incomeSubCategories = data.incomeSubCategories || ["Salary", "Bonus", "Dividend", "Interest", "Side Income"];
  data.transactions = (data.transactions || []).map(item => ({
    id: item.id || crypto.randomUUID(),
    date: item.date,
    type: item.type || (item.mainCategory === "Income" ? "Income" : "Expense"),
    mainCategory: item.mainCategory || (item.type === "Income" ? "Income" : "Monthly Expenses"),
    subCategory: item.subCategory || item.category || "Other",
    description: item.description || "",
    amount: Number(item.amount) || 0,
    account: item.account || ""
  }));
  const currentVersion = Number(data.profile.demoDataVersion) || 0;
  if (currentVersion < DEMO_DATA_VERSION || data.transactions.length < 240) {
    data.budgets = buildDemoBudgets();
    data.transactions = buildDemoTransactions();
    data.profile.demoDataVersion = DEMO_DATA_VERSION;
  }
  return data;
}

function saveData(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function upsertTransaction(transaction) {
  const data = loadData();
  data.transactions.unshift({
    id: crypto.randomUUID(),
    ...transaction,
    amount: Number(transaction.amount) || 0
  });
  saveData(data);
}

function upsertAccount(account) {
  const data = loadData();
  const existing = data.accounts.find(item => item.id === account.id);
  if (existing) Object.assign(existing, account);
  else data.accounts.push({ id: crypto.randomUUID(), ...account });
  saveData(data);
}

function deleteAccount(id) {
  const data = loadData();
  data.accounts = data.accounts.filter(item => item.id !== id);
  saveData(data);
}

function upsertBudget(budget) {
  const data = loadData();
  const existing = data.budgets.find(item => item.id === budget.id);
  if (existing) Object.assign(existing, budget);
  else data.budgets.push({ id: crypto.randomUUID(), ...budget });
  saveData(data);
}

function deleteBudget(id) {
  const data = loadData();
  data.budgets = data.budgets.filter(item => item.id !== id);
  saveData(data);
}

function addIncomeSubCategory(name) {
  const data = loadData();
  if (!data.incomeSubCategories.some(item => item.toLowerCase() === name.toLowerCase())) {
    data.incomeSubCategories.push(name);
    data.incomeSubCategories.sort();
  }
  saveData(data);
}

function deleteIncomeSubCategory(name) {
  const data = loadData();
  data.incomeSubCategories = data.incomeSubCategories.filter(item => item !== name);
  saveData(data);
}
