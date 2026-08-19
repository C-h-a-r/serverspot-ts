"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@serverspot/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ThemeOption = {
  id: string;
  type: string;
  label: string;
  default: string;
};

export function ThemeConfigPanel({
  schema,
  initialValues,
}: {
  schema: { options: ThemeOption[] };
  initialValues: Record<string, string>;
}) {
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Theme configuration saved");
    } catch {
      toast.error("Failed to save theme configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Configuration</CardTitle>
        <CardDescription>
          Options from schema.json — changes reflect on the public site immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {schema.options.map((option) => (
            <div key={option.id} className="space-y-2">
              <Label htmlFor={option.id}>{option.label}</Label>
              <Input
                id={option.id}
                type={option.type === "colour" ? "color" : "text"}
                value={values[option.id] ?? option.default}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [option.id]: e.target.value }))
                }
              />
            </div>
          ))}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save configuration"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
