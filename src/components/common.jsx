import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict, isToday, isPast, differenceInHours } from "date-fns";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useApp } from "../context/AppContext";
import { fileUrl } from "../lib/api";

const GRADS = ["from-[#FF8A9A] to-[#FF5364]", "from-[#8FB8FF] to-[#5B7CFA]", "from-[#C3A6FF] to-[#8B5CF6]", "from-[#7FE0B0] to-[#22A06B]", "from-[#FFD27A] to-[#F59E0B]", "from-[#7FD8E0] to-[#0EA5A4]"];
const hash = (s = "") => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

export function Logo({ size = 36, ws }) {
  if (ws?.logo_file_id) return <img src={fileUrl(ws.logo_file_id)} alt="logo" style={{ width: size, height: size }} className="rounded-xl object-cover" />;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="CIRCLE logo" data-testid="circle-logo">
      <circle cx="20" cy="20" r="17" fill="none" stroke="var(--c-accent)" strokeWidth="5" />
      <circle cx="20" cy="20" r="7" fill="var(--c-accent2)" />
      <circle cx="32" cy="9" r="4" fill="#FFC53D" />
    </svg>
  );
}

export function Avatar({ user, size = 36, showStatus = true, className = "" }) {
  const { online, ws, me } = useApp() || {};
  const isCircleBot = user?.user_id === "user_circle_assistant" || user?.role === "assistant";
  const name = isCircleBot ? (ws?.assistant_name || user?.name || "Circle") : (user?.name || "?");
  const avatarSrc = isCircleBot
    ? (ws?.assistant_avatar || user?.avatar || user?.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=CircleWorkspace&backgroundColor=FF5364")
    : (user?.avatar || user?.picture);

  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const isOn = Boolean(
    isCircleBot ||
    (user?.user_id && me?.user_id && user.user_id === me.user_id) ||
    online?.has(user?.user_id) ||
    user?.online
  );
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      {avatarSrc ? (
        <img src={avatarSrc} alt={name} className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${GRADS[hash(name) % GRADS.length]} font-semibold text-white`} style={{ fontSize: size * 0.38 }}>
          {initials}
        </span>
      )}
      {showStatus && user && (
        <span className={`absolute bottom-0 right-0 rounded-full border-2 border-[var(--c-surface)] ${isOn ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }} data-testid="online-indicator" />
      )}
    </span>
  );
}

export function ImageLightbox({ image, onClose }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!image) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [image, onClose]);

  useEffect(() => {
    setZoomed(false);
  }, [image?.id, image?.url]);

  if (!image) return null;

  const src = image.url || fileUrl(image.id);
  const downloadHref = image.id ? `${fileUrl(image.id)}?download=1` : src;
  const fileName = image.name || `photo-${image.id || Date.now()}.png`;

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(downloadHref);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch {
      const a = document.createElement("a");
      a.href = downloadHref;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm animate-fadeIn"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      data-testid="image-lightbox-modal"
    >
      {/* Top Toolbar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 bg-gradient-to-b from-black/70 to-transparent text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{fileName}</p>
          <p className="text-[11px] text-white/70">Tekan tombol ESC atau klik di luar foto untuk menutup</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
            title={zoomed ? "Perkecil" : "Perbesar"}
            data-testid="lightbox-zoom-btn"
          >
            {zoomed ? <ZoomOut size={15} /> : <ZoomIn size={15} />}
            <span className="hidden sm:inline">{zoomed ? "Fit Screen" : "Zoom"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand hover:opacity-95 px-3.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            data-testid="lightbox-download-btn"
          >
            <Download size={15} />
            <span>Download Full Version</span>
          </button>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-rose-500 text-white transition-colors cursor-pointer"
            aria-label="Close preview"
            title="Close (Esc)"
            data-testid="lightbox-close-btn"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image Viewport */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-4 sm:p-8">
        <img
          src={src}
          alt={fileName}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={`rounded-2xl shadow-2xl transition-transform duration-200 select-none ${
            zoomed
              ? "max-w-none max-h-none scale-125 cursor-zoom-out"
              : "max-h-[82dvh] max-w-[92vw] object-contain cursor-zoom-in"
          }`}
          data-testid="lightbox-image"
        />
      </div>
    </div>
  );
}

export function GroupIcon({ c, size = 42, rounded = "rounded-2xl" }) {
  if (c?.image) return <img src={fileUrl(c.image)} alt={c.name || "group"} className={`${rounded} shrink-0 object-cover`} style={{ width: size, height: size }} data-testid={`group-avatar-${c.id}`} />;
  return <span className={`flex shrink-0 items-center justify-center ${rounded} bg-soft-purple font-bold text-ink`} style={{ width: size, height: size, fontSize: size * 0.4 }} data-testid={`group-avatar-${c?.id}`}>{(c?.name || "#").trim().slice(0, 1).toUpperCase()}</span>;
}

export function AvatarStack({ ids = [], max = 4, size = 26 }) {
  const { userMap } = useApp();
  return (
    <div className="flex -space-x-1.5">
      {[...ids.slice(0, max)].reverse().map((id, index) => <Avatar key={id} user={userMap[id]} size={size} showStatus={false} className="relative border-2 border-[var(--c-surface)] rounded-full" style={{ zIndex: index }} />)}
      {ids.length > max && <span className="relative flex items-center justify-center rounded-full bg-surface2 text-[10px] font-semibold text-sub border-2 border-[var(--c-surface)]" style={{ width: size, height: size, zIndex: 0 }}>+{ids.length - max}</span>}
    </div>
  );
}

