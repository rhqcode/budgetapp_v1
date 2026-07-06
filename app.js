import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as fbSignOut
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { loadData } from './store.js';
import { BUDGETAPP_FIREBASE_CONFIG, BUDGETAPP_SETTINGS } from './firebase-config.js';

export function formatMoney(value) {
  const { profile } = loadData();
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: profile.currency || "SGD",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

export function parseAmount(value) {
  return Math.abs(Number(value) || 0);
}

export function setStatus(message) {
  const status = document.getElementById("status");
  if (status) status.textContent = message;
}

function initShell(activePage, authResult) {
  document.querySelectorAll("[data-page]").forEach(link => {
    link.classList.toggle("active", link.dataset.page === activePage);
  });

  const data = loadData();
  const profileName = document.getElementById("profileName");

  if (authResult?.mode === "firebase") {
    if (profileName) profileName.textContent = authResult.user.displayName || "User";
    setStatus(`Signed in as ${authResult.user.email}`);
  } else {
    if (profileName) profileName.textContent = data.profile.displayName || "BudgetApp";
    setStatus("Demo storage active");
  }
}

async function initAuthGate() {
  const settings = BUDGETAPP_SETTINGS;
  if (!settings.enableFirebase) return { allowed: true, mode: "demo" };

  return new Promise((resolve) => {
    showAuthOverlay("loading");

    const app = initializeApp(BUDGETAPP_FIREBASE_CONFIG);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (settings.requireWhitelist) {
          try {
            const db = getFirestore(app);
            const snap = await getDoc(doc(db, "allowedUsers", user.email));
            if (!snap.exists() || snap.data().active !== true) {
              showAuthOverlay("denied", user.email);
              return;
            }
          } catch (err) {
            showAuthOverlay("error", null, err.message);
            return;
          }
        }
        hideAuthOverlay();
        resolve({ allowed: true, mode: "firebase", user });
      } else {
        showAuthOverlay("signin", null, null, () => {
          signInWithPopup(auth, provider).catch(err => {
            if (err.code !== "auth/popup-closed-by-user") {
              showAuthOverlay("error", null, err.message);
            }
          });
        });
      }
    });
  });
}

function showAuthOverlay(state, email, errorMessage, onSignIn) {
  let overlay = document.getElementById("authOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "authOverlay";
    document.body.appendChild(overlay);
  }

  let content = "";
  if (state === "loading") {
    content = `
      <div class="auth-card">
        <div class="auth-loader"></div>
        <p>Checking authentication...</p>
      </div>
    `;
  } else if (state === "signin") {
    content = `
      <div class="auth-card">
        <div class="auth-brand">BudgetApp</div>
        <p class="auth-desc">Sign in to manage your finances</p>
        <button class="auth-google-btn" id="googleSignInBtn">Sign in with Google</button>
      </div>
    `;
  } else if (state === "denied") {
    const supportEmail = BUDGETAPP_SETTINGS.sellerSupportEmail;
    content = `
      <div class="auth-card">
        <div class="auth-brand">BudgetApp</div>
        <p class="auth-error">Your account (${email || "unknown"}) is not authorized.</p>
        ${supportEmail ? `<p class="auth-desc">Contact <a href="mailto:${supportEmail}">${supportEmail}</a></p>` : ""}
      </div>
    `;
  } else if (state === "error") {
    content = `
      <div class="auth-card">
        <div class="auth-brand">BudgetApp</div>
        <p class="auth-error">${errorMessage || "Authentication error"}</p>
        <button class="auth-google-btn" onclick="location.reload()">Try Again</button>
      </div>
    `;
  }

  overlay.innerHTML = `<div class="auth-backdrop">${content}</div>`;
  overlay.style.display = "";

  if (state === "signin" && onSignIn) {
    document.getElementById("googleSignInBtn").addEventListener("click", onSignIn);
  }
}

function hideAuthOverlay() {
  const overlay = document.getElementById("authOverlay");
  if (overlay) overlay.style.display = "none";
}

export function getCategories(type = null) {
  const data = loadData();
  const categories = new Set(data.budgets.map(item => item.subCategory));
  data.transactions
    .filter(item => !type || item.type === type)
    .forEach(item => categories.add(item.subCategory));
  return Array.from(categories).sort();
}

export function getMainCategories(type = null) {
  if (type === "Income") return ["Income"];
  return ["Bills", "Monthly Expenses"];
}

export function getSubCategories(mainCategory) {
  const data = loadData();
  if (mainCategory === "Income") return [...data.incomeSubCategories].sort();
  return data.budgets
    .filter(item => item.mainCategory === mainCategory)
    .map(item => item.subCategory)
    .sort();
}

export function getAccounts() {
  return loadData().accounts.map(item => item.name).sort();
}

