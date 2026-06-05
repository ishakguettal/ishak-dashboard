"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/finance");
  revalidatePath("/");
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

// ---------- Accounts ----------
export async function addAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("accounts").insert({
    name,
    type: String(formData.get("type") ?? "bank"),
    balance: Number(formData.get("balance") ?? 0) || 0,
    currency: String(formData.get("currency") ?? "AED") || "AED",
  });
  refresh();
}

export async function updateAccountBalance(formData: FormData) {
  const id = String(formData.get("id"));
  const balance = Number(formData.get("balance") ?? 0) || 0;
  const supabase = await createClient();
  await supabase.from("accounts").update({ balance }).eq("id", id);
  refresh();
}

export async function deleteAccount(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("accounts").delete().eq("id", id);
  refresh();
}

// ---------- Subscriptions ----------
export async function addSubscription(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("subscriptions").insert({
    name,
    amount: Number(formData.get("amount") ?? 0) || 0,
    currency: String(formData.get("currency") ?? "AED") || "AED",
    billing_cycle: String(formData.get("billing_cycle") ?? "monthly"),
    next_renewal: String(formData.get("next_renewal") || "") || null,
    payment_method: String(formData.get("payment_method") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    auto_renew: formData.get("auto_renew") === "on",
  });
  refresh();
}

export async function deleteSubscription(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("subscriptions").delete().eq("id", id);
  refresh();
}

// ---------- Orders ----------
export async function addOrder(formData: FormData) {
  const item = String(formData.get("item") ?? "").trim();
  if (!item) return;
  const supabase = await createClient();
  await supabase.from("orders").insert({
    item,
    vendor: String(formData.get("vendor") ?? "") || null,
    amount: numberOrNull(formData.get("amount")),
    currency: String(formData.get("currency") ?? "AED") || "AED",
    order_date: String(formData.get("order_date") || "") || undefined,
    status: String(formData.get("status") ?? "ordered"),
    expected_date: String(formData.get("expected_date") || "") || null,
    tracking: String(formData.get("tracking") ?? "") || null,
    link: String(formData.get("link") ?? "") || null,
  });
  refresh();
}

export async function updateOrderStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("id", id);
  refresh();
}

export async function deleteOrder(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", id);
  refresh();
}

// ---------- Wishlist ----------
export async function addWishlistItem(formData: FormData) {
  const item = String(formData.get("item") ?? "").trim();
  if (!item) return;
  const supabase = await createClient();
  await supabase.from("wishlist").insert({
    item,
    price: numberOrNull(formData.get("price")),
    currency: String(formData.get("currency") ?? "AED") || "AED",
    url: String(formData.get("url") ?? "") || null,
    priority: String(formData.get("priority") ?? "medium"),
    category: String(formData.get("category") ?? "") || null,
  });
  refresh();
}

export async function toggleWishlistPurchased(formData: FormData) {
  const id = String(formData.get("id"));
  const purchased = String(formData.get("purchased")) === "true";
  const supabase = await createClient();
  await supabase.from("wishlist").update({ purchased: !purchased }).eq("id", id);
  refresh();
}

export async function deleteWishlistItem(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("wishlist").delete().eq("id", id);
  refresh();
}
