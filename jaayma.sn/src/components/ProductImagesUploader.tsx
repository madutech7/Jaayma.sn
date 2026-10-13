"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { Loader2, X, Camera, ImagePlus } from "lucide-react";
import { getImageUrl } from "@/lib/images";
import { uploadImageFile } from "@/lib/upload-client";

const MAX_IMAGES = 4;

export default function ProductImagesUploader({
  currentKeys = [],
}: {
  currentKeys?: string[];
}) {
  const [keys, setKeys] = useState<string[]>(currentKeys.filter(Boolean).slice(0, MAX_IMAGES));
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || keys.length >= MAX_IMAGES) return;

    const slot = keys.length;
    const localUrl = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [slot]: localUrl }));
    setError(null);
    setUploadingIndex(slot);

    const result = await uploadImageFile(file, "products");
    if (result.error || !result.key) {
      setError(result.error || "Erreur lors de l'upload.");
      setPreviews((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    } else {
      setKeys((prev) => [...prev, result.key!]);
    }

    setUploadingIndex(null);
  }

  function handleRemove(index: number) {
    setKeys((prev) => prev.filter((_, i) => i !== index));
    setPreviews({});
  }

  const emptySlotsCount = Math.max(0, MAX_IMAGES - keys.length - (uploadingIndex !== null ? 1 : 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: "#C3CCE6" }}>
          Photos de l'article ({keys.length}/{MAX_IMAGES})
        </p>
        <span className="text-[11px] font-semibold text-[#8991A4]">
          {keys.length === 0 ? "Au moins 1 photo recommandée" : `${MAX_IMAGES - keys.length} emplacement(s) libre(s)`}
        </span>
      </div>

      <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar">
        {/* Images existantes */}
        {keys.map((key, index) => {
          const src = previews[index] || getImageUrl(key);
          return (
            <div
              key={`${key}-${index}`}
              className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden border-[2.5px] border-ink bg-white shadow-[3px_3px_0_#0F1E3D]"
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : null}
              {index === 0 && (
                <span className="absolute bottom-1 left-1 z-[2] px-1.5 py-0.5 rounded text-[9px] font-black bg-sun text-ink border border-ink">
                  Principale
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1.5 right-1.5 z-[2] w-6 h-6 rounded-full bg-[#FFFBF2] border-[1.5px] border-ink flex items-center justify-center shadow-sm hover:bg-[#F6C3D2] transition-colors"
                aria-label="Supprimer la photo"
              >
                <X className="w-3.5 h-3.5 text-hibiscus" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}

        {/* Slot en cours d'upload */}
        {uploadingIndex !== null && (
          <div
            className="w-24 h-24 shrink-0 rounded-2xl flex flex-col items-center justify-center gap-1.5 border-[2.5px] border-ink shadow-[3px_3px_0_#0F1E3D]"
            style={{ backgroundColor: "#FFC83D" }}
          >
            <Loader2 className="w-6 h-6 animate-spin text-ink" />
            <span className="text-[10px] font-black text-ink">Envoi...</span>
          </div>
        )}

        {/* Slot Ajouter */}
        {keys.length < MAX_IMAGES && uploadingIndex === null && (
          <label
            className="relative w-24 h-24 shrink-0 rounded-2xl flex flex-col items-center justify-center gap-1 border-[2.5px] border-ink cursor-pointer shadow-[3px_3px_0_#0F1E3D] active:scale-95 transition-transform"
            style={{ backgroundColor: "#FFC83D" }}
          >
            <Camera className="w-6 h-6 text-ink stroke-[2.4]" />
            <span className="text-[11px] font-black text-ink leading-none">Ajouter</span>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
              onChange={handleFileChange}
              aria-label="Ajouter une photo produit"
            />
          </label>
        )}

        {/* Emplacements libres interactifs et élégants */}
        {Array.from({ length: emptySlotsCount - (keys.length < MAX_IMAGES ? 1 : 0) }).map((_, i) => {
          const slotNumber = keys.length + (keys.length < MAX_IMAGES ? 2 : 1) + i;
          return (
            <label
              key={`empty-${i}`}
              className="relative w-24 h-24 shrink-0 rounded-2xl border-2 border-dashed border-white/25 bg-[#16264D]/50 hover:bg-[#1B2E5C] hover:border-[#FFC83D]/70 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group active:scale-95 shadow-sm"
              title={`Ajouter la photo ${slotNumber}`}
            >
              <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-[#FFC83D]/20 flex items-center justify-center transition-colors">
                <ImagePlus className="w-4 h-4 text-[#C3CCE6] group-hover:text-[#FFC83D] transition-colors" />
              </div>
              <span className="text-[10px] font-bold text-[#C3CCE6] group-hover:text-[#FFC83D] transition-colors">
                Photo {slotNumber}
              </span>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
                onChange={handleFileChange}
                aria-label={`Ajouter la photo ${slotNumber}`}
              />
            </label>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm font-semibold text-hibiscus">{error}</p>}

      {keys.map((key) => (
        <input key={key} type="hidden" name="imageKeys" value={key} />
      ))}
    </div>
  );
}
