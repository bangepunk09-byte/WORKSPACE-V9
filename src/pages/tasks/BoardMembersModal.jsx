import { useEffect, useState, useMemo } from "react";
import { Users, UserPlus, Trash2, Shield, Check, X, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { Avatar } from "../../components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";

export default function BoardMembersModal({ board, onClose, onUpdated }) {
  const { users, me, isAdmin } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteUserId, setInviteUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    if (!board?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/boards/${board.id}/members`);
      setData(res.data);
    } catch (err) {
      toast.error(errMsg(err, "Gagal memuat anggota board"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [board?.id]);

  const boardDept = board?.department || data?.department || "Semua Divisi";
  const deptUsers = data?.dept_users || [];
  const invitedUsers = data?.invited_users || [];

  // Users who are not yet in dept_users or invited_users and not bots
  const existingUserIds = new Set([
    ...deptUsers.map((u) => u.user_id),
    ...invitedUsers.map((u) => u.user_id),
    "user_circle_assistant"
  ]);

  const availableToInvite = useMemo(() => {
    return users.filter((u) => !u.is_bot && !existingUserIds.has(u.user_id));
  }, [users, existingUserIds]);

  const filteredAvailable = useMemo(() => {
    if (!searchQuery.trim()) return availableToInvite;
    const q = searchQuery.toLowerCase();
    return availableToInvite.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }, [availableToInvite, searchQuery]);

  const handleInvite = async () => {
    if (!inviteUserId) return;
    setSubmitting(true);
    try {
      const targetUser = users.find((u) => u.user_id === inviteUserId);
      await api.post(`/boards/${board.id}/invite`, { user_ids: [inviteUserId] });
      toast.success(`${targetUser?.name || "Karyawan"} berhasil diundang ke ${board.name}`);
      setInviteUserId("");
      await load();
      onUpdated?.();
    } catch (err) {
      toast.error(errMsg(err, "Gagal mengundang anggota"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId, userName) => {
    try {
      await api.post(`/boards/${board.id}/remove-member`, { user_id: userId });
      toast.success(`Akses ${userName || "anggota"} ke board ini berhasil dicabut`);
      await load();
      onUpdated?.();
    } catch (err) {
      toast.error(errMsg(err, "Gagal mencabut akses"));
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl border" data-testid="board-members-modal">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white font-bold shadow-xs"
              style={{ background: board?.color || "#10B981" }}
            >
              <Users size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold text-ink truncate">
                Anggota & Hak Akses: {board?.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="rounded-md bg-brand/10 text-brand px-2 py-0.5 text-[11px] font-bold">
                  Divisi: {boardDept}
                </span>
                <span className="text-[11px] text-sub">
                  Total {(deptUsers.length + invitedUsers.length)} orang memiliki akses
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Section: Invite Form */}
          <div className="rounded-2xl border bg-surface2/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus size={14} className="text-brand" />
                Undang Orang / Rekan Lintas Divisi
              </span>
              <span className="text-[11px] text-sub">Bisa undang dari divisi mana saja</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                className="h-10 flex-1 rounded-xl border bg-surface px-3 text-xs sm:text-sm font-medium text-ink outline-none hover:bg-surface2 focus:ring-2 focus:ring-brand/20 cursor-pointer"
                data-testid="invite-user-select"
              >
                <option value="">Pilih rekan kerja untuk diundang...</option>
                {availableToInvite.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} — Divisi {u.department || "General"} ({u.job_title || "Staf"})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleInvite}
                disabled={!inviteUserId || submitting}
                className="h-10 px-4 rounded-xl bg-brand text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                data-testid="submit-invite-btn"
              >
                <UserPlus size={14} />
                <span>Undang</span>
              </button>
            </div>
          </div>

          {/* Section: Kolaborator Diundang (Tamu Lintas Divisi) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Kolaborator Diundang ({invitedUsers.length})
              </span>
              <span className="text-[11px] text-sub">Akses khusus lintas divisi</span>
            </div>

            {invitedUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-sub bg-surface2/30">
                Belum ada rekan dari luar divisi {boardDept} yang diundang ke board ini.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {invitedUsers.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between rounded-xl border bg-surface p-2.5 shadow-2xs hover:bg-surface2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar user={u} size={32} showStatus={false} />
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-bold text-ink">{u.name}</span>
                        <span className="block truncate text-[11px] text-sub">
                          Divisi {u.department || "General"} · {u.job_title || "Staf"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                        Diundang
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(u.user_id, u.name)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Cabut akses"
                        aria-label={`Cabut akses ${u.name}`}
                        data-testid={`remove-invited-${u.user_id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Anggota Otomatis Divisi */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Anggota Otomatis Divisi {boardDept} ({deptUsers.length})
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ Otomatis sinkron
              </span>
            </div>
            <p className="text-[11px] text-sub">
              Semua karyawan dengan divisi <b>{boardDept}</b> otomatis dapat membuka board ini dan mengelola tasklistnya.
            </p>

            {deptUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-sub bg-surface2/30">
                Belum ada karyawan yang terdaftar di divisi {boardDept}.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {deptUsers.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between rounded-xl border bg-surface p-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar user={u} size={32} showStatus={false} />
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-bold text-ink">{u.name}</span>
                        <span className="block truncate text-[11px] text-sub">
                          {u.job_title || "Staf"} · {u.email}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                      Otomatis ({boardDept})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border bg-surface hover:bg-surface2 text-xs font-bold text-ink transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
