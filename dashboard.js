import { mountShell, formatMoney, getAccounts, getSubCategories, getMainCategories } from './app.js';
import { loadData } from './store.js';

let monthlyChart = null;
let categoryChart = null;
let historicalChart = null;
let budgetChart = null;
let selectedMainCategories = [];
let selectedSubCategories = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (window.ChartDataLabels) Chart.register(ChartDataLabels);
  await mountShell("dashboard");
  populateDashboardFilters();
  ["fromDate", "toDate", "accountFilter"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderDashboard);
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".filter-dropdown")) closeFilterMenus();
  });
  renderDashboard();
});

function populateDashboardFilters() {
  const accountFilter = document.getElementById("accountFilter");

  renderCheckboxMenu("mainCategoryMenu", ["Bills", "Monthly Expenses", "Income"], selectedMainCategories, "toggleMainCategory");
  populateSubCategoryFilter();

  accountFilter.innerHTML = `<option value="">All accounts</option>` +
    getAccounts().map(item => `<option value="${item}">${item}</option>`).join("");
  updateFilterLabels();
}

function populateSubCategoryFilter() {
  const mainCategories = selectedMainCategories.length
    ? selectedMainCategories
    : ["Bills", "Monthly Expenses", "Income"];
  const subCategories = Array.from(new Set(mainCategories.flatMap(category => getSubCategories(category)))).sort();
  selectedSubCategories = selectedSubCategories.filter(item => subCategories.includes(item));
  renderCheckboxMenu("categoryMenu", subCategories, selectedSubCategories, "toggleSubCategory");
  updateFilterLabels();
}

function renderCheckboxMenu(menuId, options, selectedValues, handlerName) {
  const selected = new Set(selectedValues);
  document.getElementById(menuId).innerHTML = options
    .map(item => `
      <label class="filter-option">
        <input type="checkbox" value="${item}" ${selected.has(item) ? "checked" : ""} onchange="${handlerName}(this.value, this.checked)">
        <span>${item}</span>
      </label>
    `)
    .join("");
}

function toggleFilterMenu(menuId) {
  const menu = document.getElementById(menuId);
  const willOpen = !menu.classList.contains("open");
  closeFilterMenus();
  menu.classList.toggle("open", willOpen);
}

function closeFilterMenus() {
  document.querySelectorAll(".filter-menu.open").forEach(menu => menu.classList.remove("open"));
}

function toggleMainCategory(value, checked) {
  selectedMainCategories = checked
    ? [...selectedMainCategories, value]
    : selectedMainCategories.filter(item => item !== value);
  populateSubCategoryFilter();
  renderDashboard();
}

function toggleSubCategory(value, checked) {
  selectedSubCategories = checked
    ? [...selectedSubCategories, value]
    : selectedSubCategories.filter(item => item !== value);
  updateFilterLabels();
  renderDashboard();
}

function summarizeSelection(values, allLabel, singularLabel) {
  if (!values.length) return allLabel;
  if (values.length === 1) return values[0];
  return `${values.length} ${singularLabel} selected`;
}

function updateFilterLabels() {
  document.getElementById("mainCategoryFilterLabel").textContent =
    summarizeSelection(selectedMainCategories, "All main categories", "main categories");
  document.getElementById("categoryFilterLabel").textContent =
    summarizeSelection(selectedSubCategories, "All sub categories", "sub categories");

  const summaryParts = [];
  if (selectedMainCategories.length) summaryParts.push(`Main: ${selectedMainCategories.join(", ")}`);
  if (selectedSubCategories.length) summaryParts.push(`Sub: ${selectedSubCategories.join(", ")}`);
  document.getElementById("filterSummary").textContent = summaryParts.length
    ? summaryParts.join(" | ")
    : "No category filters selected";
}

function clearDashboardFilters() {
  ["fromDate", "toDate", "accountFilter"].forEach(id => {
    document.getElementById(id).value = "";
  });
  selectedMainCategories = [];
  selectedSubCategories = [];
  renderCheckboxMenu("mainCategoryMenu", ["Bills", "Monthly Expenses", "Income"], selectedMainCategories, "toggleMainCategory");
  populateSubCategoryFilter();
  updateFilterLabels();
  renderDashboard();
}

function getFilteredTransactions() {
  const data = loadData();
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const account = document.getElementById("accountFilter").value;

  return data.transactions.filter(item => {
    if (from && item.date < from) return false;
    if (to && item.date > to) return false;
    if (selectedMainCategories.length && !selectedMainCategories.includes(item.mainCategory)) return false;
    if (selectedSubCategories.length && !selectedSubCategories.includes(item.subCategory)) return false;
    if (account && item.account !== account) return false;
    return true;
  });
}

