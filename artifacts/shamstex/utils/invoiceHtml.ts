import type { Order, AppSettings, PaymentMethod } from "@/context/AppContext";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "كاش عند الاستلام",
  bank_transfer: "تحويل بنكي",
  ewallet: "محفظة إلكترونية",
  instapay: "انستاباي",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدول",
  pending: "قيد المراجعة",
  received: "تم الاستلام",
  preparing: "قيد التحضير",
  ready: "جاهز",
  ready_to_ship: "جاهز للشحن",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  store: "استلام من المحل",
  branch: "استلام من الفرع",
  shipping: "شحن",
};

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} — ${hh}:${mn}`;
  } catch {
    return iso;
  }
}

function formatMoney(n: number): string {
  const v = Number(n) || 0;
  return v.toLocaleString("en-EG", { maximumFractionDigits: 2 });
}

export function buildInvoiceHtml(order: Order, settings: AppSettings): string {
  const business = escapeHtml(settings.aboutTitle || "شمس تكس");
  const logoUri = settings.logoUri ? escapeHtml(settings.logoUri) : "";
  const phoneContact = (settings.contacts || []).find((c) =>
    /مبيعات|دعم|wholesale|sales/i.test(c.label),
  );
  const phone = phoneContact ? escapeHtml(phoneContact.number) : "";

  const itemsRows = order.items
    .map((it, idx) => {
      const isWeight = it.orderType === "weight";
      const qtyDisplay = isWeight
        ? `${formatMoney(it.actualWeight ?? it.weight ?? it.quantity)} كغ`
        : `${it.quantity} ${it.unit ?? "ثوب"}`;
      const lineTotal = isWeight
        ? (it.actualWeight ?? it.weight ?? 0) * it.unitPrice
        : it.quantity * it.unitPrice;
      return `
        <tr>
          <td class="c">${idx + 1}</td>
          <td>
            <div class="pname">${escapeHtml(it.productName)}</div>
            <div class="pcolor">
              <span class="swatch" style="background:${escapeHtml(it.colorHex || "#000")}"></span>
              ${escapeHtml(it.colorName)}
            </div>
          </td>
          <td class="c">${qtyDisplay}</td>
          <td class="c">${formatMoney(it.unitPrice)} ج.م</td>
          <td class="c b">${formatMoney(lineTotal)} ج.م</td>
        </tr>`;
    })
    .join("");

  const paymentLabel = order.paymentMethod
    ? escapeHtml(PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod)
    : "غير محدد";
  const statusLabel = escapeHtml(STATUS_LABELS[order.status] || order.status);
  const subtotal = order.total;
  const fee = order.paymentFee ?? 0;
  const grand = order.totalWithFee ?? order.total;

  const fulfillmentType = order.fulfillmentType ?? "store";
  const isShipping = fulfillmentType === "shipping";
  let fulfillmentLabel = FULFILLMENT_LABELS[fulfillmentType] || "استلام من المحل";
  if (fulfillmentType === "branch" && order.branchName) {
    fulfillmentLabel = `استلام من فرع: ${order.branchName}`;
  } else if (isShipping && (order.shippingProviderName || order.shippingProviderId)) {
    fulfillmentLabel = `شحن — ${order.shippingProviderName ?? order.shippingProviderId}`;
  }
  fulfillmentLabel = escapeHtml(fulfillmentLabel);
  const waybillNumber = order.shippingWaybillNumber ? escapeHtml(order.shippingWaybillNumber) : "";

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>فاتورة #${escapeHtml(order.id.slice(0, 8))}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", "Tahoma", sans-serif;
    color: #1a1a1a;
    background: #fff;
    margin: 0;
    padding: 28px;
    direction: rtl;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #d4a017;
    padding-bottom: 18px;
    margin-bottom: 22px;
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand img { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
  .brand-name { font-size: 22px; font-weight: 800; color: #000; }
  .brand-sub { font-size: 12px; color: #666; margin-top: 2px; }
  .invoice-title { text-align: left; }
  .invoice-title .t { font-size: 28px; font-weight: 800; color: #d4a017; letter-spacing: 1px; }
  .invoice-title .n { font-size: 13px; color: #444; margin-top: 4px; font-family: monospace; }
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    background: #faf7ee;
    border: 1px solid #ecd9a1;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 18px;
  }
  .meta .row { font-size: 13px; line-height: 1.7; }
  .meta .label { color: #777; font-size: 11px; }
  .meta .val { color: #111; font-weight: 600; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 18px;
    font-size: 13px;
  }
  thead th {
    background: #111;
    color: #d4a017;
    padding: 10px 8px;
    text-align: right;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.5px;
  }
  thead th.c { text-align: center; }
  tbody td {
    border-bottom: 1px solid #eee;
    padding: 10px 8px;
    vertical-align: top;
  }
  tbody td.c { text-align: center; }
  tbody td.b { font-weight: 700; color: #000; }
  .pname { font-weight: 600; color: #111; }
  .pcolor {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    color: #666;
    font-size: 11px;
  }
  .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid #ddd;
  }
  .totals {
    display: flex;
    justify-content: flex-start;
    margin-top: 10px;
  }
  .totals-box {
    min-width: 280px;
    background: #faf7ee;
    border: 1px solid #ecd9a1;
    border-radius: 10px;
    padding: 14px 18px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 13px;
  }
  .totals-row.grand {
    border-top: 2px solid #d4a017;
    margin-top: 8px;
    padding-top: 10px;
    font-size: 16px;
    font-weight: 800;
    color: #000;
  }
  .footer {
    margin-top: 30px;
    padding-top: 14px;
    border-top: 1px dashed #ccc;
    text-align: center;
    color: #888;
    font-size: 11px;
    line-height: 1.7;
  }
  .footer .thanks { color: #d4a017; font-weight: 700; font-size: 13px; margin-bottom: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logoUri ? `<img src="${logoUri}" alt="logo" />` : ""}
      <div>
        <div class="brand-name">${business}</div>
        ${phone ? `<div class="brand-sub">${phone}</div>` : ""}
      </div>
    </div>
    <div class="invoice-title">
      <div class="t">فاتورة</div>
      <div class="n">#${escapeHtml(order.id.slice(0, 8))}</div>
    </div>
  </div>

  <div class="meta">
    <div class="row">
      <div class="label">العميل</div>
      <div class="val">${escapeHtml(order.userName || "—")}</div>
      <div class="label" style="margin-top:6px">رقم الهاتف</div>
      <div class="val">${escapeHtml(order.userPhone || "—")}</div>
    </div>
    <div class="row">
      <div class="label">تاريخ الطلب</div>
      <div class="val">${formatDate(order.createdAt)}</div>
      <div class="label" style="margin-top:6px">الحالة</div>
      <div class="val">${statusLabel}</div>
      <div class="label" style="margin-top:6px">طريقة الدفع</div>
      <div class="val">${paymentLabel}</div>
      <div class="label" style="margin-top:6px">طريقة الاستلام</div>
      <div class="val">${fulfillmentLabel}</div>
      ${waybillNumber ? `<div class="label" style="margin-top:6px">رقم بوليصة الشحن</div><div class="val">${waybillNumber}</div>` : ""}
    </div>
  </div>

  ${isShipping ? `<div style="margin-bottom:18px;padding:12px 16px;background:#fff4e5;border:1px solid #f5a623;border-radius:10px;font-size:13px;color:#8a4b00;font-weight:700;text-align:center">⚠ السعر غير شامل ثمن الشحن</div>` : ""}

  <table>
    <thead>
      <tr>
        <th class="c" style="width:36px">#</th>
        <th>المنتج</th>
        <th class="c">الكمية</th>
        <th class="c">سعر الوحدة</th>
        <th class="c">الإجمالي</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>المجموع الفرعي</span>
        <span>${formatMoney(subtotal)} ج.م</span>
      </div>
      ${fee > 0 ? `<div class="totals-row"><span>رسوم الدفع</span><span>${formatMoney(fee)} ج.م</span></div>` : ""}
      <div class="totals-row grand">
        <span>الإجمالي</span>
        <span>${formatMoney(grand)} ج.م</span>
      </div>
    </div>
  </div>

  ${order.notes ? `<div style="margin-top:18px;padding:12px 14px;background:#f7f7f7;border-radius:8px;font-size:12px;color:#555"><b>ملاحظات: </b>${escapeHtml(order.notes)}</div>` : ""}

  <div class="footer">
    <div class="thanks">شكراً لتعاملكم مع ${business}</div>
    <div>هذه الفاتورة مُولّدة تلقائياً ولا تحتاج إلى ختم.</div>
  </div>
</body>
</html>`;
}
