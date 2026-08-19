import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const minecraftMpCallbackSchema = z.object({
  username: z.string(),
  token: z.string().optional(),
  signature: z.string().optional(),
});

export function verifyMinecraftMpCallback(
  params: { username: string; token?: string; signature?: string },
  secret: string,
): boolean {
  if (!params.token || !params.signature || !secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${params.username}:${params.token}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  } catch {
    return false;
  }
}

export function parseVoteCallbackQuery(
  searchParams: URLSearchParams,
): z.infer<typeof minecraftMpCallbackSchema> {
  return minecraftMpCallbackSchema.parse({
    username: searchParams.get("username") ?? searchParams.get("ign") ?? "",
    token: searchParams.get("token") ?? undefined,
    signature: searchParams.get("signature") ?? searchParams.get("hash") ?? undefined,
  });
}
