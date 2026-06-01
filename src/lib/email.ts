import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Sender — use your verified domain in production.
// For testing with Resend's sandbox, use onboarding@resend.dev (sends only to your Resend account email).
const FROM = "PAWLY <onboarding@resend.dev>";

export interface OffreDetails {
  nomAnimal:    string;
  typeAnimal:   string;
  nbAnimaux:    number;
  dateDebut:    string;  // ISO date string
  dateFin:      string;
  tarifTotal:   number | null;
  prestataire:  { prenom: string; nom: string };
  proprietaire: { prenom: string; nom: string; email: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export async function sendConfirmationEmail(offre: OffreDetails) {
  const { proprietaire: prop, prestataire: prest, nomAnimal, dateDebut, dateFin, tarifTotal } = offre;
  await resend.emails.send({
    from:    FROM,
    to:      prop.email,
    subject: `✅ Demande de garde acceptée — ${nomAnimal}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0d9488">Bonne nouvelle, ${prop.prenom} !</h2>
        <p><strong>${prest.prenom} ${prest.nom}</strong> a <strong>accepté</strong> votre demande de garde.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Animal</td><td style="padding:8px;font-weight:600">${nomAnimal}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Période</td><td style="padding:8px;font-weight:600">${formatDate(dateDebut)} → ${formatDate(dateFin)}</td></tr>
          ${tarifTotal != null ? `<tr><td style="padding:8px;color:#6b7280">Tarif total</td><td style="padding:8px;font-weight:600;color:#0d9488">${tarifTotal} €</td></tr>` : ""}
        </table>
        <p style="color:#6b7280;font-size:14px">Vous pouvez contacter ${prest.prenom} directement pour organiser la prise en charge.</p>
        <p style="color:#0d9488;font-weight:700">L'équipe PAWLY 🐾</p>
      </div>`,
  });
}

export async function sendPaymentReceiptEmail(offre: OffreDetails) {
  const { proprietaire: prop, prestataire: prest, nomAnimal, dateDebut, dateFin, tarifTotal } = offre;
  await resend.emails.send({
    from:    FROM,
    to:      prop.email,
    subject: `🧾 Reçu de paiement — garde de ${nomAnimal}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0d9488">Merci, ${prop.prenom} !</h2>
        <p>Votre paiement a bien été reçu. La garde de <strong>${nomAnimal}</strong> est confirmée.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Prestataire</td><td style="padding:8px;font-weight:600">${prest.prenom} ${prest.nom}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Période</td><td style="padding:8px;font-weight:600">${formatDate(dateDebut)} → ${formatDate(dateFin)}</td></tr>
          ${tarifTotal != null ? `<tr><td style="padding:8px;color:#6b7280">Montant payé</td><td style="padding:8px;font-weight:700;color:#0d9488">${tarifTotal} €</td></tr>` : ""}
        </table>
        <p style="color:#6b7280;font-size:14px">Le montant est conservé sous séquestre et libéré au prestataire à la fin de la prestation.</p>
        <p style="color:#0d9488;font-weight:700">L'équipe PAWLY 🐾</p>
      </div>`,
  });
}

export async function sendPaymentNoticeToSitter(offre: OffreDetails & { prestataireEmail: string }) {
  const { prestataire: prest, nomAnimal, dateDebut, dateFin, tarifTotal, prestataireEmail } = offre;
  await resend.emails.send({
    from:    FROM,
    to:      prestataireEmail,
    subject: `💰 Paiement reçu — garde de ${nomAnimal}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0d9488">Bonne nouvelle, ${prest.prenom} !</h2>
        <p>Le propriétaire a payé la garde de <strong>${nomAnimal}</strong>. La réservation est confirmée.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Période</td><td style="padding:8px;font-weight:600">${formatDate(dateDebut)} → ${formatDate(dateFin)}</td></tr>
          ${tarifTotal != null ? `<tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Montant</td><td style="padding:8px;font-weight:700;color:#0d9488">${tarifTotal} €</td></tr>` : ""}
        </table>
        <p style="color:#6b7280;font-size:14px">Le montant vous sera libéré à la fin de la prestation.</p>
        <p style="color:#0d9488;font-weight:700">L'équipe PAWLY 🐾</p>
      </div>`,
  });
}

export async function sendCancellationEmail(offre: OffreDetails & { refunded: boolean }) {
  const { proprietaire: prop, nomAnimal, dateDebut, dateFin, tarifTotal, refunded } = offre;
  await resend.emails.send({
    from:    FROM,
    to:      prop.email,
    subject: `🚫 Réservation annulée — ${nomAnimal}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">Réservation annulée</h2>
        <p>Bonjour ${prop.prenom}, votre réservation pour <strong>${nomAnimal}</strong> a bien été annulée.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Période</td><td style="padding:8px;font-weight:600">${formatDate(dateDebut)} → ${formatDate(dateFin)}</td></tr>
          ${tarifTotal != null ? `<tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Montant</td><td style="padding:8px;font-weight:600">${tarifTotal} €</td></tr>` : ""}
        </table>
        ${refunded
          ? `<p style="color:#0d9488;font-weight:600">Votre paiement a été intégralement remboursé. Le remboursement apparaîtra sous quelques jours sur votre moyen de paiement.</p>`
          : `<p style="color:#6b7280;font-size:14px">Aucun paiement n'avait été effectué pour cette réservation.</p>`}
        <p style="color:#0d9488;font-weight:700;margin-top:24px">L'équipe PAWLY 🐾</p>
      </div>`,
  });
}

export async function sendRefusalEmail(offre: OffreDetails) {
  const { proprietaire: prop, prestataire: prest, nomAnimal, dateDebut, dateFin } = offre;
  await resend.emails.send({
    from:    FROM,
    to:      prop.email,
    subject: `❌ Demande de garde refusée — ${nomAnimal}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">Demande de garde refusée</h2>
        <p>Bonjour ${prop.prenom},</p>
        <p><strong>${prest.prenom} ${prest.nom}</strong> n'est malheureusement pas disponible pour votre demande.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Animal</td><td style="padding:8px;font-weight:600">${nomAnimal}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Période</td><td style="padding:8px;font-weight:600">${formatDate(dateDebut)} → ${formatDate(dateFin)}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px">Ne vous découragez pas — d'autres prestataires sont disponibles sur PAWLY.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/search"
           style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
          Trouver un autre prestataire
        </a>
        <p style="color:#0d9488;font-weight:700;margin-top:24px">L'équipe PAWLY 🐾</p>
      </div>`,
  });
}
