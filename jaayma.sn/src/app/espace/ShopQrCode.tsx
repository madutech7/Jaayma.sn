"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Download, Loader2, QrCode, Share2 } from "lucide-react";

const QR_OPTIONS: QRCode.QRCodeToDataURLOptions = {
  errorCorrectionLevel: "H",
  margin: 1,
  width: 360,
  color: { dark: "#0F1E3D", light: "#FFFFFF" },
};

export default function ShopQrCode({ shopName, shopUrl }: { shopName: string; shopUrl: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(shopUrl, QR_OPTIONS)
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setMessage("Impossible de générer le QR code pour le moment.");
      });

    return () => {
      cancelled = true;
    };
  }, [shopUrl]);

  async function handleDownload() {
    setBusy("download");
    setMessage("");
    try {
      const image = await createShareCard();
      downloadBlob(image, getFileName());
      setMessage("QR téléchargé. Tu peux l’imprimer ou l’envoyer à tes clients.");
    } catch {
      setMessage("Le téléchargement du QR a échoué. Réessaie dans un instant.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    setMessage("");
    try {
      const image = await createShareCard();
      const file = new File([image], getFileName(), { type: "image/png" });

      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `QR code de ${shopName}`,
          text: `Scanne ce QR code pour découvrir la boutique ${shopName} sur Jaayma.`,
          files: [file],
        });
        setMessage("QR code partagé.");
      } else {
        downloadBlob(image, file.name);
        setMessage("QR téléchargé. Tu peux maintenant le partager sur WhatsApp.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("Le partage du QR a échoué. Tu peux le télécharger et le partager manuellement.");
    } finally {
      setBusy(null);
    }
  }

  function getFileName() {
    const safeName = shopName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `jaayma-qr-${safeName || "boutique"}.png`;
  }

  async function createShareCard(): Promise<Blob> {
    const qr = qrDataUrl ?? (await QRCode.toDataURL(shopUrl, QR_OPTIONS));
    const qrImage = await loadImage(qr);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponible");

    context.fillStyle = "#FFFBF2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#FFC83D";
    context.fillRect(0, 0, canvas.width, 245);
    context.fillStyle = "#0F1E3D";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#FFFBF2";
    context.fillRect(12, 12, canvas.width - 24, canvas.height - 24);
    context.fillStyle = "#FFC83D";
    context.fillRect(12, 12, canvas.width - 24, 245);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#0F1E3D";
    context.font = "900 38px Arial, sans-serif";
    context.fillText("JAAYMA", canvas.width / 2, 74);
    context.font = "700 27px Arial, sans-serif";
    context.fillText("TA BOUTIQUE EN UN SCAN", canvas.width / 2, 132);

    context.font = "900 58px Arial, sans-serif";
    context.fillText("DÉCOUVREZ NOTRE BOUTIQUE", canvas.width / 2, 335, 920);
    context.font = "800 43px Arial, sans-serif";
    context.fillStyle = "#0E7C66";
    context.fillText(shopName, canvas.width / 2, 410, 900);

    context.fillStyle = "#FFFFFF";
    context.fillRect(222, 475, 636, 636);
    context.strokeStyle = "#0F1E3D";
    context.lineWidth = 8;
    context.strokeRect(222, 475, 636, 636);
    context.drawImage(qrImage, 292, 545, 496, 496);

    context.fillStyle = "#0F1E3D";
    context.font = "700 29px Arial, sans-serif";
    context.fillText("Scannez ce code avec votre téléphone", canvas.width / 2, 1172, 950);
    context.font = "600 24px Arial, sans-serif";
    context.fillStyle = "#3F4B69";
    context.fillText(new URL(shopUrl).host + new URL(shopUrl).pathname, canvas.width / 2, 1222, 950);

    context.fillStyle = "#0F1E3D";
    context.fillRect(12, 1270, canvas.width - 24, 68);
    context.fillStyle = "#FFFBF2";
    context.font = "800 24px Arial, sans-serif";
    context.fillText("Une boutique en ligne avec Jaayma", canvas.width / 2, 1304);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image indisponible"))), "image/png");
    });
  }

  return (
    <section className="rounded-2xl border-2 border-ink/10 bg-[#F0EDE8] p-3" aria-label="QR code de la boutique">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-[#FFC83D]">
          <QrCode size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black">QR boutique</p>
          <p className="text-[10px] font-semibold text-[#65708A]">À scanner pour visiter</p>
        </div>
      </div>

      <div className="mx-auto mt-3 flex aspect-square w-full max-w-[132px] items-center justify-center rounded-xl border-2 border-ink bg-white p-2">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={`QR code pour ouvrir la boutique ${shopName}`} className="h-full w-full" />
        ) : (
          <Loader2 size={22} className="animate-spin text-[#0F1E3D]" aria-label="Génération du QR code" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!qrDataUrl || busy !== null}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border-2 border-ink bg-white px-2 text-[10px] font-black disabled:opacity-50"
        >
          {busy === "download" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Télécharger
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={!qrDataUrl || busy !== null}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border-2 border-ink bg-[#FFC83D] px-2 text-[10px] font-black disabled:opacity-50"
        >
          {busy === "share" ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
          Partager
        </button>
      </div>
      {message && <p role="status" className="mt-2 text-[10px] font-semibold leading-4 text-[#3F4B69]">{message}</p>}
    </section>
  );
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR code illisible"));
    image.src = source;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
