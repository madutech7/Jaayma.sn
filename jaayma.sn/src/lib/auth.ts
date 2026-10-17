import { cookies } from "next/headers";
import { cache } from "react";
import { api } from "./api";
import type { Shop } from "@/types/schema";

const SESSION_COOKIE = "jaay_session";
const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** Returns raw session token stored in the cookie, deduplicated per request pass. */
export const getSessionToken = cache(async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
});

/** Returns the authenticated seller and their shop from the NestJS backend, deduplicated per request pass. */
export const getCurrentSellerContext = cache(async (): Promise<{
  sellerId: string;
  phone: string;
  shop: Shop | null;
} | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const res = await api.getMe(token);
    if (!res || !res.user) return null;
    return {
      sellerId: res.user.id,
      phone: res.user.phone,
      shop: res.shop,
    };
  } catch {
    return null;
  }
});

/** Returns the seller ID of the currently authenticated session, or null if invalid. */
export const getCurrentSellerId = cache(async (): Promise<string | null> => {
  const ctx = await getCurrentSellerContext();
  return ctx ? ctx.sellerId : null;
});

/** Sets the session cookie on the response. */
export async function setSessionCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

/** Clears the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
