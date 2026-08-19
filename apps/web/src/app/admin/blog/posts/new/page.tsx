"use client";

import { Button, Input, Label } from "@serverspot/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NewBlogPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, status: "published" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Post published");
      router.push("/admin/blog/posts");
      router.refresh();
    } catch {
      toast.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New post</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            className="min-h-[200px] w-full rounded-[var(--radius-sm)] border border-border bg-muted p-3 text-sm"
          />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Publishing..." : "Publish"}</Button>
      </form>
    </div>
  );
}
