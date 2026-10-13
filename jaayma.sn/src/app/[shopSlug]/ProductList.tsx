"use client";

import { useCartStore } from "@/lib/cart-store";
import ProductImageFrame, { WAX_PATTERNS } from "@/components/ProductImageFrame";
import PriceDisplay from "@/components/PriceDisplay";
import type { Product } from "@/types/schema";
import { formatFcfa } from "@/lib/money";
import { useState } from "react";

type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
const COMMON_SIZES: Size[] = ["S", "M", "L", "XL"];

/* ─── Product modal (fiche produit — design 04) ─── */
type ProductCard = Product & { imageUrl?: string | null; imageUrls?: string[] };

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: ProductCard;
  onClose: () => void;
  onAdd: (product: Product, size?: string, qty?: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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

          {/* Sélecteur de taille (optionnel, basé sur optionsJson) */}
          {product.optionsJson && JSON.parse(product.optionsJson || "[]").some((o: any) => o.name?.toLowerCase().includes("taille")) ? (
            <>
              <p className="text-sm font-bold text-ink mb-2">Taille</p>
              <div className="flex gap-2 mb-5">
                {COMMON_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className="w-12 h-10 rounded-xl text-sm font-bold border-[2.5px] transition-all"
                    style={{
                      backgroundColor: selectedSize === sz ? "#FFC83D" : "transparent",
                      borderColor: "#0F1E3D",
                      color: "#0F1E3D",
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </>
          ) : null}

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
              onClick={() => { onAdd(product, selectedSize, qty); onClose(); }}
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

  const handleAdd = (product: Product, size?: string, qty: number = 1) => {
    if (cartShopId && cartShopId !== shopId) {
      if (!confirm("Votre panier contient des articles d'une autre boutique. Voulez-vous le vider ?")) return;
      clearCart();
    }
    for (let i = 0; i < qty; i++) addItem(product);
  };

  const handleTap = (product: ProductCard) => setModalProduct(product);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {products.map((product, i) => {
          const wax = WAX_PATTERNS[i % WAX_PATTERNS.length];
          const qty = items.find((it) => it.product.id === product.id)?.quantity || 0;

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
              </div>

              {/* Infos */}
              <div className="px-2.5 pt-2 pb-3 flex items-end justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate leading-tight">{product.name}</p>
                  <PriceDisplay amount={product.price} className="text-[25px] leading-tight text-ink" />
                </div>
                {/* Plus button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleAdd(product); }}
                  className="w-8 h-8 rounded-full border-[2px] border-ink flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                  style={{ backgroundColor: qty > 0 ? "#0E7C66" : "#FFC83D", color: "#0F1E3D" }}
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
