import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Columns3, ArrowUp, ArrowDown, Eye, EyeOff, Plus, ArrowUpDown, Pencil, Maximize2, Link2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { PRIORITY, dueInfo, fmtDate, AvatarStack, getTaskCompliance, getTaskComplianceDetail } from "../../components/common";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { TaskCard } from "./Board";
import { ItemPicker, ItemChip } from "./fields";

export const COLS = [
  ["assignee_id", "Name", 12],
  ["label_ids", "Brand", 11],
  ["item_type", "Item", 13],
  ["title", "Title", 18],
  ["priority", "Priority", 9],
  ["link_url", "Link File/Folder", 15],
  ["status", "Status", 13],
  ["number", "ID", 5],
  ["requestor_id", "Requestor", 10],
  ["project_id", "Project", 10],
  ["completed_at", "Completed", 9],
  ["updated_at", "Last updated", 9]
];
export const DEFAULT_HIDDEN = ["number", "requestor_id", "project_id", "completed_at", "updated_at"];
const ci = "h-8 w-full min-w-0 rounded-md bg-transparent px-1.5 text-xs outline-none hover:bg-surface2 focus:bg-surface focus:ring-2 focus:ring-sky-400";
const pill = "h-7 w-full min-w-0 cursor-pointer truncate rounded-full px-2.5 text-xs font-medium outline-none";
const OPT = { color: "#20283B", background: "#fff" };
const dayOf = (iso) => (iso ? fmtDate(iso, "yyyy-MM-dd") : "");

function LinkCell({ t, patch }) {
  const [edit, setEdit] = useState(false);
  const v = t.link_url || "";
  if (edit || !v) return <input autoFocus={edit} defaultValue={v} placeholder={edit ? "Tempel link…" : ""} onBlur={(e) => { setEdit(false); const n = e.target.value.trim(); if (n !== v) patch(t, { link_url: n }); }} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className={ci} data-testid={`sheet-link-input-${t.id}`} />;
  const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return (
    <div className="flex h-8 items-center gap-1 px-1.5">
      <Link2 size={12} className="shrink-0 text-sub" />
      <a href={href} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-blue-600 underline dark:text-blue-400" data-testid={`sheet-link-${t.id}`}>{v.replace(/^https?:\/\//i, "")}</a>
      <button onClick={() => setEdit(true)} className="shrink-0 text-sub opacity-0 group-hover:opacity-100" aria-label="Edit link" data-testid={`sheet-link-edit-${t.id}`}><Pencil size={11} /></button>
    </div>
  );
}

