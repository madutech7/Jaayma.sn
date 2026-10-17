import type { Shop, Product, Order, User } from "@/types/schema";
import { getImageUrl } from "@/lib/images";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://jaayma-sn.onrender.com"
    : "http://127.0.0.1:4000");

async function request<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options?.headers);

  if (!headers.has("Content-Type") && options?.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  if (options?.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const isMutation = Boolean(options?.method && options.method !== "GET");
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  if (isMutation) {
    fetchOptions.cache = "no-store";
  } else if (!fetchOptions.cache && !(fetchOptions as any).next) {
    // Cache GET reads for 30s by default to make page navigation instantaneous
    (fetchOptions as any).next = { revalidate: 30 };
  }

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    let errorMessage = `API error: ${res.status} ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson && typeof errorJson === "object") {
        errorMessage = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export const api = {
  // ─── PUSH NOTIFICATIONS ───
  async getVapidPublicKey(): Promise<{ publicKey: string | null }> {
    return request<{ publicKey: string | null }>("/notifications/vapid-public-key");
  },

  async savePushSubscription(token: string, subscription: Record<string, unknown>) {
    return request<{ success: boolean }>("/notifications/push-subscriptions", {
      method: "POST",
      token,
      body: JSON.stringify(subscription),
    });
  },

  async removePushSubscription(token: string, endpoint: string) {
    return request<{ success: boolean }>("/notifications/push-subscriptions", {
      method: "DELETE",
      token,
      body: JSON.stringify({ endpoint }),
    });
  },

  async sendTestNotification(token: string, endpoint: string) {
    return request<{ success: boolean }>("/notifications/test", {
      method: "POST",
      token,
      body: JSON.stringify({ endpoint }),
    });
  },

  // ─── SHOPS ───
  async getShops(params?: { q?: string; category?: string }): Promise<Shop[]> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.category && params.category !== "Tous") sp.set("category", params.category);
    const qs = sp.toString();
    const data = await request<any[]>(`/shops${qs ? `?${qs}` : ""}`);
    return data.map(normalizeShop);
  },

  async getExploreProducts(params?: {
    q?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{ product: Product; shop: Shop; imageUrl: string | null }>;
    hasNextPage: boolean;
  }> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.category) sp.set("category", params.category);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));

    const queryString = sp.toString();

    const result = await request<{
      items: Array<any>;
      hasNextPage: boolean;
    }>(`/products/explore${queryString ? `?${queryString}` : ""}`);

    return {
      items: result.items.map((item) => {
        const product = item.product ?? item;
        const shop = item.shop ?? product.shop;
        const normalizedProduct = normalizeProduct(product);
        return {
          product: normalizedProduct,
          shop: normalizeShop(shop),
          imageUrl: normalizedProduct.imageUrl ?? null,
        };
      }),
      hasNextPage: result.hasNextPage,
    };
  },

  async getShopBySlug(slug: string): Promise<Shop | null> {
    try {
      const data = await request<any>(`/shops/${encodeURIComponent(slug)}`);
      return normalizeShop(data);
    } catch {
      return null;
    }
  },

  async getShopById(id: string): Promise<Shop | null> {
    try {
      const data = await request<any>(`/shops/by-id/${encodeURIComponent(id)}`);
      return normalizeShop(data);
    } catch {
      return null;
    }
  },

  async getShopByOwner(ownerId: string): Promise<Shop | null> {
    try {
      const data = await request<any>(`/shops/by-owner/${encodeURIComponent(ownerId)}`);
      return data ? normalizeShop(data) : null;
    } catch {
      return null;
    }
  },

  async createShop(data: Record<string, unknown>): Promise<Shop> {
    const res = await request<any>("/shops", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeShop(res);
  },

  async updateShop(id: string, data: Record<string, unknown>): Promise<Shop> {
    const res = await request<any>(`/shops/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return normalizeShop(res);
  },

  // ─── PRODUCTS ───
  async getProductsByShop(shopId: string): Promise<Product[]> {
    const data = await request<any[]>(`/shops/${encodeURIComponent(shopId)}/products`, {
      next: { revalidate: 30, tags: ["products", `shop-${shopId}-products`] },
    } as any);
    return data.map(normalizeProduct);
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      const data = await request<any>(`/products/${encodeURIComponent(id)}`, {
        next: { revalidate: 30, tags: ["products", `product-${id}`] },
      } as any);
      return normalizeProduct(data);
    } catch {
      return null;
    }
  },

  async createProduct(shopId: string, data: Record<string, unknown>): Promise<Product> {
    const res = await request<any>(`/shops/${encodeURIComponent(shopId)}/products`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeProduct(res);
  },

  async updateProduct(id: string, data: Record<string, unknown>): Promise<Product> {
    const res = await request<any>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return normalizeProduct(res);
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // ─── ORDERS ───
  async createOrder(data: Record<string, unknown>): Promise<Order> {
    const res = await request<any>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeOrder(res);
  },

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const data = await request<any>(`/orders/${encodeURIComponent(id)}`, {
        next: { revalidate: 15, tags: ["orders", `order-${id}`] },
      } as any);
      return normalizeOrder(data);
    } catch {
      return null;
    }
  },

  async getOrderByReference(reference: string): Promise<Order | null> {
    try {
      const data = await request<any>(`/orders/reference/${encodeURIComponent(reference)}`, {
        next: { revalidate: 15, tags: ["orders", `order-ref-${reference}`] },
      } as any);
      return normalizeOrder(data);
    } catch {
      return null;
    }
  },

  async getOrdersByShop(shopId: string): Promise<Order[]> {
    const data = await request<any[]>(`/orders/shops/${encodeURIComponent(shopId)}`, {
      next: { revalidate: 15, tags: ["orders", `shop-${shopId}-orders`] },
    } as any);
    return data.map(normalizeOrder);
  },

  async updateOrderStatus(
    id: string,
    status?: string,
    paymentStatus?: string
  ): Promise<Order> {
    const res = await request<any>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      }),
    });
    return normalizeOrder(res);
  },

  // ─── AUTH ───
  async register(data: { phone: string; password: string; name?: string }): Promise<{
    user: User;
    shop: Shop | null;
    token: string;
  }> {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async login(data: { phone: string; password: string }): Promise<{
    user: User;
    shop: Shop | null;
    token: string;
  }> {
    const res = await request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return {
      user: res.user,
      shop: res.shop ? normalizeShop(res.shop) : null,
      token: res.token,
    };
  },

  async getMe(token: string): Promise<{ user: User; shop: Shop | null }> {
    const res = await request<any>("/auth/me", {
      token,
      next: { revalidate: 60, tags: ["seller-context", "seller-me"] },
    } as any);
    return {
      user: res.user,
      shop: res.shop ? normalizeShop(res.shop) : null,
    };
  },

  // ─── UPLOADS ───
  async createProductImageUpload(data: {
    shopId: string;
    fileName: string;
    contentType: string;
  }): Promise<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresIn: number;
    method: string;
    headers: Record<string, string>;
  }> {
    return request("/uploads/product-image", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createImageUpload(data: {
    ownerId: string;
    folder: string;
    fileName: string;
    contentType: string;
  }): Promise<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresIn: number;
    method: string;
    headers: Record<string, string>;
  }> {
    return request("/uploads/image", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

function normalizeShop(s: any): Shop {
  if (!s) return s;
  return {
    ...s,
    sellerId: s.ownerId ?? s.sellerId,
    tagline: s.headline ?? s.tagline,
    quartier: s.area ?? s.quartier,
    logoKey: s.logoUrl ?? s.logoKey,
    coverKey: s.coverUrl ?? s.coverKey,
    isPublished: s.status === "ACTIVE",
    isSuspended: s.status === "SUSPENDED",
    products: s.products?.map(normalizeProduct) ?? [],
  };
}

function normalizeProduct(p: any): Product {
  if (!p) return p;
  const images = p.images ?? [];
  const imageUrls = images
    .map((img: any) => getImageUrl(img.url))
    .filter((url: string | null): url is string => Boolean(url));
  return {
    ...p,
    isActive: p.status === "ACTIVE",
    images,
    imageUrls,
    imageUrl: imageUrls[0] ?? null,
  };
}

function normalizeOrder(o: any): Order {
  if (!o) return o;
  return {
    ...o,
    number: o.reference ?? o.number,
    publicToken: o.reference,
    customerAddress: o.deliveryAddress ?? o.customerAddress ?? "",
    shop: o.shop ? normalizeShop(o.shop) : undefined,
    items:
      o.items?.map((item: any) => ({
        ...item,
        name: item.name ?? item.product?.name ?? "Article",
        product: item.product ? normalizeProduct(item.product) : undefined,
      })) ?? [],
  };
}
