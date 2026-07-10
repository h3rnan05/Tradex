const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("tradex_token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = "Ocurrio un error inesperado";
    try {
      const body = await res.json();
      const raw = body.detail;
      if (typeof raw === "string") {
        detail = raw;
      } else if (Array.isArray(raw)) {
        // FastAPI validation errors come as [{ loc, msg, type }, ...]
        detail = raw
          .map((e) => (typeof e === "string" ? e : e?.msg))
          .filter(Boolean)
          .join(". ") || detail;
      } else if (raw && typeof raw === "object" && typeof raw.msg === "string") {
        detail = raw.msg;
      }
    } catch {
      // respuesta sin cuerpo JSON
    }
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("tradex_token");
      localStorage.removeItem("tradex_session");
      document.cookie = "tradex_session=; path=/; max-age=0; SameSite=Strict";
      window.location.href = "/login";
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  async download(path: string, filename: string) {
    const token = typeof window !== "undefined" ? localStorage.getItem("tradex_token") : null;
    const res = await fetch(`${API_URL}${path}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new ApiError("Error al descargar el archivo", res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
