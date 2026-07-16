import { mountShell, setStatus } from './app.js';
import { loadData, upsertAccount, deleteAccount } from './store.js';

document.addEventListener("DOMContentLoaded", async () => {
  await mountShell("accounts");
  document.getElementById("accountForm").addEventListener("submit", saveAccountForm);
  renderAccountsPage();
});

async function saveAccountForm(event) {
  event.preventDefault();
  try {
    await upsertAccount({
      name: document.getElementById("accountName").value.trim(),
      type: document.getElementById("accountType").value
    });
  } catch (error) {
    setStatus(error.message);
    return;
  }
  event.target.reset();
  renderAccountsPage();
  setStatus("Account saved");
}

function renderAccountsPage() {
  const data = loadData();
  document.getElementById("accountsTable").innerHTML = `
    <tr><th>Name</th><th>Type</th><th></th></tr>
    ${data.accounts.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td><button class="danger-btn" data-delete-account="${escapeHtml(item.id)}">Delete</button></td>
      </tr>
    `).join("")}
  `;
  document.querySelectorAll("[data-delete-account]").forEach(button => {
    button.addEventListener("click", () => removeAccount(button.dataset.deleteAccount));
  });
}

async function removeAccount(id) {
  try {
    await deleteAccount(id);
  } catch (error) {
    setStatus(error.message);
    return;
  }
  renderAccountsPage();
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

// Bridge to window for inline onclick handlers
window.removeAccount = removeAccount;
