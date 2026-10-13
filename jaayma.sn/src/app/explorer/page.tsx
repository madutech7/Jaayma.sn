import { api } from "@/lib/api";
import ExplorerFeed from "./ExplorerFeed";

export const metadata = {
  title: "Explorer les produits sénégalais | Jaayma",
  description: "Découvrez des produits vendus par des commerçants et créateurs sénégalais.",
};

// Cache les résultats 30s côté Next.js
export const revalidate = 30;

const ITEMS_PER_PAGE = 20;

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const selectedCategory = params.cat && params.cat !== "Tous" ? params.cat : "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const { items: listedProducts, hasNextPage } = await api.getExploreProducts({
    q: query,
    category: selectedCategory,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  return (
    <ExplorerFeed
      initialProducts={listedProducts}
      initialCategory={selectedCategory || "Tous"}
      initialQuery={query}
      initialPage={currentPage}
      initialHasNextPage={hasNextPage}
    />
  );
}