function shellMarkup(activePage, authResult) {
  const showSignOut = authResult?.mode === "firebase";
  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-mark">B</span>
        <div>
          <strong>BudgetApp</strong>
          <span id="profileName">Template</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <a href="index.html" data-page="dashboard">Dashboard</a>
        <a href="add-transaction.html" data-page="transaction">Add Transaction</a>
        <a href="budget.html" data-page="budget">Categories Setup</a>
      </nav>
      ${showSignOut ? '<button class="signout-btn" onclick="signOut()">Sign Out</button>' : ""}
      <p id="status" class="sidebar-status"></p>
    </aside>
  `;
}

export async function mountShell(activePage) {
  const authResult = await initAuthGate();
  if (!authResult.allowed) return;
  document.body.insertAdjacentHTML("afterbegin", shellMarkup(activePage, authResult));
  initShell(activePage, authResult);
  requestAnimationFrame(setupMobilePager);
}

function signOut() {
  const auth = getAuth();
  fbSignOut(auth).then(() => {
    window.location.reload();
  });
}

function setupMobilePager() {
  if (!window.matchMedia("(max-width: 860px)").matches) return;

  const main = document.querySelector(".main");
  if (!main || main.dataset.mobilePaged === "true") return;

  const topbar = main.querySelector(":scope > .topbar");
  const sourceNodes = Array.from(main.children).filter(node => node !== topbar);
  if (!sourceNodes.length) return;

  const pagerNav = document.createElement("div");
  pagerNav.className = "mobile-pager-nav";
  pagerNav.innerHTML = `
    <button type="button" id="mobilePrevBtn">Prev</button>
    <span id="mobilePageLabel">Section</span>
    <button type="button" id="mobileNextBtn">Next</button>
  `;

  const pagesWrap = document.createElement("div");
  pagesWrap.className = "mobile-pages";

  const pages = [];
  const deferredNotePages = [];
  const stickyFilterNodes = [];
  const addPage = (nodes, label) => {
    const page = document.createElement("section");
    page.className = "mobile-page";
    page.dataset.label = label || `Section ${pages.length + 1}`;
    nodes.forEach(node => page.appendChild(node));
    if (page.querySelector(".user-note-card") || page.matches(".user-note-card")) {
      deferredNotePages.push(page);
    } else {
      pagesWrap.appendChild(page);
      pages.push(page);
    }
  };

  for (let index = 0; index < sourceNodes.length; index += 1) {
    const node = sourceNodes[index];

    if (node.classList?.contains("filters")) {
      const grouped = [node];
      if (sourceNodes[index + 1]?.classList?.contains("filter-summary")) {
        grouped.push(sourceNodes[index + 1]);
        index += 1;
      }
      stickyFilterNodes.push(...grouped);
      continue;
    }

    if (node.classList?.contains("grid")) {
      Array.from(node.children).forEach(child => {
        addPage([child], getNodeLabel(child));
      });
      continue;
    }

    addPage([node], getNodeLabel(node));
  }

  deferredNotePages.forEach(page => {
    pagesWrap.appendChild(page);
    pages.push(page);
  });

  if (!pages.length) return;

  let pagerAnchor = topbar;
  if (stickyFilterNodes.length) {
    const stickyFilters = document.createElement("div");
    stickyFilters.className = "mobile-sticky-filters";
    stickyFilterNodes.forEach(node => stickyFilters.appendChild(node));
    if (topbar) topbar.insertAdjacentElement("afterend", stickyFilters);
    else main.prepend(stickyFilters);
    pagerAnchor = stickyFilters;
  }

  if (pagerAnchor) pagerAnchor.insertAdjacentElement("afterend", pagerNav);
  else main.prepend(pagerNav);
  main.appendChild(pagesWrap);
  main.dataset.mobilePaged = "true";

  const label = document.getElementById("mobilePageLabel");
  const prev = document.getElementById("mobilePrevBtn");
  const next = document.getElementById("mobileNextBtn");

  const getActiveIndex = () => Math.round(pagesWrap.scrollLeft / pagesWrap.clientWidth);
  const update = () => {
    const active = Math.max(0, Math.min(pages.length - 1, getActiveIndex()));
    label.textContent = `${active + 1}/${pages.length} ${pages[active].dataset.label}`;
    prev.disabled = active === 0;
    next.disabled = active === pages.length - 1;
  };

  const goTo = index => {
    const safeIndex = Math.max(0, Math.min(pages.length - 1, index));
    pagesWrap.scrollTo({ left: safeIndex * pagesWrap.clientWidth, behavior: "smooth" });
  };

  prev.addEventListener("click", () => goTo(getActiveIndex() - 1));
  next.addEventListener("click", () => goTo(getActiveIndex() + 1));
  pagesWrap.addEventListener("scroll", () => requestAnimationFrame(update));
  window.addEventListener("resize", update);
  update();
}

function getNodeLabel(node) {
  return (
    node.querySelector?.(".card-title")?.textContent ||
    node.querySelector?.(".kpi-label")?.textContent ||
    node.querySelector?.(".page-title")?.textContent ||
    "Section"
  ).trim();
}

// Bridge to window for inline onclick handlers
window.formatMoney = formatMoney;
window.parseAmount = parseAmount;
window.setStatus = setStatus;
window.getCategories = getCategories;
window.getMainCategories = getMainCategories;
window.getSubCategories = getSubCategories;
window.getAccounts = getAccounts;
window.signOut = signOut;
