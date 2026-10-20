"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getImageUrl } from "@/lib/images";
import ProductImageFrame, { WAX_PATTERNS } from "@/components/ProductImageFrame";
import PriceDisplay from "@/components/PriceDisplay";
import FormattedDescription from "@/components/FormattedDescription";
import ProBadge from "@/components/ProBadge";
import type { Product, Shop } from "@/types/schema";
import { getEffectivePlan } from "@/lib/plans";

export interface ExploreItem {
  product: Product;
  shop: Shop;
  imageUrl: string | null;
}

const CATEGORIES = ["Tous", "Mode", "Beauté", "Alimentation", "Maison", "High-Tech", "Artisanat"];

const CAT_COLORS: Record<string, { bg: string; color: string; rot: number }> = {
  Mode:        { bg: "#C8265A", color: "#fff",    rot: -3 },
  Beauté:      { bg: "#0E7C66", color: "#fff",    rot: 2  },
  Alimentation:{ bg: "#FFC83D", color: "#0F1E3D", rot: -2 },
  Maison:      { bg: "#0F1E3D", color: "#fff",    rot: 1  },
  "High-Tech": { bg: "#0F1E3D", color: "#FFC83D", rot: -1 },
  Artisanat:   { bg: "#C8265A", color: "#fff",    rot: 2  },
};

