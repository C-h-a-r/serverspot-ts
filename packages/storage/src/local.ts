import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { generateId } from "@serverspot/utils";

export type StoredFile = {
  id: string;
  key: string;
  path: string;
  mimeType: string;
  size: number;
};

export type UploadInput = {
  data: Buffer | Readable;
  filename: string;
  mimeType: string;
  subdirectory?: string;
};

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
]);

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export class LocalStorageAdapter {
  constructor(private readonly rootDir: string) {
    if (!existsSync(rootDir)) {
      mkdirSync(rootDir, { recursive: true });
    }
  }

  private resolveSafePath(key: string): string {
    const full = normalize(resolve(this.rootDir, key));
    const rel = relative(this.rootDir, full);
    if (rel.startsWith("..") || rel.includes("..")) {
      throw new Error("Path traversal detected");
    }
    return full;
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    if (!ALLOWED_MIMES.has(input.mimeType)) {
      throw new Error(`MIME type not allowed: ${input.mimeType}`);
    }

    const id = generateId();
    const ext = input.filename.includes(".") ? input.filename.split(".").pop() : "bin";
    const key = join(input.subdirectory ?? "uploads", `${id}.${ext}`).replace(/\\/g, "/");
    const filePath = this.resolveSafePath(key);

    mkdirSync(dirname(filePath), { recursive: true });

    let buffer: Buffer;
    if (Buffer.isBuffer(input.data)) {
      buffer = input.data;
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of input.data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error("File exceeds maximum size");
    }

    if (input.mimeType.startsWith("image/") && input.mimeType !== "image/svg+xml") {
      try {
        const sharp = (await import("sharp")).default;
        const meta = await sharp(buffer).metadata();
        if (!meta.format) {
          throw new Error("Invalid image file");
        }
        buffer = await sharp(buffer).rotate().toBuffer();
      } catch {
        throw new Error("Invalid image file");
      }
    }

    await pipeline(Readable.from(buffer), createWriteStream(filePath));

    return {
      id,
      key,
      path: filePath,
      mimeType: input.mimeType,
      size: buffer.length,
    };
  }

  read(key: string): Buffer {
    const filePath = this.resolveSafePath(key);
    if (!existsSync(filePath)) {
      throw new Error("File not found");
    }
    return readFileSync(filePath);
  }

  stat(key: string): { size: number; mimeType?: string } {
    const filePath = this.resolveSafePath(key);
    const stats = statSync(filePath);
    return { size: stats.size };
  }

  delete(key: string): void {
    const filePath = this.resolveSafePath(key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}

export function createLocalStorage(rootDir: string): LocalStorageAdapter {
  return new LocalStorageAdapter(rootDir);
}
