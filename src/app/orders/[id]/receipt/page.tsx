import type { Metadata } from "next";
import { Check, MapPin, PackageCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import PrintReceiptButton from "@/components/PrintReceiptButton";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order receipt | HarvestNearU", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };
type Row = Record<string, unknown>;

const money = (value: unknown) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value) / 100);
const dateTime = (value: unknown) => value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(String(value))) : "Not recorded";
const label = (value: unknown) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function OrderReceiptPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) notFound();
  const { id } = await params;
  const sql = getDatabase();
  const [orders, items] = await Promise.all([
    sql`SELECT orders.id,orders.order_number,orders.status,orders.currency,orders.subtotal_kobo,orders.delivery_fee_kobo,
      orders.service_fee_kobo,orders.discount_kobo,orders.total_kobo,orders.fulfilment_method,orders.delivery_address_snapshot,
      orders.placed_at,orders.paid_at,users.first_name,users.last_name,users.email,users.phone,
      payment.provider AS payment_provider,payment.provider_reference,payment.payment_channel,payment.status AS payment_status
      FROM orders JOIN users ON users.id=orders.customer_id
      LEFT JOIN LATERAL (SELECT provider,provider_reference,payment_channel,status FROM payments WHERE order_id=orders.id ORDER BY created_at DESC LIMIT 1) payment ON true
      WHERE orders.id=${id} AND orders.customer_id=${user.id} AND orders.paid_at IS NOT NULL LIMIT 1`,
    sql`SELECT product_name,farm_name,unit,quantity,unit_price_kobo,line_total_kobo FROM order_items
      WHERE order_id=${id} ORDER BY created_at`,
  ]);
  if (!orders[0]) notFound();
  const order = orders[0] as Row;
  const address = order.delivery_address_snapshot && typeof order.delivery_address_snapshot === "object" ? order.delivery_address_snapshot as Row : null;
  const paymentMethod = order.payment_provider ? label(order.payment_provider) : Number(order.discount_kobo) > 0 ? "Account Credit" : "Confirmed Payment";
  return <main className="receipt-page"><div className="receipt-toolbar"><Link href="/orders">Back to my orders</Link><PrintReceiptButton/></div><article className="receipt-sheet">
    <header><Image src="/brand/harvestnearu-opaque-seal-se2-lockup.png" width={210} height={52} alt="HarvestNearU" priority/><div><span className="receipt-paid"><Check size={14}/> Paid</span><h1>Receipt</h1><p>Order #{String(order.order_number)}</p></div></header>
    <section className="receipt-parties"><div><small>BILLED TO</small><strong>{String(order.first_name)} {String(order.last_name)}</strong><span>{String(order.email)}</span>{Boolean(order.phone)&&<span>{String(order.phone)}</span>}</div><div><small>RECEIPT DETAILS</small><dl><dt>Order date</dt><dd>{dateTime(order.placed_at)}</dd><dt>Payment date</dt><dd>{dateTime(order.paid_at)}</dd><dt>Payment method</dt><dd>{paymentMethod}</dd>{Boolean(order.payment_channel)&&<><dt>Channel</dt><dd>{label(order.payment_channel)}</dd></>}<dt>Status</dt><dd>{label(order.status)}</dd></dl></div></section>
    <section className="receipt-fulfilment"><PackageCheck size={19}/><div><small>FULFILMENT</small><strong>{label(order.fulfilment_method)}</strong>{address&&<span><MapPin size={13}/>{[address.line1,address.city,address.state].filter(Boolean).join(", ")}</span>}</div></section>
    <table><thead><tr><th>Item</th><th>Farm</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{(items as Row[]).map((item,index)=><tr key={`${item.product_name}-${index}`}><td><strong>{String(item.product_name)}</strong><small>per {String(item.unit)}</small></td><td>{String(item.farm_name)}</td><td>{Number(item.quantity)} {String(item.unit)}</td><td>{money(item.unit_price_kobo)}</td><td>{money(item.line_total_kobo)}</td></tr>)}</tbody></table>
    <section className="receipt-totals"><span><em>Subtotal</em><strong>{money(order.subtotal_kobo)}</strong></span>{Number(order.delivery_fee_kobo)>0&&<span><em>Delivery</em><strong>{money(order.delivery_fee_kobo)}</strong></span>}{Number(order.service_fee_kobo)>0&&<span><em>Service fee</em><strong>{money(order.service_fee_kobo)}</strong></span>}{Number(order.discount_kobo)>0&&<span><em>Account credit / discount</em><strong>-{money(order.discount_kobo)}</strong></span>}<span className="receipt-total"><em>Total paid</em><strong>{money(order.total_kobo)}</strong></span></section>
    <footer><p>Thank you for supporting local Nigerian farms.</p><span>HarvestNearU | harvestnearu.com | hello@harvestnearu.com</span>{Boolean(order.provider_reference)&&<small>Payment reference: {String(order.provider_reference)}</small>}</footer>
  </article></main>;
}