function Cell({ k, t: taskItem, projects, patch, onOpen }) {
  const { userMap, users, statuses, labels, labelMap, ws, t } = useApp();
  switch (k) {
    case "assignee_id": {
      const uids = taskItem.assignee_ids && taskItem.assignee_ids.length ? taskItem.assignee_ids : (taskItem.assignee_id ? [taskItem.assignee_id] : []);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-full bg-surface2 px-2 text-left text-xs hover:ring-1 hover:ring-brand/40 transition-all cursor-pointer outline-none focus:outline-none focus:ring-0"
              data-testid={`sheet-name-${taskItem.id}`}
            >
              {uids.length > 0 ? (
                <>
                  <AvatarStack ids={uids} max={2} size={18} />
                  <span className="truncate flex-1 font-medium">
                    {uids.map((id) => userMap[id]?.name?.split(" ")[0]).filter(Boolean).join(", ")}
                  </span>
                </>
              ) : (
                <span className="text-sub">— {t("table_unassigned", "Unassigned")}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-surface p-2 shadow-xl rounded-2xl border outline-none focus:outline-none" align="start">
            <p className="px-2 py-1 text-[11px] font-bold text-sub uppercase tracking-wider">{t("table_choose_assignee", "Pilih Assignee")} ({uids.length} orang)</p>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {users.filter((u) => !u.is_bot && u.user_id !== "user_circle_assistant").map((u) => {
                const on = uids.includes(u.user_id);
                return (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => {
                      const next = on ? uids.filter((id) => id !== u.user_id) : [...uids, u.user_id];
                      patch(taskItem, { assignee_ids: next, assignee_id: next[0] || null });
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs transition-colors cursor-pointer outline-none focus:outline-none ${
                      on ? "bg-brand/10 font-bold text-brand" : "hover:bg-surface2 text-ink"
                    }`}
                  >
                    <span className="truncate">{u.name}</span>
                    {on && <span className="text-brand font-bold text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "label_ids": {
      const l = labelMap[taskItem.label_ids?.[0]];
      const set = (id) => patch(taskItem, { label_ids: id ? [id, ...(taskItem.label_ids || []).slice(1).filter((x) => x !== id)] : (taskItem.label_ids || []).slice(1) });
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex h-7 w-full min-w-0 items-center justify-between gap-1.5 rounded-full px-2.5 text-xs font-semibold cursor-pointer outline-none focus:outline-none transition-all hover:opacity-90 ${
                l ? "" : "bg-surface2 text-sub hover:bg-surface2/80 font-medium"
              }`}
              style={l ? { background: l.color, color: "#fff" } : undefined}
              data-testid={`sheet-owner-${taskItem.id}`}
            >
              <span className="truncate flex-1 text-left">{l ? l.name : "—"}</span>
              <ChevronDown size={11} className={`shrink-0 ${l ? "opacity-75 text-white" : "opacity-40"}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-surface p-2 shadow-xl rounded-2xl border outline-none focus:outline-none" align="start">
            <p className="px-2 py-1 text-[11px] font-bold text-sub uppercase tracking-wider">{t("table_choose_brand", "Pilih Brand")}</p>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              <button
                type="button"
                onClick={() => set(null)}
                className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs transition-colors cursor-pointer outline-none focus:outline-none ${
                  !l ? "bg-brand/10 font-bold text-brand" : "hover:bg-surface2 text-sub"
                }`}
              >
                <span>— {t("table_no_brand", "Tanpa Brand")}</span>
                {!l && <span className="text-brand font-bold text-xs">✓</span>}
              </button>
              {labels.filter((x) => !x.archived || x.id === l?.id).map((x) => {
                const on = l?.id === x.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => set(x.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs transition-colors cursor-pointer outline-none focus:outline-none ${
                      on ? "bg-brand/10 font-bold text-brand" : "hover:bg-surface2 text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: x.color }} />
                      <span className="truncate">{x.name}</span>
                    </div>
                    {on && <span className="text-brand font-bold text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "item_type": return <ItemPicker value={taskItem.item_type} onChange={(v) => patch(taskItem, { item_type: v })} testid={`sheet-item-${taskItem.id}`} trigger={<button type="button" className="flex h-8 w-full min-w-0 items-center rounded-md px-1 hover:bg-surface2 outline-none focus:outline-none" data-testid={`sheet-item-${taskItem.id}`}>{taskItem.item_type ? <ItemChip name={taskItem.item_type} small /> : <span className="px-1 text-xs text-sub">—</span>}</button>} />;
    case "link_url": return <LinkCell t={taskItem} patch={patch} />;
    case "title": return (
      <div className="flex items-center">
        <input defaultValue={taskItem.title} key={`title_${taskItem.id}`} onBlur={(e) => e.target.value.trim() && e.target.value !== taskItem.title && patch(taskItem, { title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className={`${ci} text-[13px] font-medium`} data-testid={`list-title-${taskItem.id}`} />
        <button onClick={() => onOpen(taskItem.id)} className="shrink-0 rounded-md p-1 text-sub opacity-0 hover:bg-surface2 group-hover:opacity-100" aria-label="Buka detail" data-testid={`open-task-${taskItem.id}`}><Maximize2 size={12} /></button>
      </div>);
    case "priority": {
      const pObj = PRIORITY[taskItem.priority] || PRIORITY.none;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-full min-w-0 items-center justify-between gap-1.5 rounded-full bg-surface2 px-2.5 text-xs font-semibold cursor-pointer outline-none focus:outline-none hover:bg-surface2/80 transition-all"
              data-testid={`list-priority-${taskItem.id}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {pObj?.color ? <span className="h-2 w-2 rounded-full shrink-0" style={{ background: pObj.color }} /> : null}
                <span className="truncate" style={pObj?.color ? { color: pObj.color } : {}}>{pObj?.name || taskItem.priority || "None"}</span>
              </div>
              <ChevronDown size={11} className="shrink-0 opacity-40" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 bg-surface p-2 shadow-xl rounded-2xl border outline-none focus:outline-none" align="start">
            <p className="px-2 py-1 text-[11px] font-bold text-sub uppercase tracking-wider">{t("table_choose_priority", "Pilih Prioritas")}</p>
            <div className="space-y-0.5">
              {Object.entries(PRIORITY).map(([p, v]) => {
                const on = taskItem.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => patch(taskItem, { priority: p })}
                    className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs transition-colors cursor-pointer outline-none focus:outline-none ${
                      on ? "bg-brand/10 font-bold text-brand" : "hover:bg-surface2 text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {v.color ? <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: v.color }} /> : <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-sub/30" />}
                      <span>{v.name}</span>
                    </div>
                    {on && <span className="text-brand font-bold text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "status":
    case "deadline_compliance": {
      const val = getTaskCompliance(taskItem);
      const detail = getTaskComplianceDetail(taskItem);
      const isDone = taskItem.status === "done";
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex h-7 w-full min-w-0 items-center justify-between gap-1.5 rounded-full px-2.5 text-xs font-semibold cursor-pointer outline-none focus:outline-none focus:ring-0 transition-all hover:opacity-90 ${
                val === "On time"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : val === "Overdue"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
              title={detail}
              data-testid={`list-status-${taskItem.id}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    val === "On time" ? "bg-emerald-500" : val === "Overdue" ? "bg-rose-500" : "bg-amber-500"
                  }`}
                />
                <span className="truncate flex-1 text-left font-bold">{val}</span>
              </div>
              <ChevronDown size={11} className="shrink-0 opacity-40" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-surface p-3 shadow-xl rounded-2xl border outline-none focus:outline-none text-xs" align="start">
            <div className="flex items-center justify-between pb-2 mb-2 border-b">
              <span className="text-[10px] font-bold text-sub uppercase tracking-wider">Status Otomatis</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  val === "On time"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : val === "Overdue"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    val === "On time" ? "bg-emerald-500" : val === "Overdue" ? "bg-rose-500" : "bg-amber-500"
                  }`}
                />
                {val}
              </span>
            </div>
            <p className="text-sub text-[11px] mb-2.5 leading-relaxed">{detail}</p>
            <div className="space-y-1.5 pt-1.5 text-[11px] border-t">
              <div className="flex justify-between">
                <span className="text-sub">Tenggat (Deadline):</span>
                <span className="font-semibold text-ink">{taskItem.deadline ? fmtDate(taskItem.deadline, "d MMM yyyy HH:mm") : "— (Tanpa Deadline)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sub">Selesai pada:</span>
                <span className="font-semibold text-ink">
                  {taskItem.completed_at
                    ? fmtDate(taskItem.completed_at, "d MMM yyyy HH:mm")
                    : isDone
                    ? fmtDate(taskItem.updated_at, "d MMM yyyy HH:mm")
                    : "Belum selesai"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sub">Status Board:</span>
                <span className="font-semibold text-ink">{statuses.find((s) => s.key === taskItem.status)?.name || taskItem.status}</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  const nextDone = !isDone;
                  const nextCompletedAt = nextDone ? new Date().toISOString() : null;
                  let nextCompliance = "In Progress";
                  if (nextDone) {
                    nextCompliance = taskItem.deadline ? (new Date(nextCompletedAt) > new Date(taskItem.deadline) ? "Overdue" : "On time") : "On time";
                  } else {
                    nextCompliance = (taskItem.deadline && new Date() > new Date(taskItem.deadline)) ? "Overdue" : "In Progress";
                  }
                  patch(taskItem, {
                    status: nextDone ? "done" : "in_progress",
                    completed_at: nextCompletedAt,
                    deadline_compliance: nextCompliance,
                    progress: nextDone ? 100 : taskItem.progress
                  });
                }}
                className={`w-full rounded-xl py-1.5 text-center font-bold text-xs transition-colors cursor-pointer ${
                  isDone
                    ? "bg-surface2 hover:bg-surface2/80 text-ink"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                }`}
              >
                {isDone ? "Buka Kembali (Set In Progress)" : "Tandai Selesai (Set Done)"}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "number": return <button onClick={() => onOpen(taskItem.id)} className="px-1.5 text-xs font-semibold text-sub hover:text-brand hover:underline cursor-pointer text-left" title="Buka detail task">{taskItem.number_str}</button>;
    case "requestor_id": return <span className="block truncate px-1.5 text-xs">{userMap[taskItem.requestor_id]?.name || "—"}</span>;
    case "project_id": return <span className="block truncate px-1.5 text-xs">{projects[taskItem.project_id]?.name || "—"}</span>;
    case "completed_at": return <span className="block truncate px-1.5 text-xs text-emerald-600">{taskItem.completed_at ? fmtDate(taskItem.completed_at, "d MMM") : "—"}</span>;
    case "updated_at": return <span className="block truncate px-1.5 text-xs text-sub">{fmtDate(taskItem.updated_at, "d MMM HH:mm")}</span>;
    default: {
      const cf = (ws.task_fields || []).find((f) => f.key === k);
      return cf ? <input defaultValue={taskItem.custom?.[k] || ""} onBlur={(e) => e.target.value !== (taskItem.custom?.[k] || "") && patch(taskItem, { custom: { ...(taskItem.custom || {}), [k]: e.target.value } })} className={ci} /> : null;
    }
  }
}

export function ColumnMenu({ cols, cfg, save }) {
  const { isManager, ws, reloadWs, t } = useApp();
  const [name, setName] = useState("");
  const move = (k, dir) => { const o = cols.map((c) => c[0]); const i = o.indexOf(k); const j = i + dir; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; save({ ...cfg, order: o }); };
  const toggle = (k) => save({ ...cfg, hidden: (cfg.hidden || []).includes(k) ? cfg.hidden.filter((x) => x !== k) : [...(cfg.hidden || []), k] });
  const add = async () => { try { await api.put("/settings/task-config", { task_fields: [...(ws.task_fields || []), { name }] }); setName(""); reloadWs(); toast.success("Column added"); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <Popover><PopoverTrigger asChild><button className="btn-ghost flex h-10 items-center gap-1.5 rounded-full border bg-surface px-4 text-xs sm:text-sm font-semibold transition-all shadow-xs text-sub hover:text-ink hover:bg-surface2 outline-none focus:outline-none focus:ring-0" data-testid="list-columns-btn"><Columns3 size={15} />{t("table_columns_btn", "Columns")}</button></PopoverTrigger>
      <PopoverContent className="w-72 bg-surface p-2 shadow-xl rounded-2xl border outline-none focus:outline-none" align="end">
        <div className="max-h-72 overflow-y-auto">{cols.map(([k, l], i) => (
          <div key={`col_${k}`} className="flex items-center gap-1 rounded-xl px-2 py-1 text-sm hover:bg-surface2"><span className={`flex-1 ${(cfg.hidden || []).includes(k) ? "text-sub line-through" : ""}`}>{l}</span>
            <button onClick={() => move(k, -1)} disabled={!i} className="text-sub disabled:opacity-30 p-1 hover:text-ink" aria-label="Move left"><ArrowUp size={13} /></button>
            <button onClick={() => move(k, 1)} className="text-sub p-1 hover:text-ink" aria-label="Move right"><ArrowDown size={13} /></button>
            <button onClick={() => toggle(k)} className="text-sub p-1 hover:text-ink" aria-label="Toggle column" data-testid={`toggle-col-${k}`}>{(cfg.hidden || []).includes(k) ? <EyeOff size={13} /> : <Eye size={13} />}</button></div>))}</div>
        {isManager && <div className="mt-2 flex gap-1 border-t pt-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New custom column" className="h-8 flex-1 rounded-lg border bg-surface2 px-2 text-xs" data-testid="custom-column-input" /><button onClick={add} disabled={!name.trim()} className="btn-accent flex h-8 w-8 items-center justify-center disabled:opacity-40" aria-label="Add column" data-testid="custom-column-add"><Plus size={14} /></button></div>}
        <button onClick={() => save({ hidden: DEFAULT_HIDDEN, order: undefined })} className="mt-2 w-full text-xs font-semibold text-brand hover:underline p-1">{t("table_reset_columns", "Reset columns")}</button>
      </PopoverContent></Popover>
  );
}

function AddRow({ span, onAdd, gkey }) {
  const { t } = useApp();
  const [v, setV] = useState("");
  const submit = async () => { if (!v.trim()) return; await onAdd(v.trim()); setV(""); };
  return <tr><td className="border-r p-0 text-center text-sub"><Plus size={13} className="mx-auto" /></td><td colSpan={span} className="p-0"><input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} onBlur={submit} placeholder={t("table_add_row", "Tambah baris baru — ketik judul lalu Enter")} className="h-9 w-full bg-transparent px-3 text-xs outline-none placeholder:text-sub focus:bg-surface2" data-testid={`sheet-add-row-${gkey}`} /></td></tr>;
}

export default function ListView({ tasks, projects, onOpen, selected, setSelected, reload, groupBy, boardId }) {
  const { prefs, ws, statuses, userMap, labelMap, t } = useApp();
  const [collapsed, setCollapsed] = useState({});
  const [sort, setSort] = useState({ k: "number", dir: 1 });
  const [limit, setLimit] = useState({});
  const cfg = prefs.task_sheet || { hidden: DEFAULT_HIDDEN };

  const getColLabel = (key, defaultLabel) => {
    switch (key) {
      case "assignee_id": return t("col_name", defaultLabel);
      case "label_ids": return t("col_brand", defaultLabel);
      case "item_type": return t("col_item", defaultLabel);
      case "title": return t("col_title", defaultLabel);
      case "priority": return t("col_priority", defaultLabel);
      case "status": return t("col_status", defaultLabel);
      case "deadline_compliance": return t("col_status_tenggat", defaultLabel);
      case "link_url": return t("col_link", defaultLabel);
      case "number": return t("col_number", defaultLabel);
      case "requestor_id": return t("col_requestor", defaultLabel);
      case "project_id": return t("col_project", defaultLabel);
      case "completed_at": return t("col_completed", defaultLabel);
      case "updated_at": return t("col_updated", defaultLabel);
      default: return defaultLabel;
    }
  };

  const standardKeys = new Set(COLS.map((c) => c[0].toLowerCase()));
  const standardNames = new Set(COLS.map((c) => c[1].toLowerCase()));
  const customCols = (ws.task_fields || [])
    .filter((f) => {
      const k = (f.key || f.name || "").toLowerCase();
      const n = (f.name || "").toLowerCase();
      return n !== "estimate" && !standardKeys.has(k) && !standardNames.has(n);
    })
    .map((f) => [f.key || f.name, f.name, 10]);

  // Dedup keys in all to ensure priority is never duplicated
  const rawAll = [...COLS, ...customCols].map(([k, l, w]) => [k, getColLabel(k, l), w]);
  const seenK = new Set();
  const all = rawAll.filter(([k]) => {
    if (seenK.has(k)) return false;
    seenK.add(k);
    return true;
  });

  // Target default order: Name -> Brand -> Item -> Title -> Priority -> Link File/Folder -> Status
  const targetPrefix = ["assignee_id", "label_ids", "item_type", "title", "priority", "link_url", "status"];
  const isOutdatedOrder =
    !cfg.order ||
    cfg.order.includes("deadline_compliance") ||
    cfg.order.indexOf("link_url") > cfg.order.indexOf("status") ||
    cfg.order.indexOf("priority") > cfg.order.indexOf("link_url") ||
    cfg.order.filter((x) => x === "priority").length > 1;

  const effectiveOrder = isOutdatedOrder ? targetPrefix : cfg.order;
  const cols = [
    ...(effectiveOrder || []).map((k) => all.find((c) => c[0] === k)).filter(Boolean),
    ...all.filter((c) => !(effectiveOrder || []).includes(c[0]))
  ];
  const visible = cols.filter((c) => !(cfg.hidden || []).includes(c[0]));
  const total = 4 + visible.reduce((s, c) => s + c[2], 0);
  const patch = async (t, body) => { try { await api.patch(`/tasks/${t.id}`, body); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const val = (t, k) => {
    if (k === "assignee_id") {
      const uids = t.assignee_ids && t.assignee_ids.length ? t.assignee_ids : (t.assignee_id ? [t.assignee_id] : []);
      return uids.map((id) => userMap[id]?.name).filter(Boolean).join(", ");
    }
    if (k === "label_ids") return labelMap[t.label_ids?.[0]]?.name ?? "";
    if (k === "status" || k === "deadline_compliance") return getTaskCompliance(t);
    return t[k] ?? "";
  };
  const sorted = useMemo(() => [...tasks].sort((a, b) => { const x = val(a, sort.k); const y = val(b, sort.k); return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; }), [tasks, sort, userMap, labelMap]); // eslint-disable-line
  const groups = useMemo(() => {
    if (groupBy === "status") return statuses.map((s) => [s.key, s.name, s.color, sorted.filter((t) => t.status === s.key)]);
    if (groupBy === "assignee") {
      const ids = [...new Set(sorted.flatMap((t) => {
        const uids = t.assignee_ids && t.assignee_ids.length ? t.assignee_ids : (t.assignee_id ? [t.assignee_id] : []);
        return uids.length ? uids : [""];
      }))];
      return ids.map((id) => [
        id || "none",
        userMap[id]?.name || "Unassigned",
        "var(--s-blue)",
        sorted.filter((t) => {
          const uids = t.assignee_ids && t.assignee_ids.length ? t.assignee_ids : (t.assignee_id ? [t.assignee_id] : []);
          return id ? uids.includes(id) : !uids.length;
        })
      ]);
    }
    if (groupBy === "department") { const ds = [...new Set(sorted.map((t) => t.department || ""))]; return ds.map((d) => [d || "none", d || "No department", "var(--s-green)", sorted.filter((t) => (t.department || "") === d)]); }
    if (groupBy === "label") { const ls = [...new Set(sorted.flatMap((t) => (t.label_ids?.length ? t.label_ids : [""])))]; return ls.map((l) => [l || "none", labelMap[l]?.name || "No label", labelMap[l] ? `${labelMap[l].color}33` : "var(--s-yellow)", sorted.filter((t) => (l ? t.label_ids?.includes(l) : !t.label_ids?.length))]); }
    return [["all", null, null, sorted]];
  }, [groupBy, sorted, statuses, userMap, labelMap]);
  const toggleSel = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const addRow = async (key, title) => {
    const body = { title, ...(boardId ? { board_id: boardId } : {}) };
    if (groupBy === "status") body.status = key;
    if (groupBy === "assignee" && key !== "none") body.assignee_id = key;
    if (groupBy === "label" && key !== "none") body.label_ids = [key];
    try { await api.post("/tasks", body); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div data-testid="task-list-view">
      {!tasks.length && <p className="mb-3 rounded-2xl border border-dashed p-6 text-center text-sm text-sub" data-testid="task-list-empty">No tasks match these filters.</p>}
      <div className="space-y-5">
        {groups.map(([key, name, color, items]) => {
          const lim = limit[key] || 100;
          return (
            <section key={key} data-testid={`list-group-${key}`}>
              {name && <button onClick={() => setCollapsed({ ...collapsed, [key]: !collapsed[key] })} className="mb-2 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left" style={{ background: color }}>
                {collapsed[key] ? <ChevronRight size={15} /> : <ChevronDown size={15} />}<span className="text-sm font-bold text-[#20283B] dark:text-ink">{name}</span><span className="rounded-full bg-surface px-2 text-xs font-semibold">{items.length}</span>
              </button>}
              {!collapsed[key] && <>
                <div className="hidden overflow-hidden rounded-xl border bg-surface md:block">
                  <table className="w-full table-fixed border-collapse text-left" data-testid={`task-sheet-${key}`}>
                    <colgroup><col key={`${key}_col_num`} style={{ width: `${(4 / total) * 100}%` }} />{visible.map(([k, , w], idx) => <col key={`${key}_col_${k || idx}`} style={{ width: `${(w / total) * 100}%` }} />)}</colgroup>
                    <thead><tr className="bg-surface2">
                      <th className="border-b border-r p-0 text-center"><input type="checkbox" checked={items.length > 0 && items.every((t) => selected.includes(t.id))} onChange={(e) => setSelected(e.target.checked ? [...new Set([...selected, ...items.map((t) => t.id)])] : selected.filter((x) => !items.some((t) => t.id === x)))} className="accent-[var(--c-accent)]" aria-label="Select all" data-testid={`select-all-${key}`} /></th>
                      {visible.map(([k, l], idx) => <th key={`${key}_th_${k || idx}`} className="border-b border-r px-2 py-2 last:border-r-0"><button onClick={() => setSort({ k, dir: sort.k === k ? -sort.dir : 1 })} className="flex w-full min-w-0 items-center gap-1 text-xs font-bold text-ink" data-testid={`sort-${k}`}><span className="truncate">{l}</span><ArrowUpDown size={10} className={`shrink-0 ${sort.k === k ? "text-brand" : "opacity-30"}`} /></button></th>)}
                    </tr></thead>
                    <tbody>{items.slice(0, lim).map((t, i) => { const on = selected.includes(t.id); return (
                      <tr key={`${key}_row_${t.id}`} className={`group border-b ${on ? "bg-soft-red" : i % 2 ? "bg-[var(--s-blue)]/30" : ""} hover:bg-surface2/70`} data-testid={`task-row-${t.id}`}>
                        <td className="relative border-r p-0 text-center"><span className={`text-[11px] text-sub ${on ? "opacity-0" : "group-hover:opacity-0"}`}>{i + 1}</span><input type="checkbox" checked={on} onChange={() => toggleSel(t.id)} className={`absolute inset-0 m-auto h-4 w-4 accent-[var(--c-accent)] ${on ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} aria-label="Select task" data-testid={`select-task-${t.id}`} /></td>
                        {visible.map(([k], idx) => <td key={`${key}_cell_${t.id}_${k || idx}`} className="border-r px-0.5 py-0.5 last:border-r-0"><Cell k={k} t={t} projects={projects} patch={patch} onOpen={onOpen} /></td>)}
                      </tr>); })}
                      <AddRow span={visible.length} onAdd={(title) => addRow(key, title)} gkey={key} />
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 md:hidden">{items.slice(0, lim).map((t) => <div key={`${t.id}_${t.updated_at || t.created_at || '1'}`} className="flex items-start gap-2"><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSel(t.id)} className="mt-4 h-5 w-5 accent-[var(--c-accent)]" aria-label="Select task" /><div className="min-w-0 flex-1"><TaskCard t={t} onOpen={onOpen} done={statuses.find((s) => s.key === t.status)?.is_done} reload={reload} />{t.item_type && <div className="mt-1 pl-1"><ItemChip name={t.item_type} small /></div>}</div></div>)}</div>
                {items.length > lim && <button onClick={() => setLimit({ ...limit, [key]: lim + 100 })} className="mt-2 text-sm font-semibold text-brand">Show more ({items.length - lim})</button>}
              </>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
