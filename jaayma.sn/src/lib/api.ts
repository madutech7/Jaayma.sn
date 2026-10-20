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

type AdminShopPage = {
  items: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    planExpiresAt: string | null;
    status: string;
    createdAt: string;
    whatsapp: string | null;
    owner: { name: string; phone: string } | null;
    _count: { products: number; orders: number };
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const api = {
  // ─── ADMINISTRATION ───
  async getAdminAccess(token: string): Promise<{ isAdmin: true; phone: string; name: string }> {
    return request("/admin/access", { token, cache: "no-store" });
  },

  async getAdminOverview(token: string): Promise<{
    metrics: {
      totalShops: number;
      activeShops: number;
      draftShops: number;
      suspendedShops: number;
      proShops: number;
      expiredProShops: number;
      sellers: number;
      activeProducts: number;
      totalOrders: number;
      newOrders: number;
      paidOrders: number;
      revenue: number;
      todayOrders: number;
      revenueToday: number;
    };
    recentOrders: Array<{
      id: string;
      reference: string;
      customerName: string;
      total: number;
      createdAt: string;
      shop: { name: string; slug: string };
    }>;
  }> {
    return request("/admin/overview", { token, cache: "no-store" });
  },

  async getAdminShops(
    token: string,
    params: { q?: string; status?: string; plan?: string; page?: number },
  ): Promise<AdminShopPage> {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.plan) search.set("plan", params.plan);
    if (params.page) search.set("page", String(params.page));
    return request(`/admin/shops${search.size ? `?${search}` : ""}`, {
      token,
      cache: "no-store",
    });
  },

  async getAdminSubscriptions(
    token: string,
    params: { q?: string; plan?: string; page?: number },
  ): Promise<{
    metrics: { totalShops: number; proShops: number; expiredProShops: number };
    shops: AdminShopPage;
  }> {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.plan) search.set("plan", params.plan);
    if (params.page) search.set("page", String(params.page));
    return request(`/admin/subscriptions${search.size ? `?${search}` : ""}`, {
      token,
      cache: "no-store",
    });
  },

  async getAdminOrders(
    token: string,
    params: { q?: string; status?: string; payment?: string; page?: number }
  ): Promise<{
    items: Array<{
      id: string;
      reference: string;
      customerName: string;
      customerPhone: string;
      total: number;
      status: string;
      paymentMethod: string;
      paymentStatus: string;
      createdAt: string;
      shop: { name: string; slug: string };
      _count: { items: number };
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.payment) search.set("payment", params.payment);
    if (params.page) search.set("page", String(params.page));
    return request(`/admin/orders${search.size ? `?${search}` : ""}`, {
      token,
      cache: "no-store",
    });
  },

  async adminUpdateShopPlan(
    token: string,
    id: string,
    plan: "free" | "pro",
    durationDays = 30
  ) {
    return request(`/admin/shops/${encodeURIComponent(id)}/plan`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ plan, durationDays }),
    });
  },

  async adminUpdateShopStatus(token: string, id: string, status: "ACTIVE" | "SUSPENDED" | "DRAFT") {
    return request(`/admin/shops/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    });
  },

  async adminSetExplorerEnabled(token: string, enabled: boolean) {
    return request<{ explorerEnabled: boolean }>("/admin/settings/explorer", {
      method: "PATCH",
      token,
      body: JSON.stringify({ enabled }),
    });
  },

  async adminSetMaintenanceEnabled(token: string, enabled: boolean) {
    return request<{ maintenanceEnabled: boolean }>("/admin/settings/maintenance", {
      method: "PATCH",
      token,
      body: JSON.stringify({ enabled }),
    });
  },

  async adminSetProSubscriptionPrice(token: string, amount: number) {
    return request<{ proPriceXof: number }>("/admin/settings/pro-price", {
      method: "PATCH",
      token,
      body: JSON.stringify({ amount }),
    });
  },

  async getAdminAccounts(token: string, params: { q?: string; hasShop?: string; page?: number }) {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.hasShop) search.set("hasShop", params.hasShop);
    if (params.page) search.set("page", String(params.page));
    return request<{
      items: Array<{
        id: string;
        name: string;
        phone: string;
        createdAt: string;
        shopCount: number;
        orderCount: number;
        shops: Array<{ id: string; name: string; slug: string; plan: string; status: string }>;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/admin/accounts${search.size ? `?${search}` : ""}`, { token, cache: "no-store" });
  },

  async getAdminSettings(token: string) {
    return request<{
      admins: string[];
      pushSubscriptions: number;
      push: { configured: boolean; subject: string | null };
      databaseConnected: boolean;
      explorerEnabled: boolean;
      maintenanceEnabled: boolean;
      proPriceXof: number;
    }>("/admin/settings", { token, cache: "no-store" });
  },

  async getAdminAnalytics(token: string, days: 7 | 28 | 90 | 365) {
    return request<AdminAnalyticsDashboard>(`/admin/analytics?days=${days}`, {
      token,
      cache: "no-store",
    });
  },

  async getAdminAnalyticsRealtime(token: string) {
    return request<AdminAnalyticsRealtime>("/admin/analytics/realtime", {
      token,
      cache: "no-store",
    });
  },

  async getPublicFeatures() {
    return request<{ explorerEnabled: boolean; maintenanceEnabled: boolean }>("/admin/public-features", { cache: "no-store" });
  },

  async getProSubscriptionPrice() {
    return request<{ amount: number }>("/subscriptions/price", { cache: "no-store" });
  },

  async getAdminNotificationHistory(token: string, page = 1) {
    return request<{
      items: Array<{
        id: string;
        title: string;
        body: string;
        url: string;
        targetCount: number;
        deliveredCount: number;
        failedCount: number;
        sentByPhone: string | null;
        createdAt: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/admin/notifications?page=${page}`, { token, cache: "no-store" });
  },

  async sendAdminNotification(token: string, data: { title: string; body: string; url: string }) {
    return request<{
      success: boolean;
      targetCount: number;
      deliveredCount: number;
      failedCount: number;
    }>("/admin/notifications", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },

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

  async getExploreShops(params?: {
    q?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Shop[]; hasNextPage: boolean }> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.category) sp.set("category", params.category);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    const queryString = sp.toString();
    const result = await request<{ items: any[]; hasNextPage: boolean }>(
      `/shops/explore${queryString ? `?${queryString}` : ""}`
    );
    return { items: result.items.map(normalizeShop), hasNextPage: result.hasNextPage };
  },

  async getShopBySlug(slug: string): Promise<Shop | null> {
    try {
      const data = await request<any>(`/shops/${encodeURIComponent(slug)}`, { cache: "no-store" });
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

  async getShopByOwner(ownerId: string, token: string): Promise<Shop | null> {
    try {
      const data = await request<any>(`/shops/by-owner/${encodeURIComponent(ownerId)}`, {
        token,
        cache: "no-store",
      });
      return data ? normalizeShop(data) : null;
    } catch {
      return null;
    }
  },

  async createShop(data: Record<string, unknown>, token: string): Promise<Shop> {
    const res = await request<any>("/shops", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
    return normalizeShop(res);
  },

  async updateShop(id: string, data: Record<string, unknown>, token: string): Promise<Shop> {
    const res = await request<any>(`/shops/${encodeURIComponent(id)}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    });
    return normalizeShop(res);
  },

  // ─── PRODUCTS ───
  async getProductsByShop(shopId: string, token: string): Promise<Product[]> {
    const data = await request<any[]>(`/shops/${encodeURIComponent(shopId)}/products`, {
      token,
      cache: "no-store",
    });
    return data.map(normalizeProduct);
  },

  async getProductById(id: string, token: string): Promise<Product | null> {
    try {
      const data = await request<any>(`/products/${encodeURIComponent(id)}`, {
        token,
        cache: "no-store",
      });
      return normalizeProduct(data);
    } catch {
      return null;
    }
  },

  async getPublicProductByShopSlug(shopSlug: string, productId: string): Promise<Product | null> {
    try {
      const data = await request<any>(
        `/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}`
      );
      return data ? normalizeProduct(data) : null;
    } catch {
      return null;
    }
  },

  async createProduct(shopId: string, data: Record<string, unknown>, token: string): Promise<Product> {
    const res = await request<any>(`/shops/${encodeURIComponent(shopId)}/products`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
    return normalizeProduct(res);
  },

  async updateProduct(id: string, data: Record<string, unknown>, token: string): Promise<Product> {
    const res = await request<any>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    });
    return normalizeProduct(res);
  },

  async deleteProduct(id: string, token: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token,
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

  async getOrderById(id: string, token: string): Promise<Order | null> {
    try {
      const data = await request<any>(`/orders/${encodeURIComponent(id)}`, {
        token,
        cache: "no-store",
      });
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

  async getOrdersByShop(shopId: string, token: string): Promise<Order[]> {
    const data = await request<any[]>(`/orders/shops/${encodeURIComponent(shopId)}`, {
      token,
      cache: "no-store",
    });
    return data.map(normalizeOrder);
  },

  async updateOrderStatus(
    id: string,
    token: string,
    status?: string,
    paymentStatus?: string,
  ): Promise<Order> {
    const res = await request<any>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      }),
    });
    return normalizeOrder(res);
  },

  // ─── SUBSCRIPTIONS ───
  async createSubscriptionPayment(token: string, method: "wave" | "orange_money") {
    return request<{
      id: string;
      paymentUrl: string;
      amount: number;
      method: "wave" | "orange_money";
    }>("/subscriptions/payments", {
      method: "POST",
      token,
      body: JSON.stringify({ method }),
    });
  },

  async getSubscriptionPayment(token: string, id: string) {
    return request<{
      id: string;
      status: "pending" | "paid" | "failed" | "expired";
      amount: number;
      currency: string;
      method: "wave" | "orange_money";
      createdAt: string;
      paidAt: string | null;
    }>(`/subscriptions/payments/${encodeURIComponent(id)}`, {
      token,
      cache: "no-store",
    });
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
      cache: "no-store",
    });
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
  }, token: string): Promise<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresIn: number;
    method: string;
    headers: Record<string, string>;
  }> {
    return request("/uploads/product-image", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },

  async createImageUpload(data: {
    folder: string;
    fileName: string;
    contentType: string;
  }, token: string): Promise<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresIn: number;
    method: string;
    headers: Record<string, string>;
  }> {
    return request("/uploads/image", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
};

export type AdminAnalyticsDashboard =
  | {
      status: "setup_required";
      propertyId: string | null;
      missing: string[];
      rangeDays: number;
    }
  | {
      status: "connection_error";
      propertyId: string;
      rangeDays: number;
      message: string;
    }
  | {
      status: "ready";
      propertyId: string;
      rangeDays: number;
      generatedAt: string;
      current: {
        activeUsers: number;
        newUsers: number;
        sessions: number;
        pageViews: number;
        engagedSessions: number;
        engagementRate: number;
        averageSessionDuration: number;
        eventCount: number;
        purchases: number;
        revenue: number;
      };
      previous: {
        activeUsers: number;
        newUsers: number;
        sessions: number;
        pageViews: number;
        engagedSessions: number;
        engagementRate: number;
        averageSessionDuration: number;
        eventCount: number;
        purchases: number;
        revenue: number;
      };
      trend: Array<{ date: string; activeUsers: number; sessions: number }>;
      topPages: Array<{ path: string; title: string; views: number; users: number }>;
      channels: Array<{ name: string; sessions: number; users: number }>;
      countries: Array<{ name: string; users: number; sessions: number }>;
      devices: Array<{ name: string; users: number; sessions: number }>;
      events: Array<{ name: string; count: number; users: number }>;
      landingPages: Array<{ path: string; sessions: number; users: number }>;
      products: Array<{ name: string; views: number; addedToCart: number; purchases: number; revenue: number }>;
    };

export type AdminAnalyticsRealtime =
  | {
      status: "ready";
      generatedAt: string;
      activeUsers: number;
      views: number;
      pages: Array<{ title: string; views: number; users: number }>;
    }
  | {
      status: "connection_error";
      message: string;
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
