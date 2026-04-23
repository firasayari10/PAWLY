"use client";

import { useState, useEffect } from "react";
import { RedirectToSignIn, useUser, useAuth } from "@clerk/nextjs";
import Navbar from "@/components/navbar/Navbar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupabaseProfile {
  role: "proprietaire" | "prestataire" | null;
  statut_utilisateur: "particulier" | "professionnel" | null;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  bio: string;
  animaux_acceptes: string[];
  services_proposes: string[];
  statut_compte: string;
  date_creation: string;
  photo_profil: string;
  piece_identite_url?: string;     // Ajouté pour le suivi
  attestation_assurance_url?: string; // Ajouté pour le suivi
}

type Tab = "infos" | "animaux" | "securite";

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ user, size = 80 }: { user: any; size?: number }) {
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  if (user?.imageUrl) {
    return <img src={user.imageUrl} alt="avatar" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #2D9B8A, #7BC8D5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 800, color: "white",
      fontFamily: "'Fraunces', Georgia, serif",
    }}>{initials}</div>
  );
}

// ─── Field row ───────────────────────────────────────────────────────────────

function Field({ label, value, editing, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; editing: boolean;
  onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9B9B", marginBottom: 6 }}>
        {label}
      </label>
      {editing ? (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 12,
            border: "1.5px solid #2D9B8A", background: "#F8FFFE",
            fontSize: 14, color: "#1C1C1C", outline: "none",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <p style={{ fontSize: 14, color: value ? "#1C1C1C" : "#C4B5A5", margin: 0, padding: "10px 0", borderBottom: "1px solid #F0EDE8" }}>
          {value || `Non renseigné`}
        </p>
      )}
    </div>
  );
}

// ─── Chip toggle ─────────────────────────────────────────────────────────────

