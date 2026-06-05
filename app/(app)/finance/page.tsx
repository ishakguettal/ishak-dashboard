import {
  Wallet,
  CreditCard,
  Package,
  Heart,
  Trash2,
  ExternalLink,
  TriangleAlert,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutoSubmitSelect } from "@/components/ui/AutoSubmit";
import { NetWorthPie } from "@/components/charts/NetWorthPie";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_COLORS,
  BILLING_CYCLES,
  ORDER_STATUSES,
  PRIORITIES,
  PRIORITY_STYLES,
  RENEWAL_WARNING_DAYS,
} from "@/lib/constants";
import { todayISO, relativeDay, daysUntil, formatDateShort } from "@/lib/utils/date";
import { formatAED, formatCurrency, titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Account, Subscription, Order, WishlistItem } from "@/lib/types/db";
import {
  addAccount,
  updateAccountBalance,
  deleteAccount,
  addSubscription,
  deleteSubscription,
  addOrder,
  updateOrderStatus,
  deleteOrder,
  addWishlistItem,
  toggleWishlistPurchased,
  deleteWishlistItem,
} from "./actions";

export const dynamic = "force-dynamic";

function monthlyCost(amount: number, cycle: string): number {
  switch (cycle) {
    case "weekly":
      return (amount * 52) / 12;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

export default async function FinancePage() {
  const supabase = await createClient();
  const today = todayISO();

  const [accountsRes, subsRes, ordersRes, wishRes] = await Promise.all([
    supabase.from("accounts").select("*").order("sort_order"),
    supabase.from("subscriptions").select("*").eq("active", true).order("next_renewal"),
    supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false })
      .limit(30),
    supabase.from("wishlist").select("*").order("sort_order"),
  ]);

  const accounts = (accountsRes.data ?? []) as Account[];
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const orders = (ordersRes.data ?? []) as Order[];
  const wishlist = (wishRes.data ?? []) as WishlistItem[];

  const netWorth = accounts.reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const pieData = accounts.map((a) => ({
    name: a.name,
    value: Number(a.balance ?? 0),
    color: ACCOUNT_TYPE_COLORS[a.type] ?? ACCOUNT_TYPE_COLORS.other,
  }));

  const totalMonthly = subscriptions.reduce(
    (s, sub) => s + monthlyCost(Number(sub.amount), sub.billing_cycle),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Finance</h1>
        <p className="mt-0.5 text-sm text-muted">Net worth, subscriptions &amp; spending.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Net worth" value={formatAED(netWorth)} accent="text-success" />
        <StatCard
          label="Subscriptions"
          value={`${formatAED(totalMonthly)}/mo`}
          sub={`${subscriptions.length} active`}
        />
        <StatCard
          label="Open orders"
          value={String(
            orders.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status)).length,
          )}
        />
      </div>

      {/* Net worth + accounts */}
      <Card>
        <CardHeader
          title="Net worth"
          icon={Wallet}
          action={
            <FormModal title="New account" action={addAccount}>
              <Field label="Name">
                <Input name="name" required placeholder="Emirates NBD" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Select name="type" defaultValue="bank">
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {titleize(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Currency">
                  <Input name="currency" defaultValue="AED" />
                </Field>
              </div>
              <Field label="Balance">
                <Input name="balance" type="number" step="any" defaultValue={0} />
              </Field>
            </FormModal>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <NetWorthPie data={pieData} />
          <div>
            {accounts.length === 0 ? (
              <EmptyState icon={Wallet} title="No accounts" hint="Add cash, bank or savings." />
            ) : (
              <ul className="space-y-2">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          ACCOUNT_TYPE_COLORS[a.type] ?? ACCOUNT_TYPE_COLORS.other,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted">{titleize(a.type)}</p>
                    </div>
                    <form
                      action={updateAccountBalance}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <Input
                        name="balance"
                        type="number"
                        step="any"
                        defaultValue={a.balance}
                        className="w-24 text-right tabular-nums"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-surface-2 px-2 py-1.5 text-xs hover:bg-surface-2/70"
                      >
                        Save
                      </button>
                    </form>
                    <form action={deleteAccount}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="rounded p-1 text-muted hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader
          title="Subscriptions"
          icon={CreditCard}
          action={
            <FormModal title="New subscription" action={addSubscription}>
              <Field label="Name">
                <Input name="name" required placeholder="Spotify" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount">
                  <Input name="amount" type="number" step="any" required />
                </Field>
                <Field label="Currency">
                  <Input name="currency" defaultValue="AED" />
                </Field>
                <Field label="Billing cycle">
                  <Select name="billing_cycle" defaultValue="monthly">
                    {BILLING_CYCLES.map((c) => (
                      <option key={c} value={c}>
                        {titleize(c)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Next renewal">
                  <Input name="next_renewal" type="date" />
                </Field>
                <Field label="Payment method">
                  <Input name="payment_method" placeholder="Visa ••42" />
                </Field>
                <Field label="Category">
                  <Input name="category" placeholder="Entertainment" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="auto_renew" defaultChecked className="size-4" />
                Auto-renews (warn before deduction)
              </label>
            </FormModal>
          }
        />
        {subscriptions.length === 0 ? (
          <EmptyState icon={CreditCard} title="No subscriptions" hint="Track recurring costs." />
        ) : (
          <ul className="space-y-2">
            {subscriptions.map((sub) => {
              const d =
                sub.next_renewal != null ? daysUntil(sub.next_renewal, today) : null;
              const soon = d != null && d >= 0 && d <= RENEWAL_WARNING_DAYS;
              return (
                <li
                  key={sub.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{sub.name}</p>
                    <p className="text-xs text-muted">
                      {formatCurrency(sub.amount, sub.currency)} ·{" "}
                      {titleize(sub.billing_cycle)}
                      {sub.category ? ` · ${sub.category}` : ""}
                    </p>
                  </div>
                  {sub.next_renewal ? (
                    soon ? (
                      <Badge
                        className={cn(
                          d != null && d <= 2
                            ? "border-danger/30 bg-danger/10 text-danger"
                            : "border-warning/30 bg-warning/10 text-warning",
                        )}
                      >
                        <TriangleAlert className="size-3" />
                        {sub.auto_renew ? "auto-deduct " : ""}
                        {relativeDay(sub.next_renewal, today)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted">
                        {relativeDay(sub.next_renewal, today)}
                      </span>
                    )
                  ) : null}
                  <form action={deleteSubscription}>
                    <input type="hidden" name="id" value={sub.id} />
                    <button
                      type="submit"
                      className="rounded p-1 text-muted hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders */}
        <Card>
          <CardHeader
            title="Orders"
            icon={Package}
            action={
              <FormModal title="New order" action={addOrder}>
                <Field label="Item">
                  <Input name="item" required placeholder="Mechanical keyboard" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vendor">
                    <Input name="vendor" placeholder="Amazon" />
                  </Field>
                  <Field label="Amount">
                    <Input name="amount" type="number" step="any" />
                  </Field>
                  <Field label="Order date">
                    <Input name="order_date" type="date" defaultValue={today} />
                  </Field>
                  <Field label="Expected">
                    <Input name="expected_date" type="date" />
                  </Field>
                  <Field label="Status">
                    <Select name="status" defaultValue="ordered">
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {titleize(s)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Link">
                    <Input name="link" type="url" placeholder="https://" />
                  </Field>
                </div>
              </FormModal>
            }
          />
          {orders.length === 0 ? (
            <EmptyState icon={Package} title="No orders" hint="Track what's on the way." />
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="rounded-lg border border-border bg-surface-2/40 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{o.item}</p>
                      <p className="text-xs text-muted">
                        {o.vendor ? `${o.vendor} · ` : ""}
                        {o.amount != null ? formatCurrency(o.amount, o.currency) : ""}
                        {o.expected_date
                          ? ` · exp. ${formatDateShort(o.expected_date)}`
                          : ""}
                      </p>
                    </div>
                    {o.link ? (
                      <a
                        href={o.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                    <form action={deleteOrder}>
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        className="rounded p-1 text-muted hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                  <form action={updateOrderStatus} className="mt-2">
                    <input type="hidden" name="id" value={o.id} />
                    <AutoSubmitSelect
                      name="status"
                      defaultValue={o.status}
                      className="h-7 w-36 py-0.5 text-xs"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {titleize(s)}
                        </option>
                      ))}
                    </AutoSubmitSelect>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Wishlist */}
        <Card>
          <CardHeader
            title="Wishlist"
            icon={Heart}
            action={
              <FormModal title="New wishlist item" action={addWishlistItem}>
                <Field label="Item">
                  <Input name="item" required placeholder="iPad Pro" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price">
                    <Input name="price" type="number" step="any" />
                  </Field>
                  <Field label="Currency">
                    <Input name="currency" defaultValue="AED" />
                  </Field>
                  <Field label="Priority">
                    <Select name="priority" defaultValue="medium">
                      {PRIORITIES.filter((p) => p !== "urgent").map((p) => (
                        <option key={p} value={p}>
                          {titleize(p)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Category">
                    <Input name="category" placeholder="Tech" />
                  </Field>
                </div>
                <Field label="Link">
                  <Input name="url" type="url" placeholder="https://" />
                </Field>
              </FormModal>
            }
          />
          {wishlist.length === 0 ? (
            <EmptyState icon={Heart} title="Nothing here yet" hint="Add something you want." />
          ) : (
            <ul className="space-y-2">
              {wishlist.map((w) => {
                const pctNet =
                  w.price && netWorth > 0 ? (w.price / netWorth) * 100 : null;
                return (
                  <li
                    key={w.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
                  >
                    <form action={toggleWishlistPurchased} className="flex">
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="purchased" value={String(w.purchased)} />
                      <button
                        type="submit"
                        aria-label="Toggle purchased"
                        className={
                          "flex size-5 items-center justify-center rounded-md border transition-colors " +
                          (w.purchased
                            ? "border-success bg-success text-bg"
                            : "border-border hover:border-primary")
                        }
                      >
                        {w.purchased ? <Check className="size-3.5" /> : null}
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          "truncate text-sm " +
                          (w.purchased ? "text-muted line-through" : "text-text")
                        }
                      >
                        {w.item}
                      </p>
                      <p className="text-xs text-muted">
                        {w.price != null ? formatCurrency(w.price, w.currency) : "—"}
                        {pctNet != null ? ` · ${pctNet.toFixed(1)}% of net worth` : ""}
                      </p>
                    </div>
                    <Badge className={PRIORITY_STYLES[w.priority]}>
                      {titleize(w.priority)}
                    </Badge>
                    {w.url ? (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                    <form action={deleteWishlistItem}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        className="rounded p-1 text-muted hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
