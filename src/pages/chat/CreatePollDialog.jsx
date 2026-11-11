import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { seedPollCache } from "./PollCard";

export default function CreatePollDialog({ open, onOpenChange, conversationId, onCreated, onSubmitPoll }) {
  const { me } = useApp();
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [flags, setFlags] = useState({ multiple: false, anonymous: false, allow_change: true });
  const [exp, setExp] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cleanQ = q.trim();
    const cleanOpts = opts.map((x) => x.trim()).filter(Boolean);
    if (!cleanQ) {
      toast.error("Pertanyaan polling wajib diisi");
      return;
    }
    if (cleanOpts.length < 2) {
      toast.error("Masukkan minimal 2 pilihan jawaban");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        question: cleanQ,
        options: cleanOpts,
        ...flags,
        expires_at: exp ? new Date(exp).toISOString() : null
      };

      if (onSubmitPoll) {
        await onSubmitPoll(payload);
        setQ("");
        setOpts(["", ""]);
        setExp("");
        onOpenChange(false);
      } else {
        const tempPollId = `poll_opt_${Date.now()}`;
        const tempMsgId = `msg_poll_opt_${Date.now()}`;
        const optItems = cleanOpts.map((text, idx) => ({ id: `opt_${idx + 1}`, text }));
        const optimisticPoll = {
          id: tempPollId,
          conversation_id: conversationId,
          question: cleanQ,
          multiple: !!flags.multiple,
          anonymous: !!flags.anonymous,
          allow_change: flags.allow_change !== false,
          expires_at: payload.expires_at,
          status: "open",
          created_by: me?.user_id || "user_admin1",
          options: optItems,
          counts: Object.fromEntries(optItems.map((o) => [o.id, 0])),
          voters: Object.fromEntries(optItems.map((o) => [o.id, []])),
          my_vote: [],
          total_votes: 0
        };
        seedPollCache(optimisticPoll);

        const optimisticMsg = {
          id: tempMsgId,
          conversation_id: conversationId,
          sender_id: me?.user_id || "user_admin1",
          user_id: me?.user_id || "user_admin1",
          type: "poll",
          poll_id: tempPollId,
          poll: optimisticPoll,
          text: `📊 Poll: ${cleanQ}`,
          created_at: new Date().toISOString(),
          _optimistic: true
        };

        setQ("");
        setOpts(["", ""]);
        setExp("");
        onOpenChange(false);
        onCreated?.(optimisticMsg);

        const { data } = await api.post(`/conversations/${conversationId}/polls`, payload);
        const realPoll = data?.poll || (data?.question ? data : null);
        if (realPoll) seedPollCache(realPoll);
        const realMsg = data?.message || (realPoll ? {
          ...optimisticMsg,
          id: `msg_${Date.now()}`,
          poll_id: realPoll.id,
          poll: realPoll,
          _optimistic: false
        } : null);
        if (realMsg) {
          onCreated?.(realMsg, tempMsgId);
        }
        toast.success("Polling berhasil dibuat");
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface rounded-3xl max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Buat Polling</DialogTitle></DialogHeader>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tulis pertanyaan polling…" className="h-11 rounded-xl border bg-surface2 px-3 text-sm outline-none" data-testid="poll-question-input" />
        <div className="space-y-2">
          {opts.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Pilihan ${i + 1}`} className="h-10 flex-1 rounded-xl border bg-surface px-3 text-sm outline-none" data-testid={`poll-option-input-${i}`} />
              {opts.length > 2 && <button type="button" onClick={() => setOpts(opts.filter((_, j) => j !== i))} className="text-sub hover:text-rose-500" aria-label="Remove option"><X size={16} /></button>}
            </div>
          ))}
          {opts.length < 12 && <button type="button" onClick={() => setOpts([...opts, ""])} className="flex items-center gap-1 text-sm font-semibold text-brand" data-testid="poll-add-option-btn"><Plus size={14} />Tambah pilihan</button>}
        </div>
        {[["multiple", "Izinkan pilih lebih dari satu"], ["anonymous", "Voting anonim"], ["allow_change", "Izinkan ubah pilihan"]].map(([k, l]) => (
          <label key={k} className="flex items-center justify-between text-sm">{l}<Switch checked={flags[k]} onCheckedChange={(v) => setFlags({ ...flags, [k]: v })} data-testid={`poll-flag-${k}`} /></label>
        ))}
        <label className="text-sm">Batas waktu (opsional)<input type="datetime-local" value={exp} onChange={(e) => setExp(e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-surface px-3 text-sm" data-testid="poll-expiry-input" /></label>
        <button type="button" onClick={submit} disabled={busy} className="btn-accent h-11 font-semibold disabled:opacity-50" data-testid="poll-submit-btn">{busy ? "Membuat..." : "Posting Polling"}</button>
      </DialogContent>
    </Dialog>
  );
}