function ChipToggle({ label, selected, color, onClick }: { label: string; selected: boolean; color: "teal" | "coral"; onClick: () => void }) {
  const bg = selected ? (color === "teal" ? "#2D9B8A" : "#F27E5F") : "white";
  const border = selected ? (color === "teal" ? "#2D9B8A" : "#F27E5F") : "#E8DDD0";
  const text = selected ? "white" : "#6B6B6B";
  return (
    <button onClick={onClick} style={{
      padding: "7px 16px", borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: bg, border: `1.5px solid ${border}`, color: text,
      cursor: "pointer", transition: "all 0.2s ease", margin: "3px",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>{label}</button>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    actif:       { label: "✓ Actif",         bg: "#E8F7F5", color: "#1E7A6B" },
    en_attente:  { label: "⏳ En attente",   bg: "#FEF9E7", color: "#B7860B" },
    suspendu:    { label: "⚠ Suspendu",      bg: "#FDEEE9", color: "#C4532A" },
  };
  const s = map[statut] ?? { label: statut, bg: "#F0EDE8", color: "#6B6B6B" };
  return (
    <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [tab, setTab] = useState<Tab>("infos");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [profile, setProfile] = useState<SupabaseProfile>({
    role: null,
    statut_utilisateur: null,
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
    bio: "",
    animaux_acceptes: [],
    services_proposes: [],
    statut_compte: "en_attente",
    date_creation: "",
    photo_profil: "",
    piece_identite_url: "",
    attestation_assurance_url: "",
  });

  // Load profile from Supabase
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/profile/get-profile?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.profile) setProfile(data.profile); })
      .catch(console.error);
  }, [user?.id]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/profile/complete-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: profile.role,
          statut: profile.statut_utilisateur,
          telephone: profile.telephone,
          adresse: profile.adresse,
          code_postal: profile.code_postal,
          ville: profile.ville,
          bio: profile.bio,
          animaux_acceptes: profile.animaux_acceptes,
          services: profile.services_proposes,
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      setSaveMsg("✓ Profil mis à jour !");
      setEditing(false);
    } catch (e: any) {
      setSaveMsg("❌ " + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  // LOGIQUE D'UPLOAD
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'identite' | 'assurance') {
    if (!e.target.files?.[0] || !user?.id) return;

    const file = e.target.files[0];
    setUploadingDoc(type);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);
    formData.append('type', type);

    try {
      const res = await fetch("/api/profile/upload-doc", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSaveMsg(`✓ Document envoyé avec succès !`);
        // Mise à jour de l'URL localement pour l'affichage immédiat
        setProfile(p => ({
          ...p,
          [type === 'identite' ? 'piece_identite_url' : 'attestation_assurance_url']: data.url
        }));
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch (err) {
      setSaveMsg("❌ Échec de l'envoi du document.");
    } finally {
      setUploadingDoc(null);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  }

  function toggleArray(key: "animaux_acceptes" | "services_proposes", val: string) {
    setProfile((p) => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter((v) => v !== val) : [...p[key], val],
    }));
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Utilisateur";
  const memberSince = profile.date_creation
    ? new Date(profile.date_creation).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "—";

  const ANIMAUX  = ["🐶 Chiens", "🐱 Chats", "🐰 Lapins", "🐦 Oiseaux", "ハム Rongeurs", "🦎 Reptiles"];
  const SERVICES = ["🦮 Promenade", "✂️ Toilettage", "🏠 Visite à domicile", "💊 Médicaments", "🌙 Garde de nuit"];

  return (
    <div style={{ minHeight: "100vh", background: "#FDFBF7", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <Navbar />

      <div style={{ paddingTop: 90, maxWidth: 860, margin: "0 auto", padding: "90px 24px 48px" }}>

        {/* ── Profile header ── */}
        <div style={{
          background: "white", borderRadius: 24, padding: "32px",
          border: "1px solid #E8DDD0", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 24,
          boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
        }}>
          <Avatar user={user} size={80} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, fontWeight: 900, color: "#1C1C1C", margin: 0 }}>
                {fullName}
              </h1>
              <StatusBadge statut={profile.statut_compte} />
            </div>
            <p style={{ fontSize: 13, color: "#9B9B9B", margin: "4px 0 8px" }}>
              {user?.primaryEmailAddress?.emailAddress} · Membre depuis {memberSince}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {profile.role && (
                <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "#E8F7F5", color: "#1E7A6B" }}>
                  {profile.role === "proprietaire" ? "🏠 Propriétaire" : "🐾 Prestataire"}
                </span>
              )}
              {profile.statut_utilisateur && (
                <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "#FEF0EB", color: "#C4532A" }}>
                  {profile.statut_utilisateur === "particulier" ? "👤 Particulier" : "🏢 Professionnel"}
                </span>
              )}
              {profile.ville && (
                <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "#F0EDE8", color: "#6B6B6B" }}>
                  📍 {profile.ville}
                </span>
              )}
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{
              padding: "10px 24px", borderRadius: 99, border: "1.5px solid #2D9B8A",
              background: "white", color: "#2D9B8A", fontSize: 13, fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>
              ✏️ Modifier
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setEditing(false); setSaveMsg(""); }} style={{
                padding: "10px 20px", borderRadius: 99, border: "1.5px solid #E8DDD0",
                background: "white", color: "#6B6B6B", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "10px 24px", borderRadius: 99, border: "none",
                background: "linear-gradient(135deg, #2D9B8A, #1E7A6B)", color: "white",
                fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>
                {saving ? "Enregistrement…" : "💾 Enregistrer"}
              </button>
            </div>
          )}
        </div>

        {saveMsg && (
          <div style={{
            marginBottom: 16, padding: "12px 20px", borderRadius: 12,
            background: saveMsg.startsWith("✓") ? "#E8F7F5" : "#FDEEE9",
            color: saveMsg.startsWith("✓") ? "#1E7A6B" : "#C4532A",
            fontSize: 13, fontWeight: 600,
            transition: "all 0.3s ease"
          }}>{saveMsg}</div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "white", padding: 6, borderRadius: 16, border: "1px solid #E8DDD0", width: "fit-content" }}>
          {([ ["infos", "👤 Informations"], ["animaux", "🐾 Animaux & Services"], ["securite", "🔒 Sécurité"] ] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "9px 20px", borderRadius: 12, border: "none",
              background: tab === id ? "#2D9B8A" : "transparent",
              color: tab === id ? "white" : "#6B6B6B",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s ease",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>{label}</button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ background: "white", borderRadius: 24, padding: "32px", border: "1px solid #E8DDD0", boxShadow: "0 2px 20px rgba(0,0,0,0.04)" }}>

          {/* TAB: Informations */}
          {tab === "infos" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              <Field label="Prénom" value={user?.firstName ?? ""} editing={false} onChange={() => {}} placeholder="Géré par Clerk" />
              <Field label="Nom" value={user?.lastName ?? ""} editing={false} onChange={() => {}} placeholder="Géré par Clerk" />
              <Field label="Email" value={user?.primaryEmailAddress?.emailAddress ?? ""} editing={false} onChange={() => {}} />
              <Field label="Téléphone" value={profile.telephone}
                editing={editing} onChange={(v) => setProfile(p => ({ ...p, telephone: v }))}
                placeholder="06 12 34 56 78" type="tel" />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Adresse" value={profile.adresse}
                  editing={editing} onChange={(v) => setProfile(p => ({ ...p, adresse: v }))}
                  placeholder="12 rue des Lilas" />
              </div>
              <Field label="Code postal" value={profile.code_postal}
                editing={editing} onChange={(v) => setProfile(p => ({ ...p, code_postal: v }))}
                placeholder="75011" />
              <Field label="Ville" value={profile.ville}
                editing={editing} onChange={(v) => setProfile(p => ({ ...p, ville: v }))}
                placeholder="Paris" />

              {editing && (
                <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9B9B", marginBottom: 10 }}>
                    Rôle
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    {(["proprietaire", "prestataire"] as const).map((r) => (
                      <button key={r} onClick={() => setProfile(p => ({ ...p, role: r }))} style={{
                        flex: 1, padding: "12px 16px", borderRadius: 14,
                        border: `2px solid ${profile.role === r ? "#2D9B8A" : "#E8DDD0"}`,
                        background: profile.role === r ? "#E8F7F5" : "white",
                        color: profile.role === r ? "#1E7A6B" : "#6B6B6B",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        {r === "proprietaire" ? "🏠 Propriétaire" : "🐾 Prestataire"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Animaux & Services */}
          {tab === "animaux" && (
            <div>
              {profile.role !== "prestataire" && !editing ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9B9B9B" }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🐾</p>
                  <p style={{ fontSize: 14 }}>Cette section est réservée aux prestataires.</p>
                  <button onClick={() => { setTab("infos"); setEditing(true); }} style={{
                    marginTop: 16, padding: "10px 24px", borderRadius: 99,
                    background: "#2D9B8A", color: "white", border: "none",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}>Devenir prestataire</button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9B9B", marginBottom: 12 }}>
                      Animaux acceptés
                    </label>
                    <div>
                      {ANIMAUX.map(a => (
                        <ChipToggle key={a} label={a} color="teal"
                          selected={profile.animaux_acceptes.includes(a)}
                          onClick={() => editing && toggleArray("animaux_acceptes", a)} />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9B9B", marginBottom: 12 }}>
                      Services proposés
                    </label>
                    <div>
                      {SERVICES.map(s => (
                        <ChipToggle key={s} label={s} color="coral"
                          selected={profile.services_proposes.includes(s)}
                          onClick={() => editing && toggleArray("services_proposes", s)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9B9B", marginBottom: 8 }}>
                      Bio / Présentation
                    </label>
                    {editing ? (
                      <textarea rows={4} value={profile.bio}
                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Parlez de vous et de votre expérience avec les animaux…"
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 12,
                          border: "1.5px solid #2D9B8A", background: "#F8FFFE",
                          fontSize: 14, color: "#1C1C1C", outline: "none", resize: "vertical",
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }} />
                    ) : (
                      <p style={{ fontSize: 14, color: profile.bio ? "#1C1C1C" : "#C4B5A5", lineHeight: 1.6 }}>
                        {profile.bio || "Non renseigné"}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Sécurité & Documents */}
          {tab === "securite" && (
            <div>
              <div style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 16, background: "#F8FFFE", border: "1px solid #C8EDE8" }}>
                <p style={{ fontSize: 12, color: "#1E7A6B", fontWeight: 600, margin: 0 }}>
                  🔒 La gestion du mot de passe et des appareils connectés est assurée par Clerk.
                </p>
              </div>

              {/* SECTION DOCUMENTS DE CONFIANCE */}
              <div style={{ marginBottom: 32, padding: 24, background: '#FDFBF7', borderRadius: 20, border: '1.5px dashed #2D9B8A' }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: '#1E7A6B', marginBottom: 8 }}>
                  Vérification de confiance 🛡️
                </h3>
                <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>
                  Transmettez vos documents pour devenir un membre certifié PAWLY.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9B9B9B', marginBottom: 8, textTransform: 'uppercase' }}>
                      Pièce d'identité {profile.piece_identite_url && <span style={{ color: '#1E7A6B' }}>✓</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'identite')}
                      disabled={!!uploadingDoc}
                      style={{ fontSize: 12, width: '100%' }}
                    />
                    {uploadingDoc === 'identite' && <p style={{ color: '#2D9B8A', fontSize: 11, marginTop: 4 }}>Chargement...</p>}
                    {profile.piece_identite_url && !uploadingDoc && <p style={{ color: '#1E7A6B', fontSize: 11, marginTop: 4 }}>Document reçu</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9B9B9B', marginBottom: 8, textTransform: 'uppercase' }}>
                      Attestation d'assurance {profile.attestation_assurance_url && <span style={{ color: '#1E7A6B' }}>✓</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'assurance')}
                      disabled={!!uploadingDoc}
                      style={{ fontSize: 12, width: '100%' }}
                    />
                    {uploadingDoc === 'assurance' && <p style={{ color: '#F27E5F', fontSize: 11, marginTop: 4 }}>Chargement...</p>}
                    {profile.attestation_assurance_url && !uploadingDoc && <p style={{ color: '#1E7A6B', fontSize: 11, marginTop: 4 }}>Document reçu</p>}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B9B9B" }}>
                  Statut du compte
                </label>
                <div style={{ marginTop: 8 }}>
                  <StatusBadge statut={profile.statut_compte} />
                </div>
              </div>

              <div style={{ borderTop: "1px solid #F0EDE8", paddingTop: 24 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#C4532A" }}>
                  Zone de danger
                </label>
                <p style={{ fontSize: 13, color: "#9B9B9B", margin: "8px 0 12px" }}>
                  La suppression de votre compte est définitive et irréversible.
                </p>
                <button style={{
                  padding: "10px 24px", borderRadius: 99,
                  border: "1.5px solid #F27E5F", background: "white",
                  color: "#C4532A", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>
                  Supprimer mon compte
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}