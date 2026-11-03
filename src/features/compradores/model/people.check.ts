// node --experimental-strip-types src/features/compradores/model/people.check.ts
import assert from "node:assert/strict";
import { mergePeople } from "./people.ts";

const people = mergePeople(
  [
    { email: "ANA@x.co", name: "Ana importada", phone: "111", document: "D1", ordersCount: 0, totalSpent: 0, meta: { legacy: { purchases: 2, spent: 900, cityName: "Cali" } } },
    { email: "beto@x.co", name: "Beto", phone: "222", address: { line1: "Cl 2", city: "c1" }, ordersCount: 1, totalSpent: 500 },
    { email: "fantasma@x.co", name: "Sin compras", ordersCount: 0 },
  ],
  [
    { email: "ana@x.co", name: "Ana invitada", phone: "", kind: "invited", source: "Viene de Itaú", confirmed: true },
    { email: "cami@x.co", name: "Cami", kind: "companion", source: "Acompañante de Ana", confirmed: true },
    { email: "dani@x.co", name: "Dani", kind: "ticket", source: "Compró entrada", confirmed: true },
  ],
  (id) => (id === "c1" ? "Bogotá" : undefined),
);

assert.deepEqual(people.map((p) => p.email), ["ana@x.co", "beto@x.co", "cami@x.co", "dani@x.co"]);
const [ana, beto, cami, dani] = people;
assert.equal(ana.name, "Ana invitada", "los datos de esta plataforma mandan");
assert.equal(ana.phone, "111", "lo importado llena lo que falta");
assert.equal(ana.city, "Cali");
assert.deepEqual(ana.kinds, ["invited", "legacy"]);
assert.equal(ana.detail, "Viene de Itaú");
assert.equal(ana.confirmed, true);
assert.equal(ana.pastSpent, 900);
assert.equal(ana.spent, 0, "lo viejo no se suma a las ventas actuales");
assert.deepEqual(beto.kinds, ["artwork"]);
assert.equal(beto.city, "Bogotá");
assert.deepEqual(cami.kinds, ["companion"]);
assert.equal(dani.confirmed, null, "comprar no pasa por confirmación");
console.log("people ok");
