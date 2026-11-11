import { useState, useEffect } from "react";
import { Camera, Save, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import { api, errMsg, uploadFile, fileUrl } from "../../lib/api";
import { PRESET_AVATARS } from "../../lib/avatars";
import { Card } from "./AdminPanels";

const DEFAULT_DEPARTMENTS = ["Management", "Marketing", "Sales", "IT", "Finance", "Legal", "HRGA"];

export function UserProfileSettings() {
  const { me, ws, setSession, reloadUsers } = useApp();
  const [f, setF] = useState({
    name: me?.name || "",
    job_title: me?.job_title || "",
    department: me?.department || "Marketing",
    phone: me?.phone || "",
    bio: me?.bio || "",
    avatar: me?.avatar || me?.picture || PRESET_AVATARS[0],
    custom_fields: me?.custom_fields || {}
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    setF({
      name: me.name || "",
      job_title: me.job_title || "",
      department: me.department || "Marketing",
      phone: me.phone || "",
      bio: me.bio || "",
      avatar: me.avatar || me.picture || PRESET_AVATARS[0],
      custom_fields: me.custom_fields || {}
    });
  }, [me]);

  const baseDivisions = Array.isArray(ws?.divisions) && ws.divisions.length > 0 ? ws.divisions : DEFAULT_DEPARTMENTS;
  const departments = Array.from(new Set([...baseDivisions, f.department].filter(Boolean)));
  const customProfileFields = Array.isArray(ws?.profile_fields) ? ws.profile_fields : [];

  const handleSelectPresetAvatar = async (avUrl) => {
    setF((prev) => ({ ...prev, avatar: avUrl, picture: avUrl }));
    try {
      const targetId = me?.user_id || "me";
      const { data } = await api.patch(`/users/${targetId}`, { avatar: avUrl, picture: avUrl });
      setSession((s) => {
        const next = {
          ...s,
          user: { ...s?.user, ...data, avatar: avUrl, picture: avUrl }
        };
        try { localStorage.setItem("circle_session_cache", JSON.stringify(next)); } catch {}
        return next;
      });
      reloadUsers();
      toast.success("Avatar profil berhasil diperbarui!");
    } catch (err) {
      toast.error(errMsg(err, "Gagal memperbarui avatar"));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Pilih file gambar untuk foto profil");
    try {
      const up = await uploadFile(file);
      const url = fileUrl(up.id);
      setF((prev) => ({ ...prev, avatar: url, picture: url }));

      const targetId = me?.user_id || "me";
      const { data } = await api.patch(`/users/${targetId}`, { avatar: url, picture: url });
      setSession((s) => {
        const next = {
          ...s,
          user: { ...s?.user, ...data, avatar: url, picture: url }
        };
        try { localStorage.setItem("circle_session_cache", JSON.stringify(next)); } catch {}
        return next;
      });
      reloadUsers();
      toast.success("Foto profil berhasil diperbarui!");
    } catch (err) {
      toast.error(errMsg(err, "Gagal mengupload foto profil"));
    } finally {
      e.target.value = "";
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!f.name.trim()) {
      return toast.error("Nama lengkap wajib diisi.");
    }
    setBusy(true);
    try {
      const payload = {
        ...f,
        name: f.name.trim(),
        avatar: f.avatar || f.picture || "",
        picture: f.avatar || f.picture || ""
      };
      const targetId = me?.user_id || "me";
      const { data } = await api.patch(`/users/${targetId}`, payload);
      setSession((s) => {
        const next = {
          ...s,
          user: { ...s?.user, ...data, avatar: data.avatar || data.picture, picture: data.avatar || data.picture }
        };
        try { localStorage.setItem("circle_session_cache", JSON.stringify(next)); } catch {}
        return next;
      });
      reloadUsers();
      toast.success("Data diri lengkap & divisi organisasi berhasil disimpan!");
    } catch (err) {
      toast.error(errMsg(err, "Gagal menyimpan data diri"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Data Diri Lengkap" testid="user-profile-settings-card">
      <form onSubmit={handleSave} className="space-y-4 pt-1">
        <p className="text-xs text-sub leading-relaxed">
          Ubah informasi profil dan data diri Anda yang akan dilihat oleh rekan kerja di seluruh workspace CIRCLE.
        </p>

        {/* Avatar Upload & Preset Selector */}
        <div className="rounded-2xl border bg-surface2/50 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={f.avatar || PRESET_AVATARS[0]}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-full object-cover border-2 border-brand/40 shadow-sm"
                  onError={(e) => { e.currentTarget.src = PRESET_AVATARS[0]; }}
                />
                <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand/90 transition-colors" title="Upload foto profil">
                  <Camera size={13} />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">{f.name || "Nama Pengguna"}</h4>
                <p className="text-xs text-sub">{me?.email}</p>
                <p className="mt-1 text-[11px] font-semibold text-brand">Role: {me?.role?.replace(/_/g, " ").toUpperCase()}</p>
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity cursor-pointer">
              <Upload size={14} />
              <span>Upload Foto</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" data-testid="profile-upload-photo-input" />
            </label>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold text-sub">Pilih Avatar Karakter:</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_AVATARS.slice(0, 6).map((avUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPresetAvatar(avUrl)}
                  className={`relative h-10 w-10 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 cursor-pointer ${
                    f.avatar === avUrl ? "border-brand ring-2 ring-brand/30 scale-105" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  data-testid={`profile-avatar-option-${idx}`}
                >
                  <img src={avUrl} alt={`Avatar ${idx + 1}`} className="h-full w-full object-cover" />
                  {f.avatar === avUrl && (
                    <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-white">
                      <Check size={8} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-sub">Nama Lengkap *</label>
            <input
              required
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Nama lengkap Anda"
              className="h-10 w-full rounded-xl border bg-surface2 px-3 text-xs outline-none focus:border-brand"
              data-testid="profile-name-input"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-sub">Alamat Email</label>
            <input
              disabled
              value={me?.email || ""}
              className="h-10 w-full rounded-xl border bg-surface2/50 px-3 text-xs text-sub cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-sub">Divisi / Departemen</label>
            <select
              value={f.department}
              onChange={(e) => setF({ ...f, department: e.target.value })}
              className="h-10 w-full rounded-xl border bg-surface2 px-2.5 text-xs font-medium outline-none text-ink"
              data-testid="profile-dept-select"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-sub">Jabatan / Posisi</label>
            <input
              value={f.job_title}
              onChange={(e) => setF({ ...f, job_title: e.target.value })}
              placeholder="Mis. Senior Software Engineer"
              className="h-10 w-full rounded-xl border bg-surface2 px-3 text-xs outline-none focus:border-brand"
              data-testid="profile-title-input"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-sub">Nomor Telepon / WhatsApp</label>
          <input
            value={f.phone || ""}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            placeholder="+62 812-3456-7890"
            className="h-10 w-full rounded-xl border bg-surface2 px-3 text-xs outline-none focus:border-brand"
            data-testid="profile-phone-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-sub">Bio / Tentang Saya</label>
          <textarea
            rows={3}
            value={f.bio || ""}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
            placeholder="Tuliskan sedikit tentang keahlian atau fokus kerja Anda..."
            className="w-full rounded-xl border bg-surface2 p-3 text-xs outline-none focus:border-brand resize-none"
            data-testid="profile-bio-input"
          />
        </div>

        {customProfileFields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
            {customProfileFields.map((cf) => (
              <div key={cf.key}>
                <label className="mb-1 block text-xs font-semibold text-sub">{cf.name}</label>
                {cf.type === "dropdown" && Array.isArray(cf.options) && cf.options.length > 0 ? (
                  <select
                    value={f.custom_fields?.[cf.key] || ""}
                    onChange={(e) => setF({ ...f, custom_fields: { ...(f.custom_fields || {}), [cf.key]: e.target.value } })}
                    className="h-10 w-full rounded-xl border bg-surface2 px-2.5 text-xs outline-none text-ink"
                  >
                    <option value="">Pilih {cf.name}...</option>
                    {cf.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={cf.type === "date" ? "date" : cf.type === "url" ? "url" : "text"}
                    value={f.custom_fields?.[cf.key] || ""}
                    onChange={(e) => setF({ ...f, custom_fields: { ...(f.custom_fields || {}), [cf.key]: e.target.value } })}
                    placeholder={cf.name}
                    className="h-10 w-full rounded-xl border bg-surface2 px-3 text-xs outline-none focus:border-brand"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <button
            type="submit"
            disabled={busy}
            className="btn-accent flex h-10 items-center gap-2 rounded-full px-5 text-xs font-semibold shadow-xs disabled:opacity-50"
            data-testid="profile-save-btn"
          >
            <Save size={14} />
            <span>{busy ? "Menyimpan..." : "Simpan Perubahan Profil"}</span>
          </button>
        </div>
      </form>
    </Card>
  );
}
