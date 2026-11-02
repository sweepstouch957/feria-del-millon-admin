// node --experimental-strip-types src/features/ingresos/model/income.check.ts
import assert from "node:assert/strict";
import { buildCustomers, byMethod, methodLabel, orderIncome } from "./income.ts";

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
console.log("income ok");
