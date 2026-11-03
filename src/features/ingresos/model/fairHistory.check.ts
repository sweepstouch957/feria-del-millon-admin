// node --experimental-strip-types src/features/ingresos/model/fairHistory.check.ts
import assert from "node:assert/strict";
import { bestByMetric, currentYearRow, fullSaleProjection, historyTotals, methodColumns, rankOf, yearIncome, type YearRow } from "./fairHistory.ts";

const base = { buyers: 0, applications: 0, accepted: 0, paidApplications: 0, applicationRevenue: 0 };
const rows: YearRow[] = [
  { ...base, year: "2024", artworksSold: 10, artworkRevenue: 500 },
  { ...base, year: "2025", artworksSold: 30, artworkRevenue: 900 },
  { ...base, year: "2026", artworksSold: 30, artworkRevenue: 100 },
];
const best = bestByMetric(rows);
assert.equal(best.artworkRevenue, "2025");
assert.equal(best.artworksSold, "2026"); // empate: gana el más reciente
assert.equal(best.buyers, undefined); // todo en cero: no hay "mejor"
assert.equal(rankOf(rows, "2026", "artworkRevenue"), 3);
assert.equal(rankOf(rows, "2026", "artworksSold"), 1);

const cur = currentYearRow("2026", {
  orders: [{ items: [{ qty: 2 }, {}], buyer: { email: "A@x.co " } }, { items: [{ qty: 1 }], buyer: { email: "a@x.co" } }],
  ordersTotal: 300,
  appsTotal: 40,
  apps: [1],
  applications: { total: 9, accepted: 3 },
  ticketsTotal: 7,
});
assert.equal(cur.artworksSold, 4);
assert.equal(cur.buyers, 1);
assert.equal(cur.applications, 9);
assert.equal(cur.ticketsSold, 0);
assert.equal(yearIncome(cur), 300 + 40 + 7);

const withMethods: YearRow[] = [
  { ...base, year: "2024", artworksSold: 1, artworkRevenue: 100, newBuyers: 2, methods: { Efectivo: 10, Datáfono: 90 } },
  { ...base, year: "2025", artworksSold: 1, artworkRevenue: 200, newBuyers: 3, methods: { Datáfono: 50, PSE: 70 } },
];
assert.deepEqual(methodColumns(withMethods), ["Datáfono", "PSE", "Efectivo"]);
const t = historyTotals(withMethods);
assert.equal(t.uniqueBuyers, 5);
assert.equal(t.income, 300);

assert.deepEqual(
  fullSaleProjection({ collected: { artworks: 100, applications: 20, tickets: 5 }, stockValue: 1000, ticketsLeft: 50 }),
  { today: 125, ifArtworksSell: 1125, ifEverythingSells: 1175 },
);
console.log("ok");
