import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, Lock, Plus, Users, Building2, FolderKanban, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, fileUrl } from "../lib/api";
import { useApp } from "../context/AppContext";
import { PageHeader, AccentButton, Empty } from "../components/common";
import { GroupDialog } from "./chat/GroupDialog";
import { upsertConversationInCache } from "./chat/ChatView";

const ICON = { public: Hash, private: Lock, department: Building2, project: FolderKanban };
const TINT = { public: "bg-soft-blue", private: "bg-soft-purple", department: "bg-soft-green", project: "bg-soft-yellow" };

const DEFAULT_OFFICIAL_GROUPS = [
  { id: "group_official_marketing", name: "Marketing", description: "Official channel for Marketing department discussions", group_type: "department", is_verified: true, is_member: true, member_count: 5 },
  { id: "group_official_sales", name: "Sales", description: "Official channel for Sales department discussions", group_type: "department", is_verified: true, is_member: true, member_count: 5 },
  { id: "group_official_it", name: "IT", description: "Official channel for IT department discussions", group_type: "department", is_verified: true, is_member: true, member_count: 5 },
  { id: "group_official_finance", name: "Finance", description: "Official channel for Finance department discussions", group_type: "department", is_verified: true, is_member: true, member_count: 5 },
  { id: "group_official_legal", name: "Legal", description: "Official channel for Legal department discussions", group_type: "department", is_verified: true, is_member: true, member_count: 5 },
  { id: "group_official_hrga", name: "HRGA", description: "Official channel for HRGA department discussions", group_type: "department", is_verified: true, is_member: true, member_count: 5 }
];

let GROUPS_CACHE = DEFAULT_OFFICIAL_GROUPS;
try {
  const saved = localStorage.getItem("circle_groups_cache");
  if (saved) {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) GROUPS_CACHE = parsed;
  }
} catch {}

export function hydrateGroupsCache(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return;
  GROUPS_CACHE = arr;
  try {
    localStorage.setItem("circle_groups_cache", JSON.stringify(arr));
  } catch {}
}

export function upsertGroupInCache(group) {
  if (!group || !group.id) return GROUPS_CACHE;
  const idx = GROUPS_CACHE.findIndex((g) => g.id === group.id);
  const next = idx !== -1
    ? GROUPS_CACHE.map((g, i) => (i === idx ? { ...g, ...group } : g))
    : [group, ...GROUPS_CACHE];
  GROUPS_CACHE = next;
  try {
    localStorage.setItem("circle_groups_cache", JSON.stringify(next));
  } catch {}
  return next;
}

