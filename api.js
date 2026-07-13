const apiUrl = import.meta.env?.VITE_API_URL || "https://budgetapp-v1-backend.onrender.com";
const ID_TOKEN_KEY = "budgetapp_id_token";
const REFRESH_TOKEN_KEY = "budgetapp_refresh_token";

// localStorage is intentionally used here so a signed-in session is available
// to every tab on the same BudgetApp origin.
const getIdToken = () => localStorage.getItem(ID_TOKEN_KEY);
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

function migrateLegacySession() {
  const idToken = sessionStorage.getItem(ID_TOKEN_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (idToken && !getIdToken()) localStorage.setItem(ID_TOKEN_KEY, idToken);
  if (refreshToken && !getRefreshToken()) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  sessionStorage.removeItem(ID_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

migrateLegacySession();

function storeSession(session) {
  localStorage.setItem(ID_TOKEN_KEY, session.idToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

function clearSession() {
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ID_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function fetchApi(path, options = {}) {
  const token = getIdToken();
  return fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    signal: options.signal || AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) {
    clearSession();
    return false;
  }
  storeSession(await response.json());
  return true;
}

async function request(path, options = {}, allowRefresh = true) {
  let response;
  try {
    response = await fetchApi(path, options);
  } catch (cause) {
    const error = new Error("The secure sign-in service is waking up. Please try again in a moment.");
    error.cause = cause;
    throw error;
  }

  if (response.status === 401 && allowRefresh && await refreshSession()) {
    return request(path, options, false);
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `API request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function completeSignIn() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("auth_code");
  if (!code) return;

  url.searchParams.delete("auth_code");
  window.history.replaceState({}, "", url);
  const session = await request("/auth/exchange", {
    method: "POST",
    body: JSON.stringify({ code })
  }, false);
  storeSession(session);
}

export const getSignInUrl = () => `${apiUrl}/auth/google`;
export const getCurrentUser = () => request("/auth/me");
export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" }, false);
  } finally {
    clearSession();
  }
}
export const fetchUserData = () => request("/api/data");
export const putUserData = data => request("/api/data", {
  method: "PUT",
  body: JSON.stringify(data)
});
