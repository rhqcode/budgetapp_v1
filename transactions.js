document.addEventListener("DOMContentLoaded", () => {
  mountShell("transaction");
  document.getElementById("txDate").value = new Date().toISOString().slice(0, 10);
  renderTransactionOptions();
  document.getElementById("txType").addEventListener("change", renderCategoryOptions);
  document.getElementById("txMainCategory").addEventListener("change", renderSubCategoryOptions);
  document.getElementById("transactionForm").addEventListener("submit", saveTransactionForm);
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

function saveTransactionForm(event) {
  event.preventDefault();
  upsertTransaction({
    date: document.getElementById("txDate").value,
    type: document.getElementById("txType").value,
    mainCategory: document.getElementById("txMainCategory").value,
    subCategory: document.getElementById("txSubCategory").value,
    account: document.getElementById("txAccount").value,
    amount: parseAmount(document.getElementById("txAmount").value),
    description: document.getElementById("txDescription").value.trim()
  });

  document.getElementById("transactionForm").reset();
  document.getElementById("txDate").value = new Date().toISOString().slice(0, 10);
  renderTransactionOptions();
  setStatus("Transaction saved");
}
