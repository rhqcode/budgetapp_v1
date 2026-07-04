document.addEventListener("DOMContentLoaded", () => {
  mountShell("accounts");
  document.getElementById("accountForm").addEventListener("submit", saveAccountForm);
  renderAccountsPage();
});

function saveAccountForm(event) {
  event.preventDefault();
  upsertAccount({
    name: document.getElementById("accountName").value.trim(),
    type: document.getElementById("accountType").value
  });
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
        <td>${item.name}</td>
        <td>${item.type}</td>
        <td><button class="danger-btn" onclick="removeAccount('${item.id}')">Delete</button></td>
      </tr>
    `).join("")}
  `;
}

function removeAccount(id) {
  deleteAccount(id);
  renderAccountsPage();
}
