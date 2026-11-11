import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, wsUrl, fileUrl, setAuthUserId } from "../lib/api";
import { applyTheme, buildTheme } from "../lib/theme";
import { getTranslation } from "../lib/i18n";
import { playSound } from "../lib/sound";
import { hydrateConversationsCache, upsertConversationInCache, appendMessageToCache, updateMessageInCache, clearChatCache } from "../pages/chat/ChatView";
import { hydratePostsCache } from "../pages/Beranda";
import { hydrateGroupsCache, upsertGroupInCache } from "../pages/Groups";
import { setCachedDriveShortcuts } from "../data/initialDriveShortcuts";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const DEFAULT_USERS = [
  { user_id: "user_admin1", name: "Admin ASLI RI", email: "admin@asliri.local", role: "super_admin", job_title: "Super Admin", department: "Management", org_unit_id: "unit_mgmt", manager_id: "user_superadmin_saeful", status: "active", online: true, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { user_id: "user_superadmin_saeful", name: "Saeful", email: "saeful@asliri.id", role: "super_admin", job_title: "Super Administrator", department: "Management", org_unit_id: "unit_mgmt", manager_id: null, status: "active", online: true, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" }
];

try {
  if (typeof window !== "undefined" && localStorage.getItem("circle_prod_clean_v5") !== "1") {
    const keysToClear = [
      "circle_tasks_cache",
      "circle_cache_tasks",
      "circle_users_cache",
      "circle_projects_cache",
      "circle_groups_cache",
      "circle_cache_posts",
      "circle_cache_meetings",
      "circle_cache_conversations",
      "circle_convs_cache",
      "circle_drive_shortcuts_cache",
      "circle_stats_team_cache",
      "circle_stats_team_cache_7d",
      "circle_stats_team_cache_4w",
      "circle_org_units_cache",
      "circle_admin_divisions",
      "circle_admin_users",
      "circle_boards_cache",
      "circle_notifications_cache",
      "circle_session_cache"
    ];
    keysToClear.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("circle_prod_clean_v5", "1");
  }
} catch {}

export function AppProvider({ children }) {
  const [session, setSessionState] = useState(() => {
    try {
      const tabCached = sessionStorage.getItem("circle_tab_session_cache");
      const cached = tabCached || localStorage.getItem("circle_session_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.user?.user_id) {
          setAuthUserId(parsed.user.user_id);
          return parsed;
        }
      }
    } catch {}
    setAuthUserId(null);
    return null;
  });

  const setSession = useCallback((updater) => {
    setSessionState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const prevUid = prev?.user?.user_id || null;
      const nextUid = next?.user?.user_id || null;

      if (prevUid !== nextUid) {
        clearChatCache();
        try {
          localStorage.removeItem("circle_convs_cache");
          localStorage.removeItem("circle_cache_conversations");
        } catch {}
      }

      setAuthUserId(nextUid);

      try {
        if (next && nextUid) {
          const serialized = JSON.stringify(next);
          sessionStorage.setItem("circle_tab_session_cache", serialized);
          localStorage.setItem("circle_session_cache", serialized);
        } else {
          sessionStorage.removeItem("circle_tab_session_cache");
          localStorage.removeItem("circle_session_cache");
        }
      } catch {}

      return next;
    });
  }, []);

  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem("circle_users_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_USERS;
  });
  const [labels, setLabels] = useState(() => {
    try {
      const cached = localStorage.getItem("circle_labels_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: "lbl_1", name: "Priority", color: "#FF5364" },
      { id: "lbl_2", name: "Engineering", color: "#3B82F6" },
      { id: "lbl_3", name: "Design", color: "#8B5CF6" }
    ];
  });
  const [online, setOnline] = useState(() => new Set(DEFAULT_USERS.map((u) => u.user_id)));
  const [unread, setUnread] = useState(0);
  const [themeDraft, setThemeDraft] = useState(null);
  const [topNotif, setTopNotif] = useState(null);
  const subs = useRef(new Set());
  const sock = useRef(null);

  const me = session?.user;
  const ws = session?.workspace;
  const prefs = useMemo(() => session?.prefs || {}, [session?.prefs]);

  const loadAll = useCallback(async () => {
    if (!me?.user_id) return;
    const currentUid = me.user_id;
    const [u, l, n, c, t, ds, p, tr, g] = await Promise.all([
      api.get("/users").catch(() => ({ data: null })),
      api.get("/labels").catch(() => ({ data: null })),
      api.get("/notifications").catch(() => ({ data: null })),
      api.get("/conversations").catch(() => ({ data: null })),
      api.get("/tasks").catch(() => ({ data: null })),
      api.get("/drive-shortcuts").catch(() => ({ data: null })),
      api.get("/posts").catch(() => ({ data: null })),
      api.get("/posts/trending").catch(() => ({ data: null })),
      api.get("/groups/browse").catch(() => ({ data: null }))
    ]);
    if (Array.isArray(u.data) && u.data.length > 0) {
      setUsers(u.data);
      setOnline(new Set(u.data.filter((x) => x.online).map((x) => x.user_id)));
      try { localStorage.setItem("circle_users_cache", JSON.stringify(u.data)); } catch {}
    }
    if (Array.isArray(l.data)) {
      setLabels(l.data);
      try { localStorage.setItem("circle_labels_cache", JSON.stringify(l.data)); } catch {}
    }
    if (n.data) {
      setUnread(n.data.unread || 0);
      try { localStorage.setItem(`circle_notifications_cache_${currentUid}`, JSON.stringify(n.data)); } catch {}
    }
    if (Array.isArray(c.data)) {
      hydrateConversationsCache(c.data, currentUid);
      try { localStorage.setItem(`circle_convs_cache_${currentUid}`, JSON.stringify(c.data)); } catch {}
    }
    if (Array.isArray(t.data)) {
      try {
        localStorage.setItem("circle_tasks_cache", JSON.stringify(t.data));
        localStorage.setItem("circle_cache_tasks", JSON.stringify(t.data));
      } catch {}
    }
    if (Array.isArray(ds.data)) {
      setCachedDriveShortcuts(ds.data);
    }
    if (Array.isArray(p.data) || Array.isArray(tr.data)) {
      hydratePostsCache(Array.isArray(p.data) ? p.data : undefined, Array.isArray(tr.data) ? tr.data : undefined);
    }
    if (Array.isArray(g.data) && g.data.length > 0) {
      hydrateGroupsCache(g.data);
    }
  }, [me?.user_id]);

  const checkAuth = useCallback(async () => {
    let cachedPrefs = {};
    try {
      cachedPrefs = JSON.parse(localStorage.getItem("circle_user_prefs") || "{}");
    } catch {}
    try {
      const { data } = await api.get("/auth/me");
      const mergedPrefs = { ...cachedPrefs, ...(data.prefs || {}) };
      const nextSession = { user: data.user, workspace: data.workspace, prefs: mergedPrefs };
      setSession(nextSession);
      if (Array.isArray(data.users) && data.users.length > 0) {
        setUsers(data.users);
        setOnline(new Set(data.users.filter((x) => x.online).map((x) => x.user_id)));
        try { localStorage.setItem("circle_users_cache", JSON.stringify(data.users)); } catch {}
      }
      if (Array.isArray(data.labels) && data.labels.length > 0) {
        setLabels(data.labels);
        try { localStorage.setItem("circle_labels_cache", JSON.stringify(data.labels)); } catch {}
      }
      if (Array.isArray(data.org_units)) {
        try { localStorage.setItem("circle_org_units_cache", JSON.stringify(data.org_units)); } catch {}
      }
      if (Array.isArray(data.drive_shortcuts)) {
        setCachedDriveShortcuts(data.drive_shortcuts);
      }
      try {
        localStorage.setItem("circle_user_prefs", JSON.stringify(mergedPrefs));
      } catch {}
    } catch {
      setSession(null);
    }
  }, [setSession]);

  // Removed automatic checkAuth() on mount so users always land on Login page first

  useEffect(() => {
    if (me?.user_id) {
      setAuthUserId(me.user_id);
      loadAll().catch(() => {});
    }
  }, [me?.user_id, loadAll]);

  useEffect(() => {
    applyTheme(buildTheme(ws?.theme, prefs, themeDraft));
  }, [ws?.theme, prefs, themeDraft]);

  // Synchronize browser tab Favicon dynamically with Workspace Favicon / Logo
  useEffect(() => {
    const faviconFileId = ws?.favicon_file_id || ws?.logo_file_id;
    const faviconHref = faviconFileId ? fileUrl(faviconFileId) : "/icon.svg";
    
    // Update or create standard icon link
    let iconLink = document.querySelector("link[rel='icon']");
    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.rel = "icon";
      document.head.appendChild(iconLink);
    }
    iconLink.href = faviconHref;

    // Update or create Apple touch icon link
    let appleTouchLink = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleTouchLink) {
      appleTouchLink = document.createElement("link");
      appleTouchLink.rel = "apple-touch-icon";
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = faviconHref;
  }, [ws?.favicon_file_id, ws?.logo_file_id]);

  useEffect(() => {
    if (prefs.theme_mode !== "system") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme(buildTheme(ws?.theme, prefs, themeDraft));
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [prefs, ws?.theme, themeDraft]);

  const emit = (evt) => subs.current.forEach((fn) => fn(evt));

  useEffect(() => {
    if (!me?.user_id) return undefined;
    let closed = false;
    let timer;
    const connect = () => {
      const s = new WebSocket(wsUrl());
      sock.current = s;
      s.onmessage = (m) => {
        const evt = JSON.parse(m.data);
        if (evt.type === "presence") {
          setOnline((prev) => {
            const n = new Set(prev);
            evt.data.online ? n.add(evt.data.user_id) : n.delete(evt.data.user_id);
            return n;
          });
        }
        if (evt.type === "notification") {
          if (evt.data?.user_id && me?.user_id && evt.data.user_id !== me.user_id) return;
          setUnread((x) => x + 1);
          setTopNotif({
            id: evt.data.id || `notif_${Date.now()}`,
            title: evt.data.title,
            body: evt.data.body,
            type: evt.data.type,
            access_request: evt.data.access_request,
            conversation_id: evt.data.conversation_id,
            task_id: evt.data.task_id,
            sender: evt.data.sender
          });
          playSound("notification");
          if (document.hidden && window.Notification?.permission === "granted") new Notification(evt.data.title, { body: evt.data.body });
        }
        if (evt.type === "message:new" && evt.data) {
          // Ignore private messages meant for conversations this user is not part of
          if (Array.isArray(evt.data.member_ids) && me?.user_id && !evt.data.member_ids.includes(me.user_id)) {
            return;
          }
          if (String(evt.data.conversation_id || "").startsWith("conv_circle_") && evt.data.conversation_id !== `conv_circle_${me?.user_id}`) {
            return;
          }
          // Always cache incoming messages immediately in memory & localStorage so opening any chat has 0ms delay
          appendMessageToCache(evt.data);
          if (evt.data.sender_id !== me?.user_id && !evt.data.silent_popup) {
            const isCurrentlyInThisChat = window.location.pathname === `/messages/${evt.data.conversation_id}`;
            if (!isCurrentlyInThisChat) {
              const userMapObj = Object.fromEntries(users.map((u) => [u.user_id, u]));
              const sender = userMapObj[evt.data.sender_id] || (evt.data.sender_id === "user_circle_assistant" ? { name: ws?.assistant_name || "Circle", avatar: ws?.assistant_avatar } : null);
              setTopNotif({
                id: `msg_notif_${Date.now()}`,
                title: `Pesan Baru dari ${sender?.name || 'Circle'}`,
                body: evt.data.text || "Mengirimkan pesan baru",
                type: evt.data.type || "dm",
                conversation_id: evt.data.conversation_id,
                sender,
                access_request: evt.data.access_request
              });
            }
          }
        }
        if (evt.type === "message:update" && evt.data) {
          updateMessageInCache(evt.data);
        }
        if (evt.type === "conversation:upsert" && evt.data) {
          upsertConversationInCache(evt.data, me?.user_id);
        }
        if ((evt.type === "groups:changed" || evt.type === "group:updated") && evt.data) {
          upsertGroupInCache(evt.data);
          upsertConversationInCache({ ...evt.data, type: "group" }, me?.user_id);
        }
        if (evt.type === "conversations:changed") {
          api.get("/conversations").then((r) => {
            if (Array.isArray(r.data)) hydrateConversationsCache(r.data, me?.user_id);
          }).catch(() => {});
        }
        if (evt.type === "workspace:changed") {
          api.get("/workspace").then((r) => {
            setSession((s) => {
              if (!s) return s;
              return { ...s, workspace: r.data };
            });
          }).catch(() => {});
        }
        if (evt.type === "users:changed") {
          api.get("/users").then((r) => {
            if (Array.isArray(r.data)) {
              setUsers(r.data);
              try { localStorage.setItem("circle_users_cache", JSON.stringify(r.data)); } catch {}
            }
          }).catch(() => {});
        }
        if (evt.type === "org:changed" && Array.isArray(evt.units)) {
          try { localStorage.setItem("circle_org_units_cache", JSON.stringify(evt.units)); } catch {}
        }
        if (evt.type === "drive_shortcuts:changed" && Array.isArray(evt.data)) {
          setCachedDriveShortcuts(evt.data);
        }
        emit(evt);
      };
      s.onerror = () => {
        // Silent error handler to prevent unhandled rejection when connection closes prematurely
      };
      s.onclose = () => {
        if (!closed) timer = setTimeout(connect, 3000);
      };
    };
    connect();
    const ping = setInterval(() => sock.current?.readyState === 1 && sock.current.send('{"type":"ping"}'), 25000);
    return () => {
      closed = true;
      clearTimeout(timer);
      clearInterval(ping);
      sock.current?.close();
    };
  }, [me?.user_id]);

  const value = useMemo(() => {
    const userMap = Object.fromEntries(users.map((u) => [u.user_id, u]));
    const labelMap = Object.fromEntries(labels.map((l) => [l.id, l]));
    return {
      session, setSession, me, ws, prefs, users, userMap, labels, labelMap, online, unread, setUnread,
      topNotif, setTopNotif, showTopNotif: (d) => setTopNotif(d), closeTopNotif: () => setTopNotif(null),
      statuses: (ws?.task_statuses || ["todo", "in_progress", "in_review", "done"]).map((s) => typeof s === "string" ? { key: s, name: s.replace(/_/g, " "), color: "#F0F4FA", is_done: s === "done" } : s),
      isAdmin: ["super_admin", "workspace_admin"].includes(me?.role),
      isManager: ["super_admin", "workspace_admin", "department_manager", "project_manager"].includes(me?.role),
      isDemo: !!me?.is_demo,
      lang: "en",
      t: (key) => getTranslation(key, prefs?.custom_copywriting),
      themeDraft, setThemeDraft,
      reloadUsers: () => api.get("/users").then((r) => {
        if (Array.isArray(r.data)) {
          setUsers(r.data);
          try { localStorage.setItem("circle_users_cache", JSON.stringify(r.data)); } catch {}
          setSession((s) => {
            if (!s?.user) return s;
            const updatedMe = r.data.find((u) => u.user_id === s.user.user_id);
            if (!updatedMe) return s;
            const next = { ...s, user: updatedMe };
            try { localStorage.setItem("circle_session_cache", JSON.stringify(next)); } catch {}
            return next;
          });
        }
      }),
      reloadLabels: () => api.get("/labels").then((r) => {
        if (Array.isArray(r.data)) {
          setLabels(r.data);
          try { localStorage.setItem("circle_labels_cache", JSON.stringify(r.data)); } catch {}
        }
      }),
      reloadWs: () => api.get("/workspace").then((r) => {
        setSession((s) => {
          const next = { ...s, workspace: r.data };
          try {
            localStorage.setItem("circle_session_cache", JSON.stringify(next));
            if (Array.isArray(r.data?.divisions)) {
              localStorage.setItem("circle_admin_divisions", JSON.stringify(r.data.divisions));
            }
          } catch {}
          return next;
        });
      }),
      savePrefs: async (patch) => {
        setSession((s) => {
          const nextPrefs = { ...(s?.prefs || {}), ...patch };
          const nextSession = { ...s, prefs: nextPrefs };
          try {
            localStorage.setItem("circle_user_prefs", JSON.stringify(nextPrefs));
            localStorage.setItem("circle_session_cache", JSON.stringify(nextSession));
          } catch {}
          return nextSession;
        });
        try {
          const { data } = await api.put("/prefs", patch);
          setSession((s) => {
            const synced = { ...(s?.prefs || {}), ...data };
            const nextSession = { ...s, prefs: synced };
            try {
              localStorage.setItem("circle_user_prefs", JSON.stringify(synced));
              localStorage.setItem("circle_session_cache", JSON.stringify(nextSession));
            } catch {}
            return nextSession;
          });
        } catch (e) {
          console.warn("Server prefs sync warning:", e);
        }
      },
      subscribe: (fn) => {
        subs.current.add(fn);
        return () => subs.current.delete(fn);
      },
      send: (obj) => sock.current?.readyState === 1 && sock.current.send(JSON.stringify(obj)),
      logout: async () => {
        await api.post("/auth/logout").catch(() => {});
        setSession(null);
      },
      checkAuth,
    };
  }, [session, setSession, me, ws, prefs, users, labels, online, unread, topNotif, themeDraft, checkAuth]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
