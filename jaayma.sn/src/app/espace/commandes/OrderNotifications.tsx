"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bell, BellRing, CircleCheck, Loader2, Send } from "lucide-react";
import {
  getPushVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendTestPushNotification,
} from "@/app/actions/notifications";

type SupportState = "checking" | "ready" | "unsupported" | "ios-install";

export default function OrderNotifications() {
  const [support, setSupport] = useState<SupportState>("checking");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState<"enable" | "disable" | "test" | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const supportsPush =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (isIOS && !isStandalone) {
        if (active) setSupport("ios-install");
        return;
      }

      if (!supportsPush) {
        if (active) setSupport("unsupported");
        return;
      }

      try {
        const [keyResult, registration] = await Promise.all([
          getPushVapidPublicKey(),
          navigator.serviceWorker.register("/sw.js"),
        ]);
        if (!active) return;

        setPublicKey(keyResult.publicKey);
        setIsConfigured(Boolean(keyResult.publicKey));
        setPermission(Notification.permission);
        setSupport("ready");

        const currentSubscription = await registration.pushManager.getSubscription();
        if (!active || !currentSubscription) return;

        setEndpoint(currentSubscription.endpoint);
        setIsEnabled(true);
        const result = await savePushSubscription(serializeSubscription(currentSubscription));
        if (active && result.error) {
          setFeedback({ kind: "error", text: result.error });
        }
      } catch {
        if (active) setSupport("unsupported");
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, []);

  async function enableNotifications() {
    if (!publicKey) return;
    setBusy("enable");
    setFeedback(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setFeedback({
          kind: "error",
          text: "L’autorisation n’a pas été accordée. Vous pourrez la modifier dans les réglages du navigateur.",
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey) as BufferSource,
      });
      const result = await savePushSubscription(serializeSubscription(subscription));

      if (result.error) {
        if (!existingSubscription) await subscription.unsubscribe();
        setFeedback({ kind: "error", text: result.error });
        return;
      }

      setEndpoint(subscription.endpoint);
      setIsEnabled(true);
      setFeedback({ kind: "success", text: "Les alertes de commande sont activées sur cet appareil." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Impossible d’activer les notifications sur cet appareil.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function disableNotifications() {
    setBusy("disable");
    setFeedback(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const currentEndpoint = endpoint ?? subscription?.endpoint;

      if (currentEndpoint) {
        const result = await removePushSubscription(currentEndpoint);
        if (result.error) {
          setFeedback({ kind: "error", text: result.error });
          return;
        }
      }

      await subscription?.unsubscribe();
      setEndpoint(null);
      setIsEnabled(false);
      setFeedback({ kind: "success", text: "Les alertes sont désactivées sur cet appareil." });
    } catch {
      setFeedback({ kind: "error", text: "Impossible de désactiver les notifications sur cet appareil." });
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    if (!endpoint) return;
    setBusy("test");
    setFeedback(null);

    const result = await sendTestPushNotification(endpoint);
    setFeedback(
      result.error
        ? { kind: "error", text: result.error }
        : { kind: "success", text: "Notification test envoyée. Vérifiez les alertes de votre téléphone." },
    );
    setBusy(null);
  }

  const unavailableMessage =
    support === "unsupported"
      ? "Ce navigateur ne prend pas en charge les notifications push. Ouvrez Jaayma dans Safari sur iPhone ou Chrome sur Android."
      : support === "ios-install"
        ? "Sur iPhone, ajoutez d’abord Jaayma à l’écran d’accueil depuis Safari, puis ouvrez l’application installée pour activer les alertes."
        : null;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#17284B] shadow-[0_16px_40px_rgba(0,0,0,0.2)]" aria-labelledby="order-notifications-title">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sun/30 bg-sun/10 text-sun">
            {isEnabled ? <BellRing size={21} aria-hidden="true" /> : <Bell size={21} aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="order-notifications-title" className="font-bricolage text-base font-black text-white">
                Alertes de commande
              </h2>
              {isEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-200">
                  <CircleCheck size={12} aria-hidden="true" /> Activées
                </span>
              )}
            </div>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-[#C3CCE6]">
              Recevez une alerte sur ce téléphone dès qu’un client passe commande, même si Jaayma est fermé.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 pl-14 sm:pl-0">
          {support === "checking" ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-[#C3CCE6]">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Vérification…
            </span>
          ) : isEnabled ? (
            <>
              <button
                type="button"
                onClick={sendTest}
                disabled={busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "test" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Tester
              </button>
              <button
                type="button"
                onClick={disableNotifications}
                disabled={busy !== null}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-[#C3CCE6] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "disable" ? "Désactivation…" : "Désactiver"}
              </button>
            </>
          ) : support === "ios-install" ? (
            <span className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-[#C3CCE6]">
              Installation requise
            </span>
          ) : support === "unsupported" ? (
            <span className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-[#C3CCE6]">
              Non disponible
            </span>
          ) : support === "ready" && permission === "denied" ? (
            <span className="rounded-xl border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-xs font-bold text-amber-100">
              Autorisation bloquée
            </span>
          ) : (
            <button
              type="button"
              onClick={enableNotifications}
              disabled={support !== "ready" || !isConfigured || busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-sun px-4 py-2.5 text-xs font-black text-ink shadow-[2px_2px_0_#07132E] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "enable" ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
              {isConfigured ? "Activer les alertes" : "Configuration requise"}
            </button>
          )}
        </div>
      </div>

      {(unavailableMessage || (support === "ready" && !isConfigured)) && (
        <div className="border-t border-white/10 bg-black/10 px-4 py-3 text-xs leading-relaxed text-[#C3CCE6] sm:px-5">
          {unavailableMessage ?? "Le service d’alertes est en cours de configuration."}
        </div>
      )}
      {support === "ready" && permission === "denied" && (
        <div className="border-t border-white/10 bg-black/10 px-4 py-3 text-xs leading-relaxed text-[#C3CCE6] sm:px-5">
          Autorisez les notifications dans les réglages de Safari ou de Chrome, puis revenez ici.
        </div>
      )}
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 border-t px-4 py-3 text-xs leading-relaxed sm:px-5 ${
            feedback.kind === "error"
              ? "border-rose-200/10 bg-rose-400/10 text-rose-100"
              : "border-emerald-200/10 bg-emerald-400/10 text-emerald-100"
          }`}
        >
          {feedback.kind === "error" && <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
          {feedback.text}
        </div>
      )}
    </section>
  );
}

function decodeVapidKey(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function serializeSubscription(subscription: PushSubscription): Record<string, unknown> {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: json.expirationTime,
    keys: json.keys,
  };
}
