"use client";

import { Button, Input, Label } from "@serverspot/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("9.99");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, description, type: "item" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Product created");
      router.push("/admin/store/products");
      router.refresh();
    } catch {
      toast.error("Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New product</h1>
        <p className="text-muted-foreground">Add a product to your store catalog</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create product"}
        </Button>
      </form>
    </div>
  );
}