export default function Groups() {
  const { me, subscribe } = useApp();
  const [groups, setGroups] = useState(GROUPS_CACHE);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const load = useCallback(() => {
    api.get("/groups/browse").then((r) => {
      const arr = Array.isArray(r.data) ? r.data : [];
      if (arr.length > 0) {
        GROUPS_CACHE = arr;
        setGroups(arr);
        try { localStorage.setItem("circle_groups_cache", JSON.stringify(arr)); } catch {}
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setGroups(GROUPS_CACHE);
    load();
  }, [load, me?.user_id]);

  useEffect(() => subscribe((e) => {
    if ((e.type === "groups:changed" || e.type === "group:updated") && e.data) {
      const d = e.data;
      const mems = Array.isArray(d.member_ids) ? d.member_ids : [];
      const hydrated = {
        ...d,
        is_member: me?.user_id ? mems.includes(me.user_id) : (d.is_member ?? true),
        member_count: mems.length || d.member_count || 1
      };
      const next = upsertGroupInCache(hydrated);
      setGroups(next);
    } else if (e.type === "group:deleted" && e.id) {
      const next = GROUPS_CACHE.filter((g) => g.id !== e.id);
      GROUPS_CACHE = next;
      setGroups(next);
      try { localStorage.setItem("circle_groups_cache", JSON.stringify(next)); } catch {}
    } else if (e.type === "groups:changed") {
      load();
    }
  }), [subscribe, load, me?.user_id]);

  const openGroup = (g) => {
    upsertConversationInCache({
      ...g,
      type: "group",
      is_member: true,
      member_ids: Array.from(new Set([...(g.member_ids || []), me?.user_id].filter(Boolean)))
    }, me?.user_id);
    navigate(`/messages/${g.id}`);
  };

  const join = (g) => {
    const nextMems = Array.from(new Set([...(g.member_ids || []), me?.user_id].filter(Boolean)));
    const optimisticGroup = {
      ...g,
      type: "group",
      is_member: true,
      member_ids: nextMems,
      member_count: Math.max((g.member_count || 0) + (g.is_member ? 0 : 1), nextMems.length)
    };
    // 0ms optimistic cache + state update and immediate navigation
    const nextList = upsertGroupInCache(optimisticGroup);
    setGroups(nextList);
    upsertConversationInCache(optimisticGroup, me?.user_id);
    navigate(`/messages/${g.id}`);

    api.post(`/groups/${g.id}/join`).then((r) => {
      if (r.data && r.data.id) {
        const synced = upsertGroupInCache({ ...optimisticGroup, ...r.data, is_member: true });
        setGroups(synced);
        upsertConversationInCache({ ...optimisticGroup, ...r.data, type: "group", is_member: true }, me?.user_id);
      }
    }).catch((e) => {
      toast.error(errMsg(e));
    });
  };

  const list = (groups || []).filter((g) => filter === "all" || (filter === "mine" ? g.is_member : g.group_type === filter));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10 animate-crossfade" data-testid="groups-page">
      <PageHeader icon={Hash} title="Groups & Channels" subtitle="Public, private, department and project groups in your workspace." actions={<AccentButton onClick={() => setOpen(true)} data-testid="create-group-btn"><Plus size={16} />New group</AccentButton>} />
      <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
        {["all", "mine", "public", "private", "department", "project"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`h-9 whitespace-nowrap rounded-full px-4 text-sm font-medium capitalize transition-colors cursor-pointer ${filter === f ? "bg-brand text-white shadow-xs" : "border bg-surface text-sub hover:bg-surface2"}`} data-testid={`group-filter-${f}`}>{f === "mine" ? "My groups" : f}</button>)}
      </div>
      {!list.length ? <Empty icon={Hash} title="No groups here" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g) => { const I = ICON[g.group_type] || Hash; return (
            <div key={g.id} className="card flex flex-col p-5" data-testid={`group-card-${g.id}`}>
              <div className="flex items-start gap-3">
                {g.image ? <img src={fileUrl(g.image)} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TINT[g.group_type]}`}><I size={20} /></span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="truncate font-bold">{g.name}</p>
                    {g.is_verified && <ShieldCheck size={14} className="shrink-0 text-blue-500" fill="currentColor" fillOpacity={0.1} title="Official Group" />}
                  </div>
                  <p className="text-xs capitalize text-sub">{g.group_type}{g.archived ? " · archived" : ""}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-sm text-sub">{g.description || "No description"}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-sub">
                <span className="flex items-center gap-3"><span className="flex items-center gap-1"><Users size={13} />{g.member_count}</span>{g.location && <span className="flex items-center gap-1"><MapPin size={12} />{g.location}</span>}</span>
                {g.is_member ? <button onClick={() => openGroup(g)} className="rounded-full bg-surface2 px-3 py-1.5 font-semibold text-ink hover:bg-border/60 cursor-pointer" data-testid={`open-group-${g.id}`}>Open</button>
                  : <button onClick={() => join(g)} className="btn-accent px-3 py-1.5 font-semibold cursor-pointer" data-testid={`join-group-${g.id}`}>Join</button>}
              </div>
            </div>); })}
        </div>
      )}
      <GroupDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={(g) => {
          const next = upsertGroupInCache({ ...g, is_member: true });
          setGroups(next);
          upsertConversationInCache({ ...g, type: "group", is_member: true }, me?.user_id);
          navigate(`/messages/${g.id}`);
        }}
      />
    </div>
  );
}

