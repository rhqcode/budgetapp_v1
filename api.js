const apiUrl = import.meta.env?.VITE_API_URL || "https://budgetapp-v1-backend.onrender.com";

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `API request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export const getSignInUrl = () => `${apiUrl}/auth/google`;
export const getCurrentUser = () => request("/auth/me");
export const logout = () => request("/auth/logout", { method: "POST" });
export const fetchUserData = () => request("/api/data");
export const putUserData = data => request("/api/data", {
  method: "PUT",
  body: JSON.stringify(data)
});
