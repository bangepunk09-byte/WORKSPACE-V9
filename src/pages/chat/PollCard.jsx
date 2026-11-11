import { useEffect, useState } from "react";
import { BarChart3, Lock, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { api, errMsg } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { AvatarStack } from "../../components/common";

export const POLL_CACHE = {};

export function seedPollCache(poll) {
  if (poll && poll.id) {
    POLL_CACHE[poll.id] = poll;
  }
}

export default function PollCard({ pollId, poll: initial, compact }) {
  const { me, subscribe } = useApp();
  const [p, setP] = useState(() => {
    const resolved = initial || (pollId ? POLL_CACHE[pollId] : null) || null;
    if (resolved && resolved.id) POLL_CACHE[resolved.id] = resolved;
    return resolved;
  });
  const [sel, setSel] = useState(() => {
    const resolved = initial || (pollId ? POLL_CACHE[pollId] : null);
    return Array.isArray(resolved?.my_vote) ? resolved.my_vote : [];
  });

  const load = () =>
    api.get(`/polls/${pollId}`).then((r) => {
      if (r.data) {
        POLL_CACHE[pollId] = r.data;
        setP(r.data);
        setSel(Array.isArray(r.data.my_vote) ? r.data.my_vote : []);
      }
    }).catch(() => {});

  useEffect(() => {
    if (initial && initial.id) {
      POLL_CACHE[initial.id] = initial;
      setP(initial);
      setSel(Array.isArray(initial.my_vote) ? initial.my_vote : []);
    } else if (pollId && POLL_CACHE[pollId]) {
      setP(POLL_CACHE[pollId]);
      setSel(Array.isArray(POLL_CACHE[pollId].my_vote) ? POLL_CACHE[pollId].my_vote : []);
    } else if (pollId) {
      load();
    }
  }, [pollId, initial]); // eslint-disable-line

  useEffect(() => subscribe((e) => {
    if (e.type === "poll:update" && e.data?.poll_id === pollId) {
      if (e.data.poll) {
        setP((prev) => {
          const myVote = Array.isArray(prev?.my_vote) ? prev.my_vote : (e.data.poll.my_vote || []);
          const next = { ...e.data.poll, my_vote: myVote };
          POLL_CACHE[pollId] = next;
          return next;
        });
      } else {
        load();
      }
    }
  }), [subscribe, pollId]); // eslint-disable-line

  if (!p) return <div className="h-36 w-full max-w-sm rounded-2xl border bg-surface p-4" />;
  const open = p.status === "open";
  const myVote = Array.isArray(p.my_vote) ? p.my_vote : [];
  const voted = myVote.length > 0;
  const canVote = open && (!voted || p.allow_change);
  const pick = (id) => setSel(p.multiple ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : [id]);

  const submit = async () => {
    if (!sel.length) return;
    const prevPoll = p;
    const uid = me?.user_id || "user_admin1";
    const nextCounts = { ...(p.counts || {}) };
    const nextVoters = { ...(p.voters || {}) };

    // Remove previous votes by this user
    myVote.forEach((oid) => {
      if (nextCounts[oid] !== undefined) nextCounts[oid] = Math.max(0, nextCounts[oid] - 1);
      if (Array.isArray(nextVoters[oid])) nextVoters[oid] = nextVoters[oid].filter((v) => v !== uid);
    });
    // Add new votes by this user
    sel.forEach((oid) => {
      nextCounts[oid] = (nextCounts[oid] || 0) + 1;
      const curVoters = Array.isArray(nextVoters[oid]) ? nextVoters[oid] : [];
      if (!curVoters.includes(uid)) nextVoters[oid] = [...curVoters, uid];
    });
    const nextTotal = Object.values(nextCounts).reduce((sum, n) => sum + (Number(n) || 0), 0);
    const optimistic = {
      ...p,
      counts: nextCounts,
      voters: nextVoters,
      my_vote: [...sel],
      total_votes: nextTotal
    };
    POLL_CACHE[p.id] = optimistic;
    setP(optimistic);
    toast.success("Vote saved");

    try {
      const { data } = await api.post(`/polls/${p.id}/vote`, { option_ids: sel });
      if (data) {
        POLL_CACHE[p.id] = data;
        setP(data);
      }
    } catch (e) {
      POLL_CACHE[p.id] = prevPoll;
      setP(prevPoll);
      toast.error(errMsg(e));
    }
  };

  return (
    <div className={`w-full ${compact ? "" : "max-w-sm"} rounded-2xl border bg-surface p-4`} data-testid={`poll-card-${p.id}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-sub"><BarChart3 size={14} className="text-brand" />Poll · {p.multiple ? "Multiple choice" : "Single choice"}{p.anonymous && <span className="flex items-center gap-1"><Lock size={11} />Anonymous</span>}</div>
      <p className="mt-2 font-semibold">{p.question}</p>
      <div className="mt-3 space-y-2">
        {(p.options || []).map((o) => {
          const n = p.counts?.[o.id] || 0;
          const pct = p.total_votes ? Math.round((n * 100) / p.total_votes) : 0;
          const on = sel.includes(o.id);
          return (
            <button key={o.id} disabled={!canVote} onClick={() => pick(o.id)} data-testid={`poll-option-${o.id}`}
              className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${on ? "border-[var(--c-accent)]" : ""} disabled:cursor-default`}>
              <span className="absolute inset-y-0 left-0 bg-soft-red transition-all duration-150" style={{ width: `${voted || !open ? pct : 0}%` }} />
              <span className="relative flex items-center gap-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${p.multiple ? "rounded" : "rounded-full"} ${on ? "border-[var(--c-accent)] bg-brand" : ""}`} />
                <span className="flex-1">{o.text}</span>
                {(voted || !open) && <span className="text-xs font-semibold">{pct}%</span>}
              </span>
              {!p.anonymous && (voted || !open) && p.voters?.[o.id]?.length > 0 && <span className="relative mt-1.5 block"><AvatarStack ids={p.voters[o.id]} size={18} /></span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-sub">
        <span data-testid="poll-total-votes">{p.total_votes || 0} {p.total_votes === 1 ? "vote" : "votes"} · <span className={open ? "text-emerald-600" : ""}>{open ? "Open" : "Closed"}</span>{open && p.expires_at && <span className="ml-1 inline-flex items-center gap-1"><Clock size={11} />{formatDistanceToNowStrict(new Date(p.expires_at))} left</span>}</span>
        {canVote && <button onClick={submit} disabled={!sel.length} className="btn-accent h-8 px-3 text-xs font-semibold disabled:opacity-40" data-testid="poll-vote-btn">{voted ? "Change vote" : "Vote"}</button>}
      </div>
    </div>
  );
}

