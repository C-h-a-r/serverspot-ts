"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@serverspot/ui";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  files: string[];
  requiredFiles: string[];
};

export function ThemeEditor({ files, requiredFiles }: Props) {
  const [selected, setSelected] = useState(files[0] ?? "");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPath, setNewPath] = useState("");

  const loadFile = useCallback(async (path: string) => {
    if (!path) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/theme/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Load failed");
      const data = (await res.json()) as { content: string };
      setContent(data.content);
    } catch {
      toast.error("Failed to load file");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) loadFile(selected);
  }, [selected, loadFile]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected, content }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("File saved");
    } catch {
      toast.error("Failed to save file");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newPath.trim()) return;
    setSelected(newPath.trim());
    setContent("");
    setNewPath("");
  }

  const isRequired = requiredFiles.includes(selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          <div className="max-h-[480px] overflow-y-auto px-3 pb-3">
            {files.map((file) => (
              <button
                key={file}
                type="button"
                onClick={() => setSelected(file)}
                className={`block w-full rounded px-2 py-1.5 text-left text-xs ${
                  selected === file
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {file}
              </button>
            ))}
          </div>
          <div className="space-y-2 border-t border-border p-3">
            <Label htmlFor="new-file" className="text-xs">
              New file
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-file"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="assets/partials/widget.html"
                className="h-8 text-xs"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleCreate}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-mono">{selected || "Select a file"}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href="/" target="_blank" rel="noreferrer">
                Preview
              </a>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !selected || loading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isRequired && (
            <p className="mb-2 text-xs text-muted-foreground">Required file — cannot be deleted</p>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[420px] w-full rounded-[var(--radius-sm)] border border-border bg-muted p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
