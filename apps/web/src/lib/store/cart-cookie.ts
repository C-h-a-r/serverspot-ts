import { cookies } from "next/headers";

export const CART_COOKIE = "store_cart_token";

export async function getCartSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value;
}

export function cartCookieOptions(token: string) {
  return {
    name: CART_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
