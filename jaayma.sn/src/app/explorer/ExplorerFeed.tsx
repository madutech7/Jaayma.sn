"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/lib/images";
import ProductImageFrame, { WAX_PATTERNS } from "@/components/ProductImageFrame";
import PriceDisplay from "@/components/PriceDisplay";
import type { Product, Shop } from "@/types/schema";

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

export default function ExplorerFeed({
  initialProducts,
  initialCategory,
  initialQuery,
  initialPage,
  initialHasNextPage,
}: {
  initialProducts: ExploreItem[];
  initialCategory: string;
  initialQuery: string;
  initialPage: number;
  initialHasNextPage: boolean;
}) {
  const [selectedCat, setSelectedCat] = useState(initialCategory || "Tous");
  const [query, setQuery] = useState(initialQuery || "");
  const [products, setProducts] = useState<ExploreItem[]>(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isLoading, setIsLoading] = useState(false);

  // Cache mémoire local ultra-rapide (catégorie -> données)
  const cacheRef = useRef<Map<string, { items: ExploreItem[]; hasNextPage: boolean }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sauvegarder les produits initiaux
  const allInitialProductsRef = useRef<ExploreItem[]>(initialProducts);

  useEffect(() => {
    allInitialProductsRef.current = initialProducts;
    const key = `${initialCategory || "Tous"}__${initialQuery}__${initialPage}`;
    cacheRef.current.set(key, { items: initialProducts, hasNextPage: initialHasNextPage });
    setProducts(initialProducts);
  }, [initialCategory, initialProducts, initialQuery, initialPage, initialHasNextPage]);

  // Clic sur une catégorie : Réponse INSTANTANÉE (0ms)
  const handleCategoryClick = async (cat: string) => {
    if (cat === selectedCat && !isLoading) return;

    // 1. Mise à jour visuelle IMMÉDIATE (0ms)
    setSelectedCat(cat);
    setPage(1);

    // Mettre à jour l'URL sans rechargement de page
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (cat !== "Tous") sp.set("cat", cat);
    const newUrl = sp.toString() ? `/explorer?${sp.toString()}` : "/explorer";
    window.history.replaceState(null, "", newUrl);

    const cacheKey = `${cat}__${query}__1`;

    // 2. Si déjà en cache -> affichage 0ms
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setProducts(cached.items);
      setHasNextPage(cached.hasNextPage);
      setIsLoading(false);
      return;
    }

    // 3. Filtrage mémoire instantané depuis les produits déjà chargés
    if (!query && cat !== "Tous") {
      const memoryMatches = allInitialProductsRef.current.filter((item) => {
        const itemCat = item.shop.category || "";
        return itemCat.toLowerCase() === cat.toLowerCase();
      });

      if (memoryMatches.length > 0) {
        setProducts(memoryMatches);
        setHasNextPage(false);
        // On enregistre ce résultat
        cacheRef.current.set(cacheKey, { items: memoryMatches, hasNextPage: false });
        return;
      }
    } else if (cat === "Tous" && !query) {
      setProducts(allInitialProductsRef.current);
      setHasNextPage(initialHasNextPage);
      return;
    }

    // 4. Sinon, requête unique à la demande avec annulation de la précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const fetchSp = new URLSearchParams();
      if (query) fetchSp.set("q", query);
      if (cat !== "Tous") fetchSp.set("cat", cat);

      const res = await fetch(`/api/explore?${fetchSp.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();
      const items: ExploreItem[] = data.items || [];
      const hasNext = Boolean(data.hasNextPage);

      cacheRef.current.set(cacheKey, { items, hasNextPage: hasNext });
      setProducts(items);
      setHasNextPage(hasNext);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        // Ignorer l'erreur d'annulation
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination à la demande
  const handlePageChange = async (targetPage: number) => {
    setIsLoading(true);
    try {
      const fetchSp = new URLSearchParams();
      if (query) fetchSp.set("q", query);
      if (selectedCat !== "Tous") fetchSp.set("cat", selectedCat);
      fetchSp.set("page", String(targetPage));

      const res = await fetch(`/api/explore?${fetchSp.toString()}`);
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();

      setProducts(data.items || []);
      setHasNextPage(Boolean(data.hasNextPage));
      setPage(targetPage);
    } catch {
      // Ignorer
    } finally {
      setIsLoading(false);
    }
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
          method="GET"
          action="/explorer"
          onSubmit={(e) => {
            e.preventDefault();
            handleCategoryClick(selectedCat);
          }}
          className="mb-5"
        >
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-full border-[2.5px] border-ink" style={{ backgroundColor: "#fff", boxShadow: "4px 4px 0 #0F1E3D" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l5 5" />
            </svg>
            <input
              type="text"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Robes, bijoux, baskets"
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted"
              style={{ color: "#0F1E3D" }}
            />
            {selectedCat !== "Tous" && <input type="hidden" name="cat" value={selectedCat} />}
          </div>
        </form>

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

        {/*  Section produits  */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bricolage font-black text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
            {selectedCat !== "Tous" ? selectedCat : query ? `Résultats pour « ${query} »` : "Produits à découvrir"}
          </h2>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-[#0F1E3D] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/*  Résultats  */}
        {products.length === 0 ? (
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
        ) : (
          <div className={`grid grid-cols-2 gap-3 transition-opacity duration-150 ${isLoading ? "opacity-60" : "opacity-100"}`}>
            {products.map(({ product, shop, imageUrl }, i) => (
              <Link
                key={product.id}
                href={`/${shop.slug}#product-${product.id}`}
                prefetch={true}
                className="min-w-0 overflow-hidden rounded-2xl border-[2.5px] border-ink active:scale-[0.98] transition-transform hover:-translate-y-0.5"
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
                      <p className="font-bold text-ink text-xs truncate mt-0.5">{shop.name}</p>
                    </div>
                  </div>
                </div>
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
                onClick={() => handlePageChange(page - 1)}
                className="px-5 py-2.5 rounded-full border-[2px] border-ink font-bold text-sm active:scale-95 transition-transform"
                style={{ backgroundColor: "#0F1E3D", color: "#FFC83D" }}
              >
                Précédent
              </button>
            )}
            <span className="text-sm font-semibold text-ink">Page {page}</span>
            {hasNextPage && (
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                className="px-5 py-2.5 rounded-full border-[2px] border-ink font-bold text-sm active:scale-95 transition-transform"
                style={{ backgroundColor: "#0F1E3D", color: "#FFC83D" }}
              >
                Suivant
              </button>
            )}
          </div>
        )}

        {/*  Lien inscription  */}
        <div className="mt-10 text-center">
          <Link href="/inscription" className="text-sm font-bold text-ink underline underline-offset-2">
            Tu es vendeur ? Créer ta boutique gratuitement
          </Link>
        </div>
      </div>

      {/*  Bottom nav  */}
      <nav className="fixed bottom-0 left-0 right-0 px-5 pb-4 pt-2 pointer-events-none z-40">
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
            <Link href="/">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C3CCE6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8h14l-1 12H6z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </Link>
            <Link href="#">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C3CCE6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                <circle cx="12" cy="10" r="2.3" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