function renderDashboard() {
  const allRows = getFilteredTransactions();
  const income = allRows.filter(item => item.type === "Income");
  const expenses = allRows.filter(item => item.type === "Expense");

  const incomeTotal = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById("incomeTotal").textContent = formatMoney(incomeTotal);
  document.getElementById("expenseTotal").textContent = formatMoney(expenseTotal);
  document.getElementById("netTotal").textContent = formatMoney(incomeTotal - expenseTotal);

  renderMonthlyChart(allRows);
  renderCategoryChart(expenses);
  renderCategoryTextBreakdown(expenses);
  renderHistoricalChart(allRows);
  renderBudgetDashboard();
  renderRecentTransactions(allRows);
}

function groupByMonth(rows) {
  return rows.reduce((map, item) => {
    const key = item.date.slice(0, 7);
    map[key] = (map[key] || 0) + Number(item.amount);
    return map;
  }, {});
}

function groupByCategory(rows) {
  return rows.reduce((map, item) => {
    map[item.subCategory] = (map[item.subCategory] || 0) + Number(item.amount);
    return map;
  }, {});
}

function renderMonthlyChart(rows) {
  const grouped = rows.reduce((map, item) => {
    const key = item.date.slice(0, 7);
    map[key] = map[key] || 0;
    map[key] += item.type === "Income" ? Number(item.amount) : -Number(item.amount);
    return map;
  }, {});
  const labels = Object.keys(grouped).sort();
  const data = labels.map(label => grouped[label]);
  const ctx = document.getElementById("monthlyChart");

  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.map(formatMonthLabel),
      datasets: [{
        label: "Net Cashflow",
        data,
        backgroundColor: data.map(value => value >= 0 ? "#6e9478" : "#ce7b62"),
        borderRadius: 6
      }]
    },
    options: chartOptions()
  });
}

function renderHistoricalChart(rows) {
  const monthly = rows.reduce((map, item) => {
    const month = item.date.slice(0, 7);
    map[month] = map[month] || { Income: 0, Expense: 0 };
    map[month][item.type] += Number(item.amount);
    return map;
  }, {});
  const currentMonth = getLocalMonthKey();
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  if ((!from || from.slice(0, 7) <= currentMonth) && (!to || to.slice(0, 7) >= currentMonth)) {
    monthly[currentMonth] ||= { Income: 0, Expense: 0 };
  }
  const populatedMonths = Object.keys(monthly).sort();
  const monthKeys = populatedMonths.length
    ? getMonthRange(populatedMonths[0], populatedMonths.at(-1))
    : [];
  monthKeys.forEach(month => {
    monthly[month] ||= { Income: 0, Expense: 0 };
  });

  if (historicalChart) historicalChart.destroy();
  historicalChart = new Chart(document.getElementById("historicalChart"), {
    type: "line",
    data: {
      labels: monthKeys.map(formatMonthLabel),
      datasets: [
        {
          label: "Income",
          data: monthKeys.map(label => monthly[label].Income),
          borderColor: "#6e9478",
          backgroundColor: "rgba(110, 148, 120, 0.14)",
          tension: 0.3,
          fill: true
        },
        {
          label: "Expenses",
          data: monthKeys.map(label => monthly[label].Expense),
          borderColor: "#ce7b62",
          backgroundColor: "rgba(206, 123, 98, 0.14)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: chartOptions()
  });
}

function renderBudgetDashboard() {
  const data = loadData();
  const month = getLocalMonthKey();
  const spentByCategory = data.transactions
    .filter(item => item.type === "Expense" && item.date.slice(0, 7) === month)
    .reduce((map, item) => {
      const key = `${item.mainCategory}|${item.subCategory}`;
      map[key] = (map[key] || 0) + Number(item.amount);
      return map;
    }, {});

  const labels = data.budgets.map(item => item.subCategory);
  const budgetValues = data.budgets.map(item => Number(item.amount));
  const spentValues = data.budgets.map(item => spentByCategory[`${item.mainCategory}|${item.subCategory}`] || 0);

  if (budgetChart) budgetChart.destroy();
  budgetChart = new Chart(document.getElementById("budgetChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Budget", data: budgetValues, backgroundColor: "#d1ad59", borderRadius: 8 },
        { label: "Spent", data: spentValues, backgroundColor: "#b95735", borderRadius: 8 }
      ]
    },
    options: chartOptions()
  });

  document.getElementById("budgetBalanceTable").innerHTML = `
    <tr><th>Main</th><th>Sub</th><th>Budget</th><th>Spent</th><th>Left</th></tr>
    ${data.budgets.map(item => {
      const spent = spentByCategory[`${item.mainCategory}|${item.subCategory}`] || 0;
      return `
        <tr>
          <td data-label="Main">${item.mainCategory}</td>
          <td data-label="Sub">${item.subCategory}</td>
          <td data-label="Budget">${formatMoney(item.amount)}</td>
          <td data-label="Spent">${formatMoney(spent)}</td>
          <td data-label="Left" class="${item.amount - spent >= 0 ? "positive" : "negative"}">${formatMoney(item.amount - spent)}</td>
        </tr>
      `;
    }).join("")}
  `;
}

