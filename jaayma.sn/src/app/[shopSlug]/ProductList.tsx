"use client";

import { useCartStore } from "@/lib/cart-store";
import ProductImageFrame, { WAX_PATTERNS } from "@/components/ProductImageFrame";
import PriceDisplay from "@/components/PriceDisplay";
import type { Product, ProductOption } from "@/types/schema";
import { formatFcfa } from "@/lib/money";
import { useState } from "react";

/* ─── Product modal (fiche produit — design 04) ─── */
type ProductCard = Product & { imageUrl?: string | null; imageUrls?: string[] };

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: ProductCard;
  onClose: () => void;
  onAdd: (product: Product, selectedOptions?: Record<string, string>, qty?: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productOptions: ProductOption[] = (() => {
    if (!product.optionsJson) return [];
    try {
      const parsed = JSON.parse(product.optionsJson);
      return Array.isArray(parsed)
        ? parsed.filter(
            (o) => o?.name && Array.isArray(o?.values) && o.values.length > 0
          )
        : [];
    } catch {
      return [];
    }
  })();

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const opt of productOptions) {
      if (opt.values[0]) {
        initial[opt.name] = opt.values[0];
      }
    }
    return initial;
  });

  const imageUrls = product.imageUrls?.length
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const wax = WAX_PATTERNS[Math.abs(product.name.charCodeAt(0)) % WAX_PATTERNS.length];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[92dvh] overflow-y-auto animate-slide-up"
        style={{ backgroundColor: "#FFFBF2", borderRadius: "34px 34px 0 0", border: "2.5px solid #0F1E3D" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: "#D8DCE8" }} />
        </div>

        {/* Image produit (wax pattern) */}
        <div
          className="mx-4 rounded-2xl border-[2px] border-ink overflow-hidden relative"
          style={{ height: 220 }}
        >
          <ProductImageFrame imageUrl={imageUrls[activeImageIndex]} alt={`${product.name}, photo ${activeImageIndex + 1}`} wax={wax} height={220} loading="eager" />
          {/* Badge Nouveau */}
          <span
            className="absolute top-3 left-3 text-xs font-bold px-3 py-1.5 rounded-full border-[2px] border-ink"
            style={{ backgroundColor: "#C8265A", color: "#fff" }}
          >
            Nouveau
          </span>
          {imageUrls.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Photo précédente"
                onClick={() => setActiveImageIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 border-ink bg-white/95 flex items-center justify-center font-black text-ink shadow"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Photo suivante"
                onClick={() => setActiveImageIndex((index) => (index + 1) % imageUrls.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 border-ink bg-white/95 flex items-center justify-center font-black text-ink shadow"
              >
                ›
              </button>
              <span className="absolute bottom-3 right-3 rounded-full border border-white/60 bg-ink/85 px-2.5 py-1 text-xs font-bold text-white">
                {activeImageIndex + 1} / {imageUrls.length}
              </span>
            </>
          )}
        </div>
        {imageUrls.length > 1 && (
          <div className="mx-4 mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Photos du produit">
            {imageUrls.map((url: string, index: number) => (
              <button
                key={`${url}-${index}`}
                type="button"
                aria-label={`Afficher la photo ${index + 1}`}
                aria-pressed={activeImageIndex === index}
                onClick={() => setActiveImageIndex(index)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${activeImageIndex === index ? "border-[#C8265A]" : "border-ink/30"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" className="h-full w-full bg-white object-contain p-0.5" />
              </button>
            ))}
          </div>
        )}

        {/* Contenu */}
        <div className="px-5 pt-4 pb-6">
          <h2 className="font-bricolage font-black text-2xl text-ink mb-1" style={{ letterSpacing: "-0.02em" }}>
            {product.name}
          </h2>
          <PriceDisplay amount={product.price} className="mb-2 text-[25px] leading-tight text-[#C8265A]" />
          {product.description && (
            <p className="text-sm mb-4" style={{ color: "#3F4B69" }}>
              {product.description}
            </p>
          )}

          {/* Options & Variantes dynamiques (Taille, Couleur, Pointure...) */}
          {productOptions.length > 0 && (
            <div className="space-y-4 mb-5 pt-1">
              {productOptions.map((opt) => (
                <div key={opt.name}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-ink uppercase tracking-wider">
                      {opt.name}
                    </p>
                    <span className="text-xs font-bold text-[#C8265A]">
                      {selectedOptions[opt.name] || "Sélectionne"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val) => {
                      const isSelected = selectedOptions[opt.name] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [opt.name]: val,
                            }))
                          }
                          className="px-3.5 py-2 rounded-xl text-xs font-bold border-[2px] transition-all active:scale-95"
                          style={{
                            backgroundColor: isSelected ? "#FFC83D" : "#FFFBF2",
                            borderColor: "#0F1E3D",
                            color: "#0F1E3D",
                            boxShadow: isSelected ? "2px 2px 0 #0F1E3D" : "none",
                            transform: isSelected ? "scale(1.02)" : "scale(1)",
                          }}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantité + Ajouter */}
          <div className="flex items-center gap-3">
            {/* Qty selector */}
            <div className="flex items-center border-[2.5px] border-ink rounded-full overflow-hidden">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-11 h-12 flex items-center justify-center text-xl font-bold text-ink"
              >
                −
              </button>
              <span className="w-8 text-center text-base font-black font-bricolage text-ink">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-11 h-12 flex items-center justify-center text-xl font-bold text-ink"
              >
                +
              </button>
            </div>

            {/* CTA */}
            <button
              onClick={() => {
                onAdd(product, selectedOptions, qty);
                onClose();
              }}
              className="flex-1 py-3.5 rounded-full font-bold text-sm border-[2.5px] border-ink transition-transform active:scale-95"
              style={{ backgroundColor: "#FFC83D", color: "#0F1E3D", boxShadow: "4px 4px 0 #0F1E3D" }}
            >
              Ajouter {formatFcfa(product.price * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Product Grid ─── */
export default function ProductList({
  products,
  shopId,
}: {
  products: ProductCard[];
  shopId: string;
}) {
  const { addItem, items, shopId: cartShopId, clearCart } = useCartStore();
  const [modalProduct, setModalProduct] = useState<ProductCard | null>(null);

  const handleAdd = (
    product: Product,
    selectedOptions?: Record<string, string>,
    qty: number = 1
  ) => {
    if (cartShopId && cartShopId !== shopId) {
      if (!confirm("Votre panier contient des articles d'une autre boutique. Voulez-vous le vider ?")) return;
      clearCart();
    }
    addItem(product, selectedOptions, qty);
  };

  const handleCardAdd = (e: React.MouseEvent, product: ProductCard) => {
    e.stopPropagation();
    let hasOptions = false;
    try {
      if (product.optionsJson) {
        const parsed = JSON.parse(product.optionsJson);
        hasOptions = Array.isArray(parsed) && parsed.length > 0;
      }
    } catch {}

    if (hasOptions) {
      setModalProduct(product);
    } else {
      handleAdd(product);
    }
  };

  const handleTap = (product: ProductCard) => setModalProduct(product);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {products.map((product, i) => {
          const wax = WAX_PATTERNS[i % WAX_PATTERNS.length];
          const qty = items
            .filter((it) => it.product.id === product.id)
            .reduce((sum, it) => sum + it.quantity, 0);

          let optionCount = 0;
          try {
            if (product.optionsJson) {
              const parsed = JSON.parse(product.optionsJson);
              if (Array.isArray(parsed)) optionCount = parsed.length;
            }
          } catch {}

          return (
            <div
              key={product.id}
              id={`product-${product.id}`}
              className="rounded-2xl border-[2.5px] border-ink overflow-hidden cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: "#FFFBF2", boxShadow: "4px 4px 0 #0F1E3D" }}
              onClick={() => handleTap(product)}
            >
              {/* Wax pattern */}
              <div className="relative">
                <ProductImageFrame imageUrl={product.imageUrl} alt={product.name} wax={wax} height={190} />
                {/* Dot favori */}
                <span
                  className="absolute top-2 right-2 w-3 h-3 rounded-full border-[2px] border-ink"
                  style={{ backgroundColor: "#C8265A" }}
                />
                {product.imageUrls && product.imageUrls.length > 1 && (
                  <span className="absolute top-2 left-2 rounded-full border border-ink bg-white/95 px-2 py-1 text-[10px] font-bold text-ink">
                    {product.imageUrls.length} photos
                  </span>
                )}
                {optionCount > 0 && (
                  <span className="absolute bottom-2 left-2 rounded-full border border-ink bg-[#FFC83D] px-2 py-0.5 text-[10px] font-bold text-ink shadow-sm">
                    Variantes
                  </span>
                )}
              </div>

              {/* Infos */}
              <div className="px-2.5 pt-2 pb-3 flex items-end justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate leading-tight">{product.name}</p>
                  <PriceDisplay amount={product.price} className="text-[25px] leading-tight text-ink" />
                </div>
                {/* Plus button */}
                <button
                  onClick={(e) => handleCardAdd(e, product)}
                  className="w-8 h-8 rounded-full border-[2px] border-ink flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                  style={{ backgroundColor: qty > 0 ? "#0E7C66" : "#FFC83D", color: "#0F1E3D" }}
                  aria-label={optionCount > 0 ? `Choisir les options pour ${product.name}` : `Ajouter ${product.name} au panier`}
                >
                  {qty > 0 ? (
                    <span className="text-white text-xs font-black">{qty}</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.8" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal fiche produit */}
      {modalProduct && (
        <ProductModal
          key={modalProduct.id}
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAdd={handleAdd}
        />
      )}
    </>
  );
}
