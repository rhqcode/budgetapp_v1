import { mountShell, formatMoney, parseAmount, setStatus } from './app.js';
import { loadData, upsertBudget, addIncomeSubCategory, upsertAccount, deleteBudget, deleteIncomeSubCategory, deleteAccount } from './store.js';

const editingBudgetIds = { Bills: null, "Monthly Expenses": null };

document.addEventListener("DOMContentLoaded", async () => {
  await mountShell("budget");
  document.getElementById("billsForm").addEventListener("submit", event => saveBudgetForm(event, "Bills"));
  document.getElementById("monthlyForm").addEventListener("submit", event => saveBudgetForm(event, "Monthly Expenses"));
  document.getElementById("billsCancelBtn").addEventListener("click", () => resetBudgetForm("Bills"));
  document.getElementById("monthlyCancelBtn").addEventListener("click", () => resetBudgetForm("Monthly Expenses"));
  document.getElementById("incomeSubForm").addEventListener("submit", saveIncomeSubForm);
  document.getElementById("accountForm").addEventListener("submit", saveAccountForm);
  document.querySelector(".main").addEventListener("click", handleTableAction);
  renderBudgetPage();
});

async function saveBudgetForm(event, mainCategory) {
  event.preventDefault();
  const prefix = mainCategory === "Bills" ? "bills" : "monthly";
  await upsertBudget({
    ...(editingBudgetIds[mainCategory] ? { id: editingBudgetIds[mainCategory] } : {}),
    mainCategory,
    subCategory: document.getElementById(`${prefix}SubCategory`).value.trim(),
    amount: parseAmount(document.getElementById(`${prefix}Amount`).value)
  });
  const wasEditing = Boolean(editingBudgetIds[mainCategory]);
  resetBudgetForm(mainCategory);
  renderBudgetPage();
  setStatus(wasEditing ? "Preset updated" : "Preset saved");
}

function editBudget(id) {
  const item = loadData().budgets.find(budget => budget.id === id);
  if (!item) return;
  const prefix = item.mainCategory === "Bills" ? "bills" : "monthly";
  editingBudgetIds[item.mainCategory] = id;
  document.getElementById(`${prefix}SubCategory`).value = item.subCategory;
  document.getElementById(`${prefix}Amount`).value = item.amount;
  document.getElementById(`${prefix}SubmitBtn`).textContent = "Update Preset";
  document.getElementById(`${prefix}CancelBtn`).hidden = false;
  const form = document.getElementById(`${prefix}Form`);
  if (!window.showMobilePageContaining?.(form)) form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetBudgetForm(mainCategory) {
  const prefix = mainCategory === "Bills" ? "bills" : "monthly";
  editingBudgetIds[mainCategory] = null;
  document.getElementById(`${prefix}Form`).reset();
  document.getElementById(`${prefix}SubmitBtn`).textContent = mainCategory === "Bills"
    ? "Add Bill Category"
    : "Add Monthly Category";
  document.getElementById(`${prefix}CancelBtn`).hidden = true;
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
    <tr><th>Sub Category</th><th>Monthly Amount</th><th>Actions</th></tr>
    ${budgets.map(item => `
      <tr>
        <td>${escapeHtml(item.subCategory)}</td>
        <td>${escapeHtml(formatMoney(item.amount))}</td>
        <td class="table-actions">
          <button class="ghost-btn table-action-btn" type="button" data-edit-budget="${escapeHtml(item.id)}">Edit</button>
          <button class="danger-btn table-action-btn" type="button" data-delete-budget="${escapeHtml(item.id)}">Delete</button>
        </td>
      </tr>
    `).join("")}
  `;
}

function renderIncomeSubTable(incomeSubCategories) {
  document.getElementById("incomeSubTable").innerHTML = `
    <tr><th>Sub Category</th><th></th></tr>
    ${incomeSubCategories.map(item => `
      <tr>
        <td>${escapeHtml(item)}</td>
        <td><button class="danger-btn" type="button" data-delete-income="${escapeHtml(item)}">Delete</button></td>
      </tr>
    `).join("")}
  `;
}

function renderAccountsTable(accounts) {
  document.getElementById("accountsTable").innerHTML = `
    <tr><th>Name</th><th>Type</th><th></th></tr>
    ${accounts.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td><button class="danger-btn" type="button" data-delete-account="${escapeHtml(item.id)}">Delete</button></td>
      </tr>
    `).join("")}
  `;
}

async function removeBudget(id) {
  const item = loadData().budgets.find(budget => budget.id === id);
  if (!item || !window.confirm(`Delete the ${item.subCategory} preset?`)) return;
  await deleteBudget(id);
  if (editingBudgetIds[item.mainCategory] === id) resetBudgetForm(item.mainCategory);
  renderBudgetPage();
  setStatus("Preset deleted");
}

async function removeIncomeSub(name) {
  if (!window.confirm(`Delete the ${name} income category?`)) return;
  await deleteIncomeSubCategory(name);
  renderBudgetPage();
  setStatus("Income category deleted");
}

async function removeAccount(id) {
  const account = loadData().accounts.find(item => item.id === id);
  if (!account || !window.confirm(`Delete the ${account.name} account?`)) return;
  await deleteAccount(id);
  renderBudgetPage();
  setStatus("Account deleted");
}

function handleTableAction(event) {
  const editButton = event.target.closest("[data-edit-budget]");
  if (editButton) return editBudget(editButton.dataset.editBudget);
  const budgetButton = event.target.closest("[data-delete-budget]");
  if (budgetButton) return removeBudget(budgetButton.dataset.deleteBudget);
  const incomeButton = event.target.closest("[data-delete-income]");
  if (incomeButton) return removeIncomeSub(incomeButton.dataset.deleteIncome);
  const accountButton = event.target.closest("[data-delete-account]");
  if (accountButton) return removeAccount(accountButton.dataset.deleteAccount);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}
