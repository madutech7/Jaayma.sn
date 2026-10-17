import { CheckCircle2, CircleAlert, Database, KeyRound, Mail, Smartphone, Users } from "lucide-react";
import { getSessionToken } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminError, AdminPageTitle, adminPanelClass } from "../AdminUI";

export const metadata = { title: "Réglages · Administration Jaayma" };

export default async function AdminSettingsPage() {
  const token = await getSessionToken();
  if (!token) return <AdminError message="Votre session a expiré. Reconnectez-vous." />;
  try {
    const settings = await api.getAdminSettings(token);
    const checks = [
      { title: "Base de données API", detail: "La configuration a répondu avec succès.", ready: settings.databaseConnected, icon: <Database size={18} /> },
      { title: "Web Push / VAPID", detail: settings.push.configured ? `Clés présentes · ${settings.push.subject || "Sujet non défini"}` : "Clés publiques et privées absentes sur Render.", ready: settings.push.configured, icon: <Smartphone size={18} /> },
      { title: "Comptes administrateurs", detail: `${settings.admins.length} numéro${settings.admins.length === 1 ? "" : "s"} autorisé${settings.admins.length === 1 ? "" : "s"} côté API.`, ready: settings.admins.length > 0, icon: <Users size={18} /> },
    ];
    return (
      <>
        <AdminPageTitle eyebrow="Configuration de la plateforme" title="Réglages" description="Vérifiez l’état des services essentiels et les comptes autorisés. Les clés secrètes restent protégées et ne sont jamais affichées dans le navigateur." />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <article key={check.title} className={`${adminPanelClass()} p-4 sm:p-5`}>
              <div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sun">{check.icon}</span>{check.ready ? <CheckCircle2 size={18} className="text-[#64D2B0]" /> : <CircleAlert size={18} className="text-[#F3C65E]" />}</div>
              <h2 className="mt-4 font-bricolage text-base font-black">{check.title}</h2>
              <p className="mt-1 text-xs leading-5 text-ghost">{check.detail}</p>
            </article>
          ))}
          <article className={`${adminPanelClass()} p-4 sm:p-5`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sun"><Mail size={18} /></span>
            <h2 className="mt-4 font-bricolage text-base font-black">Appareils abonnés</h2>
            <p className="mt-1 font-bricolage text-3xl font-black text-sun">{settings.pushSubscriptions}</p>
            <p className="mt-1 text-xs leading-5 text-ghost">Appareils de vendeurs ayant activé les alertes Jaayma.</p>
          </article>
        </section>

        <section className={`${adminPanelClass()} mt-5 p-5 sm:p-6`}>
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sun/25 bg-sun/10 text-sun"><KeyRound size={18} /></span><div><h2 className="font-bricolage text-lg font-black">Accès administrateur</h2><p className="mt-1 text-xs leading-5 text-ghost">Cette liste est lue depuis la variable <code className="rounded bg-white/10 px-1.5 py-0.5 text-sun">ADMIN_PHONES</code> sur Render. Ajoutez ou retirez un accès dans les variables d’environnement de l’API.</p></div></div>
          {settings.admins.length ? <div className="mt-5 flex flex-wrap gap-2">{settings.admins.map((phone) => <span key={phone} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs font-bold text-white">{phone}</span>)}</div> : <div className="mt-5 rounded-xl border border-[#F3C65E]/20 bg-[#F3C65E]/[0.06] p-3 text-xs text-[#F3C65E]">Aucun administrateur configuré. L’accès est fermé tant que la variable ADMIN_PHONES reste vide.</div>}
        </section>

        <section className={`${adminPanelClass()} mt-5 p-5 sm:p-6`}>
          <h2 className="font-bricolage text-lg font-black">Variables utilisées par l’admin</h2>
          <p className="mt-1 text-xs leading-5 text-ghost">Dans Render → jaayma-api → Environment, configurez les variables ci-dessous. Les secrets sont uniquement lus par l’API.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <EnvItem name="JWT_SECRET" description="Signature et validation des sessions vendeur" />
            <EnvItem name="ADMIN_PHONES" description="Numéros autorisés, séparés par des virgules" />
            <EnvItem name="DATABASE_URL" description="Connexion à la base des comptes et commandes" />
            <EnvItem name="VAPID_PUBLIC_KEY / PRIVATE_KEY" description="Envoi des notifications push aux appareils abonnés" />
            <EnvItem name="VAPID_SUBJECT" description="Adresse mailto de contact technique" />
          </div>
        </section>
      </>
    );
  } catch (error) {
    return <AdminError message={error instanceof Error ? error.message : "Impossible de lire la configuration de l’API."} />;
  }
}

function EnvItem({ name, description }: { name: string; description: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><code className="text-xs font-black text-sun">{name}</code><p className="mt-1 text-[11px] leading-5 text-ghost">{description}</p></div>;
}
