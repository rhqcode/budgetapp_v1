import { fetchUserData, putUserData } from "./api.js";

export const STORE_KEY = "budgetapp_v1_data";
let remoteEnabled = false;

const defaultData = {
  profile: {
    displayName: "BudgetApp User",
    currency: "SGD"
  },
  accounts: [
    { id: crypto.randomUUID(), name: "Main Bank", type: "Bank" },
    { id: crypto.randomUUID(), name: "Credit Card", type: "Credit Card" }
  ],
  budgets: [
    ...["Rent", "Utilities", "Phone", "Insurance", "Internet", "Subscriptions", "Gym", "Childcare", "Loan", "Taxes", "Medical Plan", "Storage"]
      .map(subCategory => ({ id: crypto.randomUUID(), mainCategory: "Bills", subCategory, amount: 0 })),
    ...["Food", "Transport", "Shopping", "Entertainment", "Dining Out", "Coffee", "Groceries", "Personal Care", "Healthcare", "Education", "Travel", "Gifts", "Pets", "Home Supplies", "Hobbies"]
      .map(subCategory => ({ id: crypto.randomUUID(), mainCategory: "Monthly Expenses", subCategory, amount: 0 }))
  ],
  incomeSubCategories: ["Salary", "Bonus", "Dividend", "Interest", "Side Income"],
  transactions: []
};

export function loadData() {
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

export async function syncRemoteData() {
  const remoteData = await fetchUserData();
  const hadLegacyDemoData = hasLegacyDemoData(remoteData);
  const needsSeeding = !remoteData.accounts?.length || !remoteData.budgets?.length;

  if (hadLegacyDemoData) {
    remoteData.accounts = [];
    remoteData.budgets = [];
    remoteData.transactions = [];
    delete remoteData.profile.demoDataVersion;
    if (remoteData.profile.displayName === "Demo User") {
      remoteData.profile.displayName = "BudgetApp User";
    }
  }

  const data = normalizeData(remoteData);
  remoteEnabled = true;
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  if (hadLegacyDemoData || needsSeeding) await putUserData(data);
  return data;
}

function hasLegacyDemoData(data) {
  if (Number(data?.profile?.demoDataVersion) > 0) return true;

  const transactions = Array.isArray(data?.transactions) ? data.transactions : [];
  if (transactions.length < 240) return false;

  const descriptions = new Set(transactions.map(item => item.description));
  const demoDescriptions = [
    "Rent payment",
    "Broadband bill",
    "Performance bonus",
    "Dividend payout",
    "Bank interest",
    "Freelance work"
  ];
  return demoDescriptions.every(description => descriptions.has(description));
}

function normalizeData(data) {
  data.profile = data.profile || { displayName: "BudgetApp User", currency: "SGD" };
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

  if (!data.accounts.length) {
    data.accounts = [
      { id: crypto.randomUUID(), name: "Main Bank", type: "Bank" },
      { id: crypto.randomUUID(), name: "Credit Card", type: "Credit Card" }
    ];
  }
  if (!data.budgets.length) {
    data.budgets = [
      ...["Rent", "Utilities", "Phone", "Insurance", "Internet", "Subscriptions", "Gym", "Childcare", "Loan", "Taxes", "Medical Plan", "Storage"]
        .map(subCategory => ({ id: crypto.randomUUID(), mainCategory: "Bills", subCategory, amount: 0 })),
      ...["Food", "Transport", "Shopping", "Entertainment", "Dining Out", "Coffee", "Groceries", "Personal Care", "Healthcare", "Education", "Travel", "Gifts", "Pets", "Home Supplies", "Hobbies"]
        .map(subCategory => ({ id: crypto.randomUUID(), mainCategory: "Monthly Expenses", subCategory, amount: 0 }))
    ];
  }

  return data;
}

export async function saveData(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  if (remoteEnabled) await putUserData(data);
}

export async function upsertTransaction(transaction) {
  const data = loadData();
  const existing = transaction.id
    ? data.transactions.find(item => item.id === transaction.id)
    : null;
  const normalized = {
    ...transaction,
    amount: Number(transaction.amount) || 0
  };

  if (existing) Object.assign(existing, normalized);
  else data.transactions.unshift({ id: crypto.randomUUID(), ...normalized });
  await saveData(data);
}

export async function upsertAccount(account) {
  const data = loadData();
  const existing = data.accounts.find(item => item.id === account.id);
  if (existing) Object.assign(existing, account);
  else data.accounts.push({ id: crypto.randomUUID(), ...account });
  await saveData(data);
}

export async function deleteAccount(id) {
  const data = loadData();
  data.accounts = data.accounts.filter(item => item.id !== id);
  await saveData(data);
}

export async function upsertBudget(budget) {
  const data = loadData();
  const existing = data.budgets.find(item => item.id === budget.id);
  if (existing) Object.assign(existing, budget);
  else data.budgets.push({ id: crypto.randomUUID(), ...budget });
  await saveData(data);
}

export async function deleteBudget(id) {
  const data = loadData();
  data.budgets = data.budgets.filter(item => item.id !== id);
  await saveData(data);
}

export async function addIncomeSubCategory(name) {
  const data = loadData();
  if (!data.incomeSubCategories.some(item => item.toLowerCase() === name.toLowerCase())) {
    data.incomeSubCategories.push(name);
    data.incomeSubCategories.sort();
  }
  await saveData(data);
}

export async function deleteIncomeSubCategory(name) {
  const data = loadData();
  data.incomeSubCategories = data.incomeSubCategories.filter(item => item !== name);
  await saveData(data);
}

// Bridge to window for inline onclick handlers
window.loadData = loadData;
window.saveData = saveData;
window.upsertTransaction = upsertTransaction;
window.upsertAccount = upsertAccount;
window.deleteAccount = deleteAccount;
window.upsertBudget = upsertBudget;
window.deleteBudget = deleteBudget;
window.addIncomeSubCategory = addIncomeSubCategory;
window.deleteIncomeSubCategory = deleteIncomeSubCategory;