function renderCategoryChart(rows) {
  const breakdown = buildCategoryBreakdown(rows);
  const labels = breakdown.map(item => item.label);
  const data = breakdown.map(item => item.absoluteAmount);
  const total = data.reduce((sum, value) => sum + value, 0);
  const ctx = document.getElementById("categoryChart");

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ["#b95735", "#6e9478", "#d1ad59", "#ce7b62", "#8e7661", "#76929a"]
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        datalabels: {
          color: "#fff",
          font: { weight: "700", size: 11 },
          formatter: value => {
            const share = total ? value / total * 100 : 0;
            return share >= 6 ? `${share.toFixed(0)}%` : "";
          }
        },
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatMoney(ctx.raw)}` } }
      }
    }
  });
}

function buildCategoryBreakdown(rows) {
  const grouped = rows.reduce((map, item) => {
    const key = item.subCategory;
    if (!map[key]) {
      map[key] = {
        label: item.subCategory,
        mainCategories: new Set(),
        amount: 0,
        rows: []
      };
    }
    map[key].mainCategories.add(item.mainCategory);
    map[key].amount += Number(item.amount);
    map[key].rows.push(item);
    return map;
  }, {});

  return Object.values(grouped)
    .map(item => {
      const categoryRows = item.rows;
      return {
        label: item.label,
        amount: item.amount,
        absoluteAmount: item.amount,
        count: categoryRows.length,
        mainCategories: Array.from(item.mainCategories),
        avg: categoryRows.length ? item.amount / categoryRows.length : 0
      };
    })
    .sort((a, b) => b.absoluteAmount - a.absoluteAmount);
}

function renderCategoryTextBreakdown(rows) {
  const breakdown = buildCategoryBreakdown(rows);
  const total = breakdown.reduce((sum, item) => sum + item.absoluteAmount, 0);
  const list = document.getElementById("categoryTextBreakdown");

  if (!breakdown.length) {
    list.innerHTML = `<p class="muted">No spending data for the selected filters.</p>`;
    return;
  }

  const top = breakdown[0];
  const expenseTotal = rows.reduce((sum, item) => sum + Number(item.amount), 0);
  const avgCategorySpend = breakdown.length ? expenseTotal / breakdown.length : 0;
  const topShare = total ? top.absoluteAmount / total * 100 : 0;

  list.innerHTML = `
    <div class="insight-summary">
      <strong>${top.label}</strong>
      <span>Largest spending category at ${formatMoney(top.absoluteAmount)}, making up ${topShare.toFixed(1)}% of selected expenses.</span>
    </div>
    <div class="insight-mini-grid">
      <div><span>Spending Cats</span><strong>${breakdown.length}</strong></div>
      <div><span>Total Spend</span><strong class="negative">${formatMoney(expenseTotal)}</strong></div>
      <div><span>Avg / Cat</span><strong>${formatMoney(avgCategorySpend)}</strong></div>
    </div>
  ` + breakdown.slice(0, 8).map(item => {
    const share = total ? Math.round(item.absoluteAmount / total * 100) : 0;
    const isFixed = item.mainCategories.includes("Bills");
    const categoryType = isFixed ? "Fixed bill" : "Flexible spend";
    return `
      <div class="category-text-row">
        <div>
          <strong>${item.label}</strong>
          <span>${categoryType} | ${share}% share | ${item.count} entries | Avg ${formatMoney(item.avg)}</span>
        </div>
        <em class="negative">${formatMoney(item.amount)}</em>
      </div>
    `;
  }).join("");
}

function chartOptions() {
  return {
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: value => formatMoney(value) },
        grid: { color: "#edf0f5" }
      },
      x: { grid: { display: false } }
    },
    plugins: {
      datalabels: { display: false },
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => formatMoney(ctx.raw) } }
    }
  };
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-SG", {
    month: "short",
    year: "2-digit"
  });
}

function getLocalMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(first, last) {
  const [firstYear, firstMonth] = first.split("-").map(Number);
  const [lastYear, lastMonth] = last.split("-").map(Number);
  const cursor = new Date(firstYear, firstMonth - 1, 1);
  const end = new Date(lastYear, lastMonth - 1, 1);
  const months = [];
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function renderRecentTransactions(rows) {
  const sortedRows = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const table = document.getElementById("recentTransactionsTable");
  table.innerHTML = `
    <tr><th>Date</th><th>Type</th><th>Main</th><th>Sub</th><th>Description</th><th>Account</th><th>Amount</th></tr>
    ${sortedRows.map(item => `
      <tr>
        <td>${item.date}</td>
        <td>${item.type}</td>
        <td>${item.mainCategory}</td>
        <td>${item.subCategory}</td>
        <td>${item.description || ""}</td>
        <td>${item.account}</td>
        <td class="${item.type === "Income" ? "positive" : "negative"}">${formatMoney(item.amount)}</td>
      </tr>
    `).join("")}
  `;
}

// Bridge to window for inline onclick handlers
window.toggleFilterMenu = toggleFilterMenu;
window.toggleMainCategory = toggleMainCategory;
window.toggleSubCategory = toggleSubCategory;
window.clearDashboardFilters = clearDashboardFilters;
