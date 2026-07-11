import { mountShell, formatMoney, parseAmount, setStatus } from './app.js';
import { loadData, upsertBudget, addIncomeSubCategory, upsertAccount, deleteBudget, deleteIncomeSubCategory, deleteAccount } from './store.js';

document.addEventListener("DOMContentLoaded", async () => {
  await mountShell("budget");
  document.getElementById("billsForm").addEventListener("submit", event => saveBudgetForm(event, "Bills"));
  document.getElementById("monthlyForm").addEventListener("submit", event => saveBudgetForm(event, "Monthly Expenses"));
  document.getElementById("incomeSubForm").addEventListener("submit", saveIncomeSubForm);
  document.getElementById("accountForm").addEventListener("submit", saveAccountForm);
  renderBudgetPage();
});

async function saveBudgetForm(event, mainCategory) {
  event.preventDefault();
  const prefix = mainCategory === "Bills" ? "bills" : "monthly";
  await upsertBudget({
    mainCategory,
    subCategory: document.getElementById(`${prefix}SubCategory`).value.trim(),
    amount: parseAmount(document.getElementById(`${prefix}Amount`).value)
  });
  event.target.reset();
  renderBudgetPage();
  setStatus("Category saved");
}

async function saveIncomeSubForm(event) {
  event.preventDefault();
  const name = document.getElementById("incomeSubCategory").value.trim();
  if (name) await addIncomeSubCategory(name);
  event.target.reset();
  renderBudgetPage();
  setStatus("Income sub category saved");
}

async function saveAccountForm(event) {
  event.preventDefault();
  await upsertAccount({
    name: document.getElementById("accountName").value.trim(),
    type: document.getElementById("accountType").value
  });
  event.target.reset();
  renderBudgetPage();
  setStatus("Account saved");
}

function renderBudgetPage() {
  const data = loadData();
  renderBudgetTable("billsTable", data.budgets.filter(item => item.mainCategory === "Bills"));
  renderBudgetTable("monthlyTable", data.budgets.filter(item => item.mainCategory === "Monthly Expenses"));
  renderIncomeSubTable(data.incomeSubCategories);
  renderAccountsTable(data.accounts);
}

function renderBudgetTable(tableId, budgets) {
  document.getElementById(tableId).innerHTML = `
    <tr><th>Sub Category</th><th>Monthly Amount</th><th></th></tr>
    ${budgets.map(item => `
      <tr>
        <td>${item.subCategory}</td>
        <td>${formatMoney(item.amount)}</td>
        <td><button class="danger-btn" onclick="removeBudget('${item.id}')">Delete</button></td>
      </tr>
    `).join("")}
  `;
}

function renderIncomeSubTable(incomeSubCategories) {
  document.getElementById("incomeSubTable").innerHTML = `
    <tr><th>Sub Category</th><th></th></tr>
    ${incomeSubCategories.map(item => `
      <tr>
        <td>${item}</td>
        <td><button class="danger-btn" onclick="removeIncomeSub('${item}')">Delete</button></td>
      </tr>
    `).join("")}
  `;
}

function renderAccountsTable(accounts) {
  document.getElementById("accountsTable").innerHTML = `
    <tr><th>Name</th><th>Type</th><th></th></tr>
    ${accounts.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.type}</td>
        <td><button class="danger-btn" onclick="removeAccount('${item.id}')">Delete</button></td>
      </tr>
    `).join("")}
  `;
}

async function removeBudget(id) {
  await deleteBudget(id);
  renderBudgetPage();
}

async function removeIncomeSub(name) {
  await deleteIncomeSubCategory(name);
  renderBudgetPage();
}

async function removeAccount(id) {
  await deleteAccount(id);
  renderBudgetPage();
}

// Bridge to window for inline onclick handlers
window.removeBudget = removeBudget;
window.removeIncomeSub = removeIncomeSub;
window.removeAccount = removeAccount;
