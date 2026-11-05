// node --experimental-strip-types src/lib/roleHome.check.ts
import assert from "node:assert/strict";
import { canOpen, homeFor } from "./roleHome.ts";

const cajera = { cajero: true };
assert.equal(canOpen(cajera, "/caja"), true);
assert.equal(canOpen(cajera, "/caja/cierre"), true);
assert.equal(canOpen(cajera, "/tickets/validator"), true);
assert.equal(canOpen(cajera, "/tickets/taquilla"), true);
assert.equal(canOpen(cajera, "/tickets/asistentes"), false);
assert.equal(canOpen(cajera, "/orders"), false);
assert.equal(canOpen(cajera, "/reportes/ventas"), false);
assert.equal(canOpen(cajera, "/orders/cartera"), false);
assert.equal(canOpen({ jefeCaja: true }, "/orders/cartera"), true);
assert.equal(canOpen(cajera, "/account"), true);

const taquilla = { taquilla: true };
assert.equal(canOpen(taquilla, "/tickets/taquilla"), true);
assert.equal(canOpen(taquilla, "/tickets/asistentes"), false);
assert.equal(canOpen(taquilla, "/tickets"), false);
assert.equal(canOpen(taquilla, "/caja"), false);
assert.equal(canOpen(taquilla, "/events"), false);

assert.equal(canOpen({ superuser: true }, "/events"), true);
assert.equal(canOpen({ curador: true }, "/reportes"), true);
assert.equal(canOpen({ artista: true }, "/inventory/artworks"), true); // otros perfiles sin cambios
assert.equal(homeFor(taquilla), "/tickets/validator");
console.log("ok");
