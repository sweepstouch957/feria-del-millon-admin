// node --experimental-strip-types src/features/ingresos/model/income.check.ts
import assert from "node:assert/strict";
import { appAmount, buildCustomers, byMethod, dayOf, fairConvocatorias, isCollected, methodLabel, methodMatrix, monthlyIncome, orderIncome, orderPayments } from "./income.ts";

assert.equal(appAmount({ paymentDetails: { transaction_amount: 40000 }, convocatoria: { fee: 1 } }), 40000);
assert.equal(appAmount({ convocatoria: { fee: 50000 } }), 50000);
assert.equal(appAmount({ convocatoria: "id-sin-poblar" }), 0);

assert.equal(methodLabel("whatsapp"), "Transferencia");
assert.equal(methodLabel("transfer"), "Transferencia");
assert.equal(methodLabel("pse"), "En línea");

const sales = [
  { m: "cash", p: 35000 },
  { m: "mercadopago", p: 55000 },
  { m: "mercadopago", p: 0 }, // segunda entrada del 2x1
  { m: "transfer", p: 80000 },
];
assert.deepEqual(byMethod(sales, (s) => s.m, (s) => s.p), [
  { label: "Transferencia", count: 1, amount: 80000 },
  { label: "En línea", count: 2, amount: 55000 },
  { label: "Efectivo", count: 1, amount: 35000 },
]);

assert.equal(orderIncome({ status: "paid", total: 100 }), 100);
assert.equal(orderIncome({ status: "partial", total: 100, layaway: { amountPaid: 30 } }), 30);
assert.equal(orderIncome({ status: "refunded", total: 100 }), 0);
assert.equal(orderIncome({ status: "failed", total: 100 }), 0);

const customers = buildCustomers(
  [
    { price: 35000, buyer: { name: "Ana", email: "ANA@x.co ", phone: "300" } },
    { price: 0, buyer: { email: "ana@x.co" } },
    { price: 35000, buyer: {} }, // sin correo no se puede unir a nadie
  ],
  [
    { status: "paid", total: 500000, buyer: { name: "Otro nombre", email: "ana@x.co", document: "123" } },
    { status: "partial", total: 900, layaway: { amountPaid: 100 }, buyer: { name: "Beto", email: "beto@x.co" }, cityName: "Cali" },
    { status: "failed", total: 900, buyer: { name: "Cero", email: "cero@x.co" } },
  ],
);
assert.equal(customers.length, 2);
assert.deepEqual(
  { ...customers[0] },
  { email: "ana@x.co", name: "Ana", phone: "300", document: "123", address: "", city: "", company: "", tickets: 2, ticketsAmount: 35000, orders: 1, ordersAmount: 500000 },
);
assert.equal(customers[1].city, "Cali");
assert.equal(customers[1].ordersAmount, 100);

assert.equal(isCollected({ isPaid: true, paymentStatus: "approved" }), true);
assert.equal(isCollected({ isPaid: true, paymentStatus: "rejected" }), false);
assert.equal(isCollected({ isPaid: false, paymentStatus: "approved" }), false);

const convs = [
  { id: "actual", event: "E", name: "Feria 2026" },
  { id: "huerfana", event: "viejo", name: "Feria 2026" },
  { id: "otra", event: "viejo", name: "Feria 2025" },
];
assert.deepEqual(fairConvocatorias(convs, "E").map((c) => c.id), ["actual", "huerfana"]);

const months = monthlyIncome([
  { at: "2026-05-10T12:00:00Z", source: "apps", amount: 40000 },
  { at: "2026-08-01T03:00:00Z", source: "orders", amount: 100 }, // 31-jul en Colombia
  { at: "2026-07-05T12:00:00Z", source: "tickets", amount: 0 }, // sin plata no abre mes
]);
assert.deepEqual(months.map((m) => m.month), ["2026-05", "2026-06", "2026-07"]);
assert.equal(months[2].orders, 100);
assert.deepEqual(monthlyIncome([]), []);
// Apartada: 2 abonos con métodos distintos; pagada: todo a su método.
const apartada = { status: "partial", total: 1000, payment: { method: "cash" }, layaway: { amountPaid: 500, installments: [{ amount: 200, method: "cash" }, { amount: 300, method: "transfer" }] } };
const noAt = (ps: { at?: string }[]) => ps.map(({ at: _, ...p }) => p);
assert.deepEqual(noAt(orderPayments(apartada)), [{ method: "cash", amount: 200 }, { method: "transfer", amount: 300 }]);
assert.deepEqual(noAt(orderPayments({ status: "paid", total: 900, payment: { method: "card_offline" } })), [{ method: "card_offline", amount: 900 }]);
// Abonos que no cubren lo pagado: el resto va al método de la orden.
assert.deepEqual(noAt(orderPayments({ status: "paid", total: 900, payment: { method: "cash" }, layaway: { installments: [{ amount: 400, method: "transfer" }] } })), [{ method: "transfer", amount: 400 }, { method: "cash", amount: 500 }]);
const matrix = methodMatrix([{ paymentMethod: "cash", price: 35000 }], [apartada], [40000]);
assert.deepEqual(matrix.find((r) => r.label === "Efectivo"), { label: "Efectivo", tickets: 35000, orders: 200, apps: 0, total: 35200, count: 2 });
assert.equal(matrix.find((r) => r.label === "En línea")?.apps, 40000);
assert.equal(matrix.find((r) => r.label === "Transferencia")?.orders, 300);

// Por día (hora Colombia): cada abono cuenta el día en que entró.
assert.equal(dayOf("2026-11-06T03:00:00Z"), "2026-11-05"); // jueves 10 pm en Bogotá
const dos = { status: "partial", total: 1000, layaway: { amountPaid: 500, installments: [
  { amount: 200, method: "cash", at: "2026-11-05T20:00:00Z" },
  { amount: 300, method: "card_offline", at: "2026-11-06T20:00:00Z" },
] } };
const jueves = methodMatrix([], [dos], [], "2026-11-05");
assert.deepEqual(jueves.map((r) => [r.label, r.orders]), [["Efectivo", 200]]);
assert.equal(methodMatrix([], [{ status: "paid", total: 900, paidAt: "2026-11-06T03:00:00Z", payment: { method: "card_offline" } }], [], "2026-11-05")[0]?.orders, 900);

console.log("income ok");
