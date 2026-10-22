const TOKEN_KEY = "oak.token";

// Storage can throw (private mode, blocked site data); the app must still work without it.
export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch { /* ignore */ }
  },
};

let token = storage.get(TOKEN_KEY);
let onUnauthorized = () => {};

export const getToken = () => token;

export const setToken = (value) => {
  token = value;
  storage.set(TOKEN_KEY, value);
};

export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the API running?");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // A 401 while holding a token means the session expired or the account is gone.
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  }
  return data;
}
