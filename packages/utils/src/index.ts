import { customAlphabet } from "nanoid";
import slugifyLib from "slugify";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 21);

export function generateId(): string {
  return nanoid();
}

export function generateToken(length = 32): string {
  return customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", length)();
}

export function slugify(text: string): string {
  return slugifyLib(text, { lower: true, strict: true, trim: true });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
