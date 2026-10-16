"use client";

import { useState } from "react";
import { Plus, Trash2, X, Sparkles } from "lucide-react";
import type { ProductOption } from "@/types/schema";

const PRESET_OPTIONS: { label: string; name: string; values: string[] }[] = [
  {
    label: "👕 Tailles vêtements",
    name: "Taille",
    values: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    label: "👟 Pointures",
    name: "Pointure",
    values: ["38", "39", "40", "41", "42", "43", "44"],
  },
  {
    label: "🎨 Couleurs",
    name: "Couleur",
    values: ["Noir", "Blanc", "Bleu", "Rouge", "Vert", "Jaune"],
  },
];

interface ProductOptionsEditorProps {
  initialOptionsJson?: string | null;
}

export default function ProductOptionsEditor({
  initialOptionsJson,
}: ProductOptionsEditorProps) {
  const [options, setOptions] = useState<ProductOption[]>(() => {
    if (!initialOptionsJson) return [];
    try {
      const parsed = JSON.parse(initialOptionsJson);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (o) => o && typeof o.name === "string" && Array.isArray(o.values)
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const [customNameInput, setCustomNameInput] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  const addPreset = (preset: { name: string; values: string[] }) => {
    setOptions((prev) => {
      const existing = prev.find(
        (o) => o.name.toLowerCase() === preset.name.toLowerCase()
      );
      if (existing) return prev;
      return [...prev, { name: preset.name, values: [...preset.values] }];
    });
  };

  const addCustomOption = () => {
    const trimmed = customNameInput.trim();
    if (!trimmed) return;
    setOptions((prev) => {
      const existing = prev.find(
        (o) => o.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) return prev;
      return [...prev, { name: trimmed, values: [] }];
    });
    setCustomNameInput("");
    setShowAddCustom(false);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const addValueToOption = (optionIndex: number) => {
    const raw = newValueInputs[optionIndex] || "";
    if (!raw.trim()) return;

    // Support comma-separated input (e.g. "S, M, L")
    const newItems = raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (newItems.length === 0) return;

    setOptions((prev) => {
      const next = [...prev];
      const opt = next[optionIndex];
      if (!opt) return prev;
      const combined = [...opt.values];
      for (const item of newItems) {
        if (!combined.includes(item)) {
          combined.push(item);
        }
      }
      next[optionIndex] = { ...opt, values: combined };
      return next;
    });

    setNewValueInputs((prev) => ({ ...prev, [optionIndex]: "" }));
  };

  const removeValueFromOption = (optionIndex: number, valueIndex: number) => {
    setOptions((prev) => {
      const next = [...prev];
      const opt = next[optionIndex];
      if (!opt) return prev;
      next[optionIndex] = {
        ...opt,
        values: opt.values.filter((_, i) => i !== valueIndex),
      };
      return next;
    });
  };

  const validOptions = options.filter(
    (o) => o.name.trim() && o.values.length > 0
  );
  const jsonValue = validOptions.length > 0 ? JSON.stringify(validOptions) : "";

  return (
    <div className="pt-4 border-t border-white/10 space-y-4">
      {/* Hidden input for form submission */}
      <input type="hidden" name="optionsJson" value={jsonValue} />

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-white">
              Options & Variantes (comme Shopify)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#FFC83D] text-[#0F1E3D]">
              Spécifications
            </span>
          </div>
          <p className="text-xs" style={{ color: "#8D98AF" }}>
            Permets à tes clients de choisir leur taille, couleur, pointure ou spécification.
          </p>
        </div>
      </div>

      {/* Quick preset chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#C3CCE6] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#FFC83D]" />
          Modèles rapides standards :
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_OPTIONS.map((preset) => {
            const isAdded = options.some(
              (o) => o.name.toLowerCase() === preset.name.toLowerCase()
            );
            return (
              <button
                key={preset.name}
                type="button"
                disabled={isAdded}
                onClick={() => addPreset(preset)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  isAdded
                    ? "opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-white"
                    : "bg-[#16264D] hover:bg-[#1f3468] text-white border-white/20 hover:border-[#FFC83D]"
                }`}
              >
                {preset.label} {isAdded && "✓"}
              </button>
            );
          })}

          {!showAddCustom && (
            <button
              type="button"
              onClick={() => setShowAddCustom(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-[#FFC83D]/60 text-[#FFC83D] hover:bg-[#FFC83D]/10 transition-all flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Autre option (ex: Matière, Capacité...)
            </button>
          )}
        </div>
      </div>

      {/* Add custom option prompt */}
      {showAddCustom && (
        <div className="p-3 rounded-2xl bg-[#16264D] border-[2px] border-ink flex items-center gap-2">
          <input
            type="text"
            value={customNameInput}
            onChange={(e) => setCustomNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomOption();
              }
            }}
            placeholder="Nom de l'option (ex: Matière, Poids, Volume...)"
            className="flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none text-[#0F1E3D] bg-[#FFFBF2] border border-ink"
            autoFocus
          />
          <button
            type="button"
            onClick={addCustomOption}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FFC83D] text-[#0F1E3D] border border-ink shadow active:scale-95 transition-transform"
          >
            Ajouter
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddCustom(false);
              setCustomNameInput("");
            }}
            className="p-2 text-[#8D98AF] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Options list */}
      {options.length > 0 && (
        <div className="space-y-3 pt-2">
          {options.map((opt, optIndex) => (
            <div
              key={opt.name + optIndex}
              className="p-4 rounded-2xl border-[2px] border-ink space-y-3"
              style={{ backgroundColor: "#16264D" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bricolage font-black text-sm text-white">
                    {opt.name}
                  </span>
                  <span className="text-[11px] font-bold text-[#FFC83D]">
                    ({opt.values.length} valeur{opt.values.length > 1 ? "s" : ""})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(optIndex)}
                  className="text-red-400 hover:text-red-300 p-1 transition-colors"
                  aria-label={`Supprimer l'option ${opt.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Values tags */}
              <div className="flex flex-wrap gap-2 min-h-7">
                {opt.values.map((val, valIndex) => (
                  <span
                    key={val + valIndex}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-ink"
                    style={{ backgroundColor: "#FFFBF2", color: "#0F1E3D" }}
                  >
                    <span>{val}</span>
                    <button
                      type="button"
                      onClick={() => removeValueFromOption(optIndex, valIndex)}
                      className="text-red-500 hover:text-red-700 -mr-1"
                      aria-label={`Retirer ${val}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add value input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newValueInputs[optIndex] || ""}
                  onChange={(e) =>
                    setNewValueInputs((prev) => ({
                      ...prev,
                      [optIndex]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addValueToOption(optIndex);
                    }
                  }}
                  placeholder={`Ajouter une valeur pour "${opt.name}" (ex: séparer par des virgules)`}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-medium outline-none text-[#0F1E3D] bg-[#FFFBF2] border border-ink placeholder:text-[#8D98AF]"
                />
                <button
                  type="button"
                  onClick={() => addValueToOption(optIndex)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FFC83D] text-[#0F1E3D] border border-ink shadow active:scale-95 transition-transform"
                >
                  + Ajouter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
