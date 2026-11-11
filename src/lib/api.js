import axios from "axios";

export const BASE = "";
export const api = axios.create({ baseURL: `/api`, withCredentials: true });

let activeTabUserId = null;

export function setAuthUserId(uid) {
  activeTabUserId = uid || null;
  try {
    if (uid) {
      sessionStorage.setItem("circle_active_user_id", uid);
    } else {
      sessionStorage.removeItem("circle_active_user_id");
    }
  } catch {}
}

export function getAuthUserId() {
  if (activeTabUserId) return activeTabUserId;
  try {
    const tabUid = sessionStorage.getItem("circle_active_user_id");
    if (tabUid) {
      activeTabUserId = tabUid;
      return tabUid;
    }
    const tabSess = sessionStorage.getItem("circle_tab_session_cache");
    if (tabSess) {
      const parsed = JSON.parse(tabSess);
      if (parsed?.user?.user_id) {
        activeTabUserId = parsed.user.user_id;
        return activeTabUserId;
      }
    }
    const cached = localStorage.getItem("circle_session_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.user?.user_id) {
        activeTabUserId = parsed.user.user_id;
        return activeTabUserId;
      }
    }
  } catch {}
  return null;
}

api.interceptors.request.use((config) => {
  const uid = getAuthUserId();
  if (uid) {
    config.headers = config.headers || {};
    config.headers["x-user-id"] = uid;
  }
  return config;
});

export const fileUrl = (id) => (id ? `/api/files/${id}` : "");
export const wsUrl = () => {
  const uid = getAuthUserId();
  const base = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
  return uid ? `${base}?user_id=${encodeURIComponent(uid)}` : base;
};

export function errMsg(e, fallback = "Something went wrong") {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
  return e?.message || fallback;
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/upload", fd);
  return data;
}

export async function downloadFrom(path, params, filename) {
  const res = await api.get(path, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return res;
}
