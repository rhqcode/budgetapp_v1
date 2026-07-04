document.addEventListener("DOMContentLoaded", () => {
  mountShell("budget");
  document.getElementById("billsForm").addEventListener("submit", event => saveBudgetForm(event, "Bills"));
  document.getElementById("monthlyForm").addEventListener("submit", event => saveBudgetForm(event, "Monthly Expenses"));
  document.getElementById("incomeSubForm").addEventListener("submit", saveIncomeSubForm);
  renderBudgetPage();
});

function saveBudgetForm(event, mainCategory) {
  event.preventDefault();
  const prefix = mainCategory === "Bills" ? "bills" : "monthly";
  upsertBudget({
    mainCategory,
    subCategory: document.getElementById(`${prefix}SubCategory`).value.trim(),
    amount: parseAmount(document.getElementById(`${prefix}Amount`).value)
  });
  event.target.reset();
  renderBudgetPage();
  setStatus("Category saved");
}

function saveIncomeSubForm(event) {
  event.preventDefault();
  const name = document.getElementById("incomeSubCategory").value.trim();
  if (name) addIncomeSubCategory(name);
  event.target.reset();
  renderBudgetPage();
  setStatus("Income sub category saved");
}

function renderBudgetPage() {
  const data = loadData();
  renderBudgetTable("billsTable", data.budgets.filter(item => item.mainCategory === "Bills"));
  renderBudgetTable("monthlyTable", data.budgets.filter(item => item.mainCategory === "Monthly Expenses"));
  renderIncomeSubTable(data.incomeSubCategories);
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

function removeBudget(id) {
  deleteBudget(id);
  renderBudgetPage();
}

function removeIncomeSub(name) {
  deleteIncomeSubCategory(name);
  renderBudgetPage();
}