export function LabelChip({ label, small }) {
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"}`}
      style={{ background: `${label.color}1F`, color: label.color }} data-testid={`label-chip-${label.id}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: label.color }} />{label.name}
    </span>
  );
}

export function Labels({ ids = [], small, max = 3 }) {
  const { labelMap } = useApp();
  const ls = ids.map((i) => labelMap[i]).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {ls.slice(0, max).map((l) => <LabelChip key={l.id} label={l} small={small} />)}
      {ls.length > max && <span className="text-[10px] text-sub">+{ls.length - max}</span>}
    </div>
  );
}

export const PRIORITY = {
  low: { name: "Low", cls: "bg-soft-green text-emerald-700 dark:text-emerald-300" },
  medium: { name: "Medium", cls: "bg-soft-blue text-blue-700 dark:text-blue-300" },
  high: { name: "High", cls: "bg-soft-yellow text-amber-700 dark:text-amber-300" },
  urgent: { name: "Urgent", cls: "bg-soft-red text-rose-600 dark:text-rose-300" },
};
export function PriorityBadge({ value }) {
  const p = PRIORITY[value] || PRIORITY.medium;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.cls}`}>{p.name}</span>;
}

export function StatusBadge({ status }) {
  const { statuses } = useApp();
  const s = statuses.find((x) => x.key === status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ background: `${s?.color || "#eee"}55` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: s?.is_done ? "#22A06B" : "var(--c-accent2)", opacity: s?.is_done ? 1 : 0.7 }} />{s?.name || status}
    </span>
  );
}

export function dueInfo(deadline, done) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (done) return { text: format(d, "d MMM"), cls: "text-sub" };
  if (isPast(d) && !isToday(d)) return { text: `Overdue · ${format(d, "d MMM")}`, cls: "text-rose-600 dark:text-rose-400 font-semibold", state: "overdue" };
  if (isPast(d)) return { text: `Overdue · ${format(d, "HH:mm")}`, cls: "text-rose-600 dark:text-rose-400 font-semibold", state: "overdue" };
  if (isToday(d)) return { text: `Today · ${format(d, "HH:mm")}`, cls: "text-amber-600 dark:text-amber-400 font-semibold", state: "today" };
  if (differenceInHours(d, new Date()) < 72) return { text: format(d, "EEE, d MMM"), cls: "text-blue-600 dark:text-blue-400", state: "soon" };
  return { text: format(d, "d MMM yyyy"), cls: "text-sub" };
}

export const fmtTime = (iso) => (iso ? format(new Date(iso), "HH:mm") : "");
export const fmtDate = (iso, f = "d MMM yyyy") => (iso ? format(new Date(iso), f) : "—");
export const rel = (iso) => (iso ? formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) : "");

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-800/80 pb-3.5 sm:border-b-0 sm:pb-0">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        {Icon && (
          <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl tint-accent shadow-2xs">
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-ink leading-tight truncate" data-testid="page-title">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-sub mt-0.5 line-clamp-2 sm:line-clamp-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center" data-testid="empty-state">
      {Icon && <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-surface2 text-sub"><Icon size={24} /></span>}
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-sub">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-sub" data-testid="loading-state">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--c-border)] border-t-[var(--c-accent)]" />{label}…
    </div>
  );
}

export function AccentButton({ children, className = "", ...p }) {
  return <button className={`btn-accent inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-50 ${className}`} {...p}>{children}</button>;
}
export function GhostButton({ children, className = "", ...p }) {
  return <button className={`btn-ghost inline-flex h-10 items-center justify-center gap-2 border bg-surface px-4 text-sm font-medium disabled:opacity-50 ${className}`} {...p}>{children}</button>;
}

export const ROLE_NAMES = { super_admin: "Super Admin", workspace_admin: "Workspace Admin", department_manager: "Department Manager", project_manager: "Project Manager", employee: "Employee" };

export function getTaskCompliance(t) {
  if (!t) return "In Progress";

  const isDone = t.status === "done";

  // Jika task sudah selesai (DONE)
  if (isDone) {
    if (!t.deadline) return "On time";
    const finishedAt = new Date(t.completed_at || t.updated_at || Date.now());
    const dl = new Date(t.deadline);
    // Jika selesai melebihi deadline -> OVERDUE, jika tepat waktu/sebelumnya -> ON TIME
    return finishedAt > dl ? "Overdue" : "On time";
  }

  // Jika task belum selesai (To Do, In Progress, In Review)
  if (!t.deadline) return "In Progress";
  const now = new Date();
  const dl = new Date(t.deadline);
  // Jika sekarang sudah melewati deadline -> OVERDUE, jika masih dalam tenggat -> IN PROGRESS
  return now > dl ? "Overdue" : "In Progress";
}

export function getTaskComplianceDetail(t) {
  if (!t) return "";
  const isDone = t.status === "done";
  if (isDone) {
    if (!t.deadline) return "Selesai tepat waktu (tanpa deadline)";
    const finishedAt = new Date(t.completed_at || t.updated_at || Date.now());
    const dl = new Date(t.deadline);
    return finishedAt > dl
      ? "Selesai melebihi deadline (Overdue)"
      : "Selesai tepat waktu (On time)";
  }
  if (!t.deadline) return "Sedang dikerjakan (tanpa deadline)";
  const now = new Date();
  const dl = new Date(t.deadline);
  return now > dl
    ? "Belum selesai dan sudah melewati deadline (Overdue)"
    : "Sedang dikerjakan dalam tenggat waktu (In Progress)";
}

