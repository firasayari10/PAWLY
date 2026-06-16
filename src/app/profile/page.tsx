"use client";

import { useEffect, useState } from "react";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { Check, House, PawPrint, TriangleAlert } from "lucide-react";
import { useSyncClerkUser } from "./sync-user";
import { OcrUpload, type OcrFields } from "@/components/ocr-upload";
import { AuthNavbar } from "@/components/auth-navbar";
import { AnimalIcon } from "@/components/icons";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrestataireProfil {
  id: string;
  bio: string;
  tarif_jour: number;
  types_animaux: string[];
  rayon_km: number;
  annees_experience: number;
  note_moyenne: number;
  nb_avis: number;
  disponible: boolean;
}

interface SupabaseProfile {
  id_user: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  photo_profil: string;
  role: string;
  statut_compte: string;
  email_verifie: boolean;
  date_creation: string;
  prestataire_profil: PrestataireProfil | null;
}

const ANIMAL_OPTIONS = [
  { value: "chien",   label: "Chien" },
  { value: "chat",    label: "Chat" },
  { value: "lapin",   label: "Lapin" },
  { value: "oiseau",  label: "Oiseau" },
  { value: "rongeur", label: "Rongeur" },
  { value: "reptile", label: "Reptile" },
];

// ── Status badge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    en_attente: {
      label: "En attente de validation",
      cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40",
    },
    actif: {
      label: "Actif",
      cls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/40",
    },
    suspendu: {
      label: "Suspendu",
      cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40",
    },
  };
  const { label, cls } = map[statut] ?? {
    label: statut,
    cls: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label, name, value, onChange, disabled = false, type = "text",
}: {
  label: string; name: string; value: string;
  onChange?: (v: string) => void; disabled?: boolean; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`rounded-xl border px-4 py-2.5 text-sm outline-none transition
          ${disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-500"
            : "border-zinc-300 bg-white text-zinc-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:border-teal-500"
          }`}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  useSyncClerkUser();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [profile, setProfile]   = useState<SupabaseProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [prenom,      setPrenom]      = useState("");
  const [nom,         setNom]         = useState("");
  const [telephone,   setTelephone]   = useState("");
  const [adresse,     setAdresse]     = useState("");
  const [codePostal,  setCodePostal]  = useState("");
  const [ville,       setVille]       = useState("");
  const [role,        setRole]        = useState("proprietaire");

  // Prestataire-specific fields
  const [bio,              setBio]              = useState("");
  const [tarifJour,        setTarifJour]        = useState("");
  const [typesAnimaux,     setTypesAnimaux]     = useState<string[]>([]);
  const [rayonKm,          setRayonKm]          = useState("");
  const [anneesExperience, setAnneesExperience] = useState("");

  const isEmailVerified =
    user?.primaryEmailAddress?.verification?.status === "verified";

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile: p }: { profile: SupabaseProfile }) => {
        if (!p) return;
        setProfile(p);
        setPrenom(p.prenom        ?? "");
        setNom(p.nom              ?? "");
        setTelephone(p.telephone  ?? "");
        setAdresse(p.adresse      ?? "");
        setCodePostal(p.code_postal ?? "");
        setVille(p.ville          ?? "");
        setRole(p.role            ?? "proprietaire");
        if (p.prestataire_profil) {
          setBio(p.prestataire_profil.bio              ?? "");
          setTarifJour(p.prestataire_profil.tarif_jour != null ? String(p.prestataire_profil.tarif_jour) : "");
          setTypesAnimaux(p.prestataire_profil.types_animaux ?? []);
          setRayonKm(p.prestataire_profil.rayon_km != null ? String(p.prestataire_profil.rayon_km) : "");
          setAnneesExperience(p.prestataire_profil.annees_experience != null ? String(p.prestataire_profil.annees_experience) : "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = { prenom, nom, telephone, adresse, code_postal: codePostal, ville, role };
      if (role === "prestataire") {
        body.bio              = bio;
        body.tarif_jour       = tarifJour       ? parseFloat(tarifJour)       : undefined;
        body.types_animaux    = typesAnimaux;
        body.rayon_km         = rayonKm         ? parseFloat(rayonKm)         : undefined;
        body.annees_experience = anneesExperience ? parseInt(anneesExperience) : undefined;
      }
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error ?? "Erreur inconnue." });
      } else {
        setProfile(data.profile);
        if (data.profile?.prestataire_profil) {
          const pp = data.profile.prestataire_profil;
          setBio(pp.bio ?? "");
          setTarifJour(pp.tarif_jour != null ? String(pp.tarif_jour) : "");
          setTypesAnimaux(pp.types_animaux ?? []);
          setRayonKm(pp.rayon_km != null ? String(pp.rayon_km) : "");
          setAnneesExperience(pp.annees_experience != null ? String(pp.annees_experience) : "");
        }
        setFeedback({ ok: true, msg: "Profil enregistré avec succès !" });
      }
    } catch {
      setFeedback({ ok: false, msg: "Erreur réseau. Réessayez." });
    } finally {
      setSaving(false);
    }
  }

  // ── Auth guards ───────────────────────────────────────────────────────────
  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <AuthNavbar />

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-28">

        {/* ── Email verification banner ── */}
        {!isEmailVerified && user && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Votre adresse email n&apos;est pas encore vérifiée.{" "}
              <span className="font-semibold">Vérifiez votre boîte mail</span> et cliquez sur le lien de confirmation. Sans vérification, certaines fonctionnalités peuvent être limitées.
            </p>
          </div>
        )}

        {/* ── Profile header ── */}
        <div className="mb-8 flex items-center gap-5">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Avatar"
              className="h-20 w-20 rounded-full border-4 border-zinc-200 object-cover dark:border-zinc-700"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-zinc-200 bg-gradient-to-br from-teal-500 to-teal-600 font-serif text-3xl font-bold text-white dark:border-zinc-700">
              {(prenom?.[0] ?? user?.firstName?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-serif text-2xl font-black text-zinc-800 dark:text-zinc-100">
              {prenom || user?.firstName || "Mon profil"}
              {nom ? ` ${nom}` : ""}
            </h1>
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            {profile && <StatutBadge statut={profile.statut_compte} />}
          </div>
        </div>

        {/* ── Form ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-teal-600 dark:border-zinc-700 dark:border-t-teal-400" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800">

            {/* ── OCR carte d'identité ── */}
            <h2 className="mb-3 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">
              Vérification d&apos;identité
            </h2>
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Carte d&apos;identité — remplissage automatique
              </p>
              <OcrUpload
                type="identite"
                onExtracted={(fields: OcrFields) => {
                  if (fields.prenom)      setPrenom(fields.prenom);
                  if (fields.nom)         setNom(fields.nom);
                  if (fields.adresse)     setAdresse(fields.adresse);
                  if (fields.code_postal) setCodePostal(fields.code_postal);
                  if (fields.ville)       setVille(fields.ville);
                }}
              />
            </div>

            {/* Identity fields */}
            <h2 className="mb-4 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">
              Informations personnelles
            </h2>
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <Field label="Prénom"    name="prenom"    value={prenom}    onChange={setPrenom} />
              <Field label="Nom"       name="nom"       value={nom}       onChange={setNom} />
              <Field
                label="Email"
                name="email"
                value={user?.primaryEmailAddress?.emailAddress ?? ""}
                disabled
              />
              <Field label="Téléphone" name="telephone" value={telephone} onChange={setTelephone} type="tel" />
            </div>

            {/* ── OCR attestation d'assurance ── */}
            <h2 className="mb-3 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">
              Adresse
            </h2>
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Attestation d&apos;assurance — remplissage automatique
              </p>
              <OcrUpload
                type="assurance"
                onExtracted={(fields: OcrFields) => {
                  if (fields.adresse)     setAdresse(fields.adresse);
                  if (fields.code_postal) setCodePostal(fields.code_postal);
                  if (fields.ville)       setVille(fields.ville);
                }}
              />
            </div>

            {/* Address fields */}
            <div className="mb-6 grid gap-4">
              <Field label="Adresse"     name="adresse"     value={adresse}    onChange={setAdresse} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Code postal" name="code_postal" value={codePostal} onChange={setCodePostal} />
                <Field label="Ville"       name="ville"       value={ville}      onChange={setVille} />
              </div>
            </div>

            {/* Role */}
            <h2 className="mb-3 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">
              Mon rôle sur PAWLY
            </h2>
            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              {[
                { value: "proprietaire", Icon: PawPrint, title: "Propriétaire d'animal",  sub: "Je cherche un gardien pour mon animal" },
                { value: "prestataire",  Icon: House,    title: "Prestataire de garde",   sub: "Je propose des services de garde" },
              ].map(({ value, Icon, title, sub }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition
                    ${role === value
                      ? "border-teal-500 bg-teal-50 dark:border-teal-500 dark:bg-teal-900/20"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="mt-0.5 accent-teal-600"
                  />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      <Icon className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden /> {title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Prestataire profile section */}
            {role === "prestataire" && (
              <div className="mb-8">
                <h2 className="mb-4 font-serif text-lg font-bold text-zinc-800 dark:text-zinc-100">
                  Profil prestataire
                </h2>

                {/* Bio */}
                <div className="mb-4 flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Biographie
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Décrivez votre expérience et vos services…"
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:border-teal-500"
                  />
                </div>

                {/* Tarif + Rayon + Expérience */}
                <div className="mb-4 grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Tarif (€/jour)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={tarifJour}
                      onChange={(e) => setTarifJour(e.target.value)}
                      placeholder="30"
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:border-teal-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Rayon (km)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={rayonKm}
                      onChange={(e) => setRayonKm(e.target.value)}
                      placeholder="10"
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:border-teal-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Années d&apos;expérience
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={anneesExperience}
                      onChange={(e) => setAnneesExperience(e.target.value)}
                      placeholder="2"
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Animals */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Animaux acceptés
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ANIMAL_OPTIONS.map(({ value, label }) => {
                      const checked = typesAnimaux.includes(value);
                      return (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition
                            ${checked
                              ? "border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400 dark:hover:border-zinc-500"
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setTypesAnimaux(
                                checked
                                  ? typesAnimaux.filter((a) => a !== value)
                                  : [...typesAnimaux, value],
                              )
                            }
                            className="sr-only"
                          />
                          <AnimalIcon type={value} className="h-3.5 w-3.5" /> {label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium
                ${feedback.ok
                  ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-400"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
                }`}>
                {feedback.ok ? (
                  <Check className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
                ) : (
                  <TriangleAlert className="mr-1 inline-block h-4 w-4 align-text-bottom" aria-hidden />
                )}
                {feedback.msg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-600"
            >
              {saving ? "Enregistrement…" : "Enregistrer le profil"}
            </button>
          </form>
        )}

        {/* Account footer */}
        {profile && (
          <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Compte créé le{" "}
            {new Date(profile.date_creation).toLocaleDateString("fr-FR", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        )}
      </main>
    </div>
  );
}