function ExploreProductSheet({
  item,
  onClose,
  onOpenShop,
}: {
  item: ExploreItem;
  onClose: () => void;
  onOpenShop: () => void;
}) {
  const { product, shop, imageUrl } = item;
  const isProActive = getEffectivePlan(shop.plan, shop.planExpiresAt) === "pro";
  const dragStartYRef = useRef<number | null>(null);

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current !== null && event.clientY - dragStartYRef.current > 72) onClose();
    dragStartYRef.current = null;
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0F1E3D]/65 backdrop-blur-[3px] sm:items-center sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="explore-product-title"
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[30px] border-[2.5px] border-ink bg-[#FFFBF2] pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(15,30,61,0.25)] animate-slide-up sm:rounded-[30px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex justify-center pt-3 sm:hidden"
          onPointerDown={handleDragStart}
          onPointerUp={handleDragEnd}
          onPointerCancel={() => { dragStartYRef.current = null; }}
          style={{ touchAction: "none" }}
          aria-hidden="true"
        >
          <div className="h-1.5 w-12 rounded-full bg-[#D8DCE8]" />
        </div>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-[#FFFBF2]/95 px-5 py-3 backdrop-blur">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#3F4B69]">Fiche produit</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fiche produit"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-white text-2xl font-medium leading-none text-ink active:scale-90"
          >×</button>
        </div>
        <div className="p-4 sm:p-5">
          <div className="overflow-hidden rounded-[22px] border-2 border-ink bg-white p-2 shadow-[3px_3px_0_#0F1E3D]">
            <ProductImageFrame imageUrl={imageUrl} alt={product.name} wax={WAX_PATTERNS[0]} height={300} loading="eager" />
          </div>
          <div className="px-1 pb-2 pt-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 id="explore-product-title" className="font-bricolage text-2xl font-black leading-tight text-ink">{product.name}</h2>
              {shop.category && <span className="shrink-0 rounded-full border border-ink/20 bg-[#FFC83D]/50 px-3 py-1 text-[10px] font-black text-ink">{shop.category}</span>}
            </div>
            <PriceDisplay amount={product.price} className="text-[30px] leading-tight text-[#C8265A]" />
            {product.description && <FormattedDescription text={product.description} className="mt-3 text-sm leading-relaxed text-[#3F4B69]" />}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-ink/15 bg-white p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/20 bg-[#FFC83D]/35 font-bricolage font-black text-ink">
                {shop.logoKey ? <Image src={getImageUrl(shop.logoKey)!} alt="" width={44} height={44} className="h-full w-full bg-white object-contain" unoptimized /> : shop.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#6A748B]">Vendu par</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bricolage font-black text-ink">{shop.name}</p>
                  {isProActive && <ProBadge />}
                </div>
                {(shop.area || shop.quartier) && <p className="truncate text-xs text-[#3F4B69]">{shop.area || shop.quartier}</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-ink/10 bg-[#FFFBF2]/95 px-4 py-3 backdrop-blur sm:rounded-b-[28px]">
          <button
            type="button"
            onClick={onOpenShop}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-[2.5px] border-ink px-5 text-sm font-black text-[#FFC83D] shadow-[3px_3px_0_#0F1E3D] transition-transform active:scale-[0.98]"
            style={{ backgroundColor: "#0F1E3D" }}
          >
            Ouvrir dans la boutique <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ExplorerFeed({
  initialProducts,
  initialCategory,
  initialQuery,
  initialPage,
  initialHasNextPage,
  initialShops,
  initialView,
}: {
  initialProducts: ExploreItem[];
  initialCategory: string;
  initialQuery: string;
  initialPage: number;
  initialHasNextPage: boolean;
  initialShops: Shop[];
  initialView: "products" | "shops";
}) {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState(initialCategory || "Tous");
  const [query, setQuery] = useState(initialQuery || "");
  const [view, setView] = useState<"products" | "shops">(initialView);
  const [products, setProducts] = useState<ExploreItem[]>(initialProducts);
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [page, setPage] = useState(initialPage);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExploreItem | null>(null);
  const [comingSoonToast, setComingSoonToast] = useState<{ feature: string; id: number } | null>(null);

  const cacheRef = useRef<Map<string, { products: ExploreItem[]; shops: Shop[]; hasNextPage: boolean }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSequenceRef = useRef(0);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const clearShopReturnMarker = () => sessionStorage.removeItem("jaayma:explorer-return");
    window.addEventListener("popstate", clearShopReturnMarker);
    return () => window.removeEventListener("popstate", clearShopReturnMarker);
  }, []);

  useEffect(() => {
    const key = `${initialView}__${initialCategory || "Tous"}__${initialQuery}__${initialPage}`;
    cacheRef.current.set(key, { products: initialProducts, shops: initialShops, hasNextPage: initialHasNextPage });
    setProducts(initialProducts);
    setShops(initialShops);
  }, [initialCategory, initialHasNextPage, initialPage, initialProducts, initialQuery, initialShops, initialView]);

  const loadResults = async (next: { view: "products" | "shops"; category: string; query: string; page: number }) => {
    const normalizedQuery = next.query.trim();
    const cacheKey = `${next.view}__${next.category}__${normalizedQuery}__${next.page}`;
    setView(next.view);
    setSelectedCat(next.category);
    setQuery(next.query);
    setPage(next.page);
    setLoadError(false);

    const urlParams = new URLSearchParams();
    if (normalizedQuery) urlParams.set("q", normalizedQuery);
    if (next.category !== "Tous") urlParams.set("cat", next.category);
    if (next.page > 1) urlParams.set("page", String(next.page));
    if (next.view === "shops") urlParams.set("view", "shops");
    const serializedParams = urlParams.toString();
    window.history.replaceState(null, "", `/explorer${serializedParams ? `?${serializedParams}` : ""}`);

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setProducts(cached.products);
      setShops(cached.shops);
      setHasNextPage(cached.hasNextPage);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    try {
      const fetchParams = new URLSearchParams();
      if (normalizedQuery) fetchParams.set("q", normalizedQuery);
      if (next.category !== "Tous") fetchParams.set("cat", next.category);
      fetchParams.set("page", String(next.page));
      const endpoint = next.view === "shops" ? "/api/explore/shops" : "/api/explore";
      const res = await fetch(`${endpoint}?${fetchParams.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("La recherche n'a pas pu aboutir.");
      const data = await res.json();
      const nextProducts: ExploreItem[] = next.view === "products" ? data.items || [] : [];
      const nextShops: Shop[] = next.view === "shops" ? data.items || [] : [];
      const nextHasPage = Boolean(data.hasNextPage);
      cacheRef.current.set(cacheKey, { products: nextProducts, shops: nextShops, hasNextPage: nextHasPage });
      setProducts(nextProducts);
      setShops(nextShops);
      setHasNextPage(nextHasPage);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setLoadError(true);
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (view === "products" && !query.trim()) {
      if (category !== "Tous") {
        setProducts(products.filter(({ shop }) => shop.category?.toLocaleLowerCase() === category.toLocaleLowerCase()));
      }
    }
    loadResults({ view, category, query, page: 1 });
  };
  const handleViewChange = (nextView: "products" | "shops") => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    loadResults({ view: nextView, category: selectedCat, query, page: 1 });
  };
  const handlePageChange = (targetPage: number) =>
    loadResults({ view, category: selectedCat, query, page: targetPage });

  const openProduct = (item: ExploreItem) => {
    setSelectedProduct(item);
    void router.prefetch(`/${item.shop.slug}?product=${encodeURIComponent(item.product.id)}`);
  };

  const showComingSoon = (feature: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setComingSoonToast({ feature, id: ++toastSequenceRef.current });
    toastTimerRef.current = setTimeout(() => setComingSoonToast(null), 2400);
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#FFC83D" }}>
      {/*  HEADER  */}
      <div className="px-5 pt-5 flex items-center justify-between max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          {/* Logo mark dark */}
          <svg width="28" height="28" viewBox="0 0 120 120" fill="none">
            <path d="M38 4H82A34 34 0 0 1 116 38V82A34 34 0 0 1 82 116H10A6 6 0 0 1 4 110V38A34 34 0 0 1 38 4Z" fill="#0F1E3D" />
            <path d="M64 46V76C64 90 57 97 44 97" stroke="#FFC83D" strokeWidth="12" strokeLinecap="round" fill="none" />
            <circle cx="64" cy="28" r="7.5" fill="#C8265A" />
          </svg>
        </Link>
        {/* Icône panier */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ backgroundColor: "#0F1E3D" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFC83D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8h14l-1 12H6z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center" style={{ backgroundColor: "#C8265A", color: "#fff" }}>
            0
          </span>
        </div>
      </div>

      {/*  HERO TEXT  */}
      <div className="px-5 pt-8 max-w-2xl mx-auto">
        <h1 className="font-bricolage font-black leading-none mb-2" style={{ fontSize: "clamp(2.2rem, 10vw, 3.5rem)", color: "#0F1E3D", letterSpacing: "-0.02em" }}>
          Ce que tu veux,
        </h1>
        <h1 className="font-bricolage font-black leading-none mb-1" style={{ fontSize: "clamp(2.2rem, 10vw, 3.5rem)", color: "#0F1E3D", letterSpacing: "-0.02em" }}>
          livré chez toi.
        </h1>
        {/* Trait décoratif rouge */}
        <svg viewBox="0 0 220 10" className="mb-5" style={{ width: 220, height: 10 }}>
          <path d="M2 5Q46 1 88 5T194 5" stroke="#C8265A" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>

        {/*  Barre de recherche  */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            loadResults({ view, category: selectedCat, query, page: 1 });
          }}
          className="mb-5"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border-[2.5px] border-ink" style={{ backgroundColor: "#fff", boxShadow: "4px 4px 0 #0F1E3D" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l5 5" />
            </svg>
            <input
              type="text"
              name="q"
              value={query}
              onChange={(e) => {
                const nextQuery = e.target.value;
                setQuery(nextQuery);
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = setTimeout(() => {
                  loadResults({ view, category: selectedCat, query: nextQuery, page: 1 });
                }, 400);
              }}
              placeholder={view === "shops" ? "Nom de boutique, quartier, produit…" : "Robes, bijoux, baskets…"}
              aria-label={view === "shops" ? "Rechercher une boutique" : "Rechercher un produit"}
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted"
              style={{ color: "#0F1E3D" }}
            />
            <button
              type="submit"
              aria-label="Rechercher"
              className="shrink-0 rounded-full border-2 border-ink px-4 py-2 text-xs font-black active:scale-95 transition-transform"
              style={{ backgroundColor: "#FFC83D", color: "#0F1E3D", boxShadow: "2px 2px 0 #0F1E3D" }}
            >
              Rechercher
            </button>
          </div>
        </form>

        {/* Basculer entre les produits et les boutiques */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border-[2.5px] border-ink bg-[#0F1E3D] p-1.5" role="tablist" aria-label="Type de résultats">
          {(["products", "shops"] as const).map((item) => {
            const active = view === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleViewChange(item)}
                className="rounded-full px-3 py-2.5 text-sm font-black transition-transform active:scale-[0.98]"
                style={{ backgroundColor: active ? "#FFC83D" : "transparent", color: active ? "#0F1E3D" : "#FFFBF2" }}
              >
                {item === "products" ? "Produits" : "Boutiques"}
              </button>
            );
          })}
        </div>

        {/*  Catégories  */}
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2 mb-6">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            const catStyle = CAT_COLORS[cat] || { bg: "#0F1E3D", color: "#fff", rot: 0 };

            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className="shrink-0 text-sm font-bold px-4 py-2 rounded-full border-[2.5px] border-ink transition-transform active:scale-95 cursor-pointer select-none"
                style={{
                  backgroundColor: isSelected ? catStyle.bg : cat === "Tous" ? "#0F1E3D" : "rgba(0,0,0,0.08)",
                  color: isSelected ? catStyle.color : "#0F1E3D",
                  boxShadow: isSelected ? "3px 3px 0 #0F1E3D" : "none",
                  transform: isSelected && catStyle.rot ? `rotate(${catStyle.rot}deg)` : "none",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Résultats */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bricolage font-black text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
            {view === "shops"
              ? query ? `Boutiques pour « ${query} »` : "Boutiques à découvrir"
              : selectedCat !== "Tous" ? selectedCat : query ? `Résultats pour « ${query} »` : "Produits à découvrir"}
          </h2>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-[#0F1E3D] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {loadError && (
          <div className="mb-4 rounded-2xl border-2 border-ink bg-white px-4 py-3 text-sm font-semibold text-ink" role="alert">
            La recherche n’a pas pu aboutir. Vérifie ta connexion et réessaie.
          </div>
        )}

        {isLoading && (view === "products" ? products.length === 0 : shops.length === 0) && (
          <div className="rounded-2xl border-[2.5px] border-ink bg-white px-5 py-8 text-center" style={{ boxShadow: "4px 4px 0 #0F1E3D" }} aria-live="polite">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-[#0F1E3D] border-t-transparent" />
            <p className="font-bricolage font-bold text-ink">{view === "shops" ? "Recherche des boutiques…" : "Recherche des produits…"}</p>
          </div>
        )}

        {/* Produits ou boutiques */}
        {view === "products" && products.length === 0 && !isLoading && !loadError ? (
          <div className="bg-white rounded-2xl border-[2.5px] border-ink p-10 text-center" style={{ boxShadow: "4px 4px 0 #0F1E3D" }}>
            <h3 className="font-bricolage font-bold text-ink text-lg mb-1">Aucun produit trouvé</h3>
            <p className="text-sm mb-5" style={{ color: "#3F4B69" }}>
              {selectedCat !== "Tous"
                ? `Aucun produit disponible dans la catégorie ${selectedCat}.`
                : "Essayez un autre mot-clé ou réinitialisez les filtres."}
            </p>
            <button
              type="button"
              onClick={() => handleCategoryClick("Tous")}
              className="text-sm font-bold px-5 py-2.5 rounded-full border-[2px] border-ink active:scale-95 transition-transform"
              style={{ backgroundColor: "#FFC83D", color: "#0F1E3D", boxShadow: "2px 2px 0 #0F1E3D" }}
            >
              Voir tout
            </button>
          </div>
        ) : view === "products" ? (
          <div className={`grid grid-cols-2 gap-3 transition-opacity duration-150 ${isLoading ? "opacity-60" : "opacity-100"}`}>
            {products.map(({ product, shop, imageUrl }, i) => (
              <button
                key={product.id}
                type="button"
                onClick={() => openProduct({ product, shop, imageUrl })}
                className="min-w-0 overflow-hidden rounded-2xl border-[2.5px] border-ink text-left active:scale-[0.98] transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: "#FFFBF2", boxShadow: "4px 4px 0 #0F1E3D" }}
              >
                <div className="p-2 pb-0">
                  <ProductImageFrame
                    imageUrl={imageUrl}
                    alt={product.name}
                    wax={WAX_PATTERNS[i % WAX_PATTERNS.length]}
                    height={148}
                  />
                </div>
                <div className="px-3 pt-2.5 pb-3">
                  <p className="font-bold text-ink text-sm leading-snug line-clamp-2 min-h-10">{product.name}</p>
                  <PriceDisplay amount={product.price} className="mt-1 text-[25px] leading-tight text-ink" />
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-ink/15 min-w-0">
                    <div className="w-7 h-7 rounded-full border border-ink/30 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden" style={{ backgroundColor: i % 3 === 0 ? "#FFC83D" : i % 3 === 1 ? "#F6C3D2" : "#CFEFE6", color: "#0F1E3D" }}>
                      {shop.logoKey ? (
                        <Image src={getImageUrl(shop.logoKey)!} alt="" width={28} height={28} className="w-full h-full object-contain bg-white" unoptimized />
                      ) : shop.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-wide leading-none" style={{ color: "#3F4B69" }}>Vendu par</p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 truncate font-bold text-ink text-xs">{shop.name}</p>
                        {getEffectivePlan(shop.plan, shop.planExpiresAt) === "pro" && <ProBadge compact />}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {view === "shops" && shops.length === 0 && !isLoading && !loadError && (
          <div className="bg-white rounded-2xl border-[2.5px] border-ink p-10 text-center" style={{ boxShadow: "4px 4px 0 #0F1E3D" }}>
            <h3 className="font-bricolage font-bold text-ink text-lg mb-1">Aucune boutique trouvée</h3>
            <p className="text-sm mb-5" style={{ color: "#3F4B69" }}>
              Essaie un autre nom, un quartier ou un produit.
            </p>
            <button
              type="button"
              onClick={() => loadResults({ view: "shops", category: "Tous", query: "", page: 1 })}
              className="text-sm font-bold px-5 py-2.5 rounded-full border-[2px] border-ink active:scale-95 transition-transform"
              style={{ backgroundColor: "#FFC83D", color: "#0F1E3D", boxShadow: "2px 2px 0 #0F1E3D" }}
            >
              Voir toutes les boutiques
            </button>
          </div>
        )}

        {view === "shops" && shops.length > 0 && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity duration-150 ${isLoading ? "opacity-60" : "opacity-100"}`}>
            {shops.map((shop, index) => (
              <Link
                key={shop.id}
                href={`/${shop.slug}`}
                prefetch={false}
                onPointerEnter={() => { void router.prefetch(`/${shop.slug}`); }}
                onFocus={() => { void router.prefetch(`/${shop.slug}`); }}
                onTouchStart={() => { void router.prefetch(`/${shop.slug}`); }}
                onClick={() => sessionStorage.setItem("jaayma:explorer-return", String(Date.now()))}
                className="group min-w-0 rounded-2xl border-[2.5px] border-ink p-4 active:scale-[0.99] transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: "#FFFBF2", boxShadow: "4px 4px 0 #0F1E3D" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 shrink-0 rounded-2xl border-2 border-ink bg-white overflow-hidden flex items-center justify-center font-bricolage font-black text-xl text-ink" style={{ boxShadow: "2px 2px 0 #0F1E3D" }}>
                    {shop.logoKey ? (
                      <Image src={getImageUrl(shop.logoKey)!} alt={`Logo ${shop.name}`} width={56} height={56} className="w-full h-full object-contain" unoptimized />
                    ) : shop.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate font-bricolage font-black text-ink text-base leading-tight">{shop.name}</p>
                    {getEffectivePlan(shop.plan, shop.planExpiresAt) === "pro" && <ProBadge compact />}
                  </div>
                    <p className="mt-1 text-xs leading-snug line-clamp-2" style={{ color: "#3F4B69" }}>{shop.headline || shop.description || "Découvrez la boutique"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {shop.category && <span className="rounded-full border border-ink/20 bg-[#FFC83D]/50 px-2 py-0.5 text-[10px] font-bold text-ink">{shop.category}</span>}
                      {(shop.area || shop.quartier) && <span className="rounded-full border border-ink/15 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink">{shop.area || shop.quartier}</span>}
                    </div>
                  </div>
                </div>
                {shop.products && shop.products.length > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t border-ink/15 pt-2.5">
                    <div className="flex -space-x-2">
                      {shop.products.slice(0, 3).map((product, productIndex) => {
                        const image = product.imageUrl ?? product.images?.[0]?.url;
                        const imageUrl = image ? getImageUrl(image) : null;
                        return (
                          <div key={product.id} className="h-8 w-8 overflow-hidden rounded-full border-2 border-[#FFFBF2] bg-white" style={{ zIndex: 3 - productIndex }}>
                            {imageUrl ? <Image src={imageUrl} alt="" width={32} height={32} className="h-full w-full object-cover" unoptimized /> : <span className="flex h-full items-center justify-center text-[9px] font-bold text-ink">{index + 1}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-xs font-black text-ink group-hover:text-[#C8265A]">Voir la boutique <span aria-hidden="true">→</span></span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/*  Pagination  */}
        {(page > 1 || hasNextPage) && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {page > 1 && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handlePageChange(page - 1)}
                className="px-5 py-2.5 rounded-full border-[2px] border-ink font-bold text-sm active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#0F1E3D", color: "#FFC83D" }}
              >Précédent</button>
            )}
            <span className="text-sm font-semibold text-ink">Page {page}</span>
            {hasNextPage && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handlePageChange(page + 1)}
                className="px-5 py-2.5 rounded-full border-[2px] border-ink font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-wait"
                style={{ backgroundColor: "#0F1E3D", color: "#FFC83D" }}
              >
                Suivant
              </button>
            )}
          </div>
        )}

        {selectedProduct && (
          <ExploreProductSheet
            item={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onOpenShop={() => {
              sessionStorage.setItem("jaayma:explorer-return", String(Date.now()));
              router.push(`/${selectedProduct.shop.slug}?product=${encodeURIComponent(selectedProduct.product.id)}`, { scroll: true });
            }}
          />
        )}

        {/*  Lien inscription  */}
        <div className="mt-10 text-center">
          <Link href="/inscription" className="text-sm font-bold text-ink underline underline-offset-2">
            Tu es vendeur ? Créer ta boutique gratuitement
          </Link>
        </div>
      </div>

      {/*  Bottom nav  */}
      <nav className="fixed bottom-0 left-0 right-0 px-5 pt-2 pointer-events-none z-40" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="max-w-2xl mx-auto">
          <div
            className="pointer-events-auto flex items-center justify-around py-4 px-6 rounded-full border-[2.5px] border-ink"
            style={{ backgroundColor: "#0F1E3D", boxShadow: "0 8px 32px rgba(15,30,61,0.35)" }}
          >
            {/* Accueil (actif) */}
            <Link href="/explorer" className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FFC83D" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l5 5" />
                </svg>
              </div>
            </Link>
            <button
              type="button"
              aria-label="Panier, fonctionnalité à venir"
              onClick={() => showComingSoon("Panier")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#C3CCE6] transition-colors hover:bg-white/10 active:scale-90"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C3CCE6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8h14l-1 12H6z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Boutiques autour de moi, fonctionnalité à venir"
              onClick={() => showComingSoon("Boutiques autour de moi")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#C3CCE6] transition-colors hover:bg-white/10 active:scale-90"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C3CCE6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                <circle cx="12" cy="10" r="2.3" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {comingSoonToast && (
        <div
          key={comingSoonToast.id}
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[60] mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-[#FFFBF2] px-4 py-3 text-center text-sm font-bold text-ink shadow-[3px_3px_0_#0F1E3D] animate-slide-up"
        >
          <span aria-hidden="true" className="text-[#C8265A]">✦</span>
          {comingSoonToast.feature} : fonctionnalité à venir
        </div>
      )}
    </div>
  );
}
