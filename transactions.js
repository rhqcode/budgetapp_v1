import { mountShell, formatMoney, parseAmount, setStatus, getAccounts, getMainCategories, getSubCategories } from './app.js';
import { loadData, upsertTransaction, deleteTransaction } from './store.js';

let editingTransactionId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await mountShell("transaction");
  document.getElementById("txDate").value = new Date().toISOString().slice(0, 10);
  renderTransactionOptions();
  document.getElementById("txType").addEventListener("change", renderCategoryOptions);
  document.getElementById("txMainCategory").addEventListener("change", renderSubCategoryOptions);
  document.getElementById("transactionForm").addEventListener("submit", saveTransactionForm);
  document.getElementById("cancelEditBtn").addEventListener("click", resetTransactionForm);
  document.getElementById("transactionsTable").addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-transaction]");
    if (editButton) editTransaction(editButton.dataset.editTransaction);
    const deleteButton = event.target.closest("[data-delete-transaction]");
    if (deleteButton) removeTransaction(deleteButton.dataset.deleteTransaction);
  });
  renderTransactionsTable();
});

function renderTransactionOptions() {
  document.getElementById("txAccount").innerHTML = getAccounts()
    .map(account => `<option value="${account}">${account}</option>`)
    .join("");

  renderCategoryOptions();
}

function renderCategoryOptions() {
  const type = document.getElementById("txType").value;
  const mainCategory = document.getElementById("txMainCategory");
  mainCategory.innerHTML = getMainCategories(type)
    .map(category => `<option value="${category}">${category}</option>`)
    .join("");
  renderSubCategoryOptions();
}

function renderSubCategoryOptions() {
  const mainCategory = document.getElementById("txMainCategory").value;
  const subCategories = getSubCategories(mainCategory);
  document.getElementById("txSubCategory").innerHTML = subCategories
    .map(category => `<option value="${category}">${category}</option>`)
    .join("");
}

async function saveTransactionForm(event) {
  event.preventDefault();
  await upsertTransaction({
    ...(editingTransactionId ? { id: editingTransactionId } : {}),
    date: document.getElementById("txDate").value,
    type: document.getElementById("txType").value,
    mainCategory: document.getElementById("txMainCategory").value,
    subCategory: document.getElementById("txSubCategory").value,
    account: document.getElementById("txAccount").value,
    amount: parseAmount(document.getElementById("txAmount").value),
    description: document.getElementById("txDescription").value.trim()
  });

  const wasEditing = Boolean(editingTransactionId);
  resetTransactionForm();
  renderTransactionsTable();
  setStatus(wasEditing ? "Transaction updated" : "Transaction saved");
}

function resetTransactionForm() {
  editingTransactionId = null;
  document.getElementById("transactionForm").reset();
  document.getElementById("txDate").value = new Date().toISOString().slice(0, 10);
  renderTransactionOptions();
  document.getElementById("transactionFormTitle").textContent = "New transaction";
  document.getElementById("saveTransactionBtn").textContent = "Save Transaction";
  document.getElementById("cancelEditBtn").hidden = true;
}

function editTransaction(id) {
  const transaction = loadData().transactions.find(item => item.id === id);
  if (!transaction) return;

  editingTransactionId = id;
  document.getElementById("txDate").value = transaction.date;
  document.getElementById("txType").value = transaction.type;
  renderCategoryOptions();
  document.getElementById("txMainCategory").value = transaction.mainCategory;
  renderSubCategoryOptions();
  document.getElementById("txSubCategory").value = transaction.subCategory;
  document.getElementById("txAccount").value = transaction.account;
  document.getElementById("txAmount").value = transaction.amount;
  document.getElementById("txDescription").value = transaction.description || "";
  document.getElementById("transactionFormTitle").textContent = "Edit transaction";
  document.getElementById("saveTransactionBtn").textContent = "Update Transaction";
  document.getElementById("cancelEditBtn").hidden = false;
  const form = document.getElementById("transactionForm");
  if (!window.showMobilePageContaining?.(form)) {
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function removeTransaction(id) {
  const transaction = loadData().transactions.find(item => item.id === id);
  if (!transaction) return;
  if (!window.confirm(`Delete ${transaction.description || transaction.subCategory} transaction?`)) return;

  await deleteTransaction(id);
  if (editingTransactionId === id) resetTransactionForm();
  renderTransactionsTable();
  setStatus("Transaction deleted");
}

function renderTransactionsTable() {
  const transactions = [...loadData().transactions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  document.getElementById("transactionCount").textContent =
    `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

  const table = document.getElementById("transactionsTable");
  if (!transactions.length) {
    table.innerHTML = `<tr><td class="muted">No transactions yet.</td></tr>`;
    return;
  }

  table.innerHTML = `
    <tr><th>Date</th><th>Type</th><th>Main</th><th>Sub</th><th>Description</th><th>Account</th><th>Amount</th><th>Action</th></tr>
    ${transactions.map(item => `
      <tr>
        <td>${escapeHtml(item.date)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.mainCategory)}</td>
        <td>${escapeHtml(item.subCategory)}</td>
        <td>${escapeHtml(item.description || "")}</td>
        <td>${escapeHtml(item.account)}</td>
        <td class="${item.type === "Income" ? "positive" : "negative"}">${escapeHtml(formatMoney(item.amount))}</td>
        <td class="table-actions">
          <button class="ghost-btn table-action-btn" type="button" data-edit-transaction="${escapeHtml(item.id)}">Edit</button>
          <button class="danger-btn table-action-btn" type="button" data-delete-transaction="${escapeHtml(item.id)}">Delete</button>
        </td>
      </tr>
    `).join("")}
  `;
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
