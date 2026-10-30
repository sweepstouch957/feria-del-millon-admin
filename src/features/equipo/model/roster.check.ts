// node --experimental-strip-types src/features/equipo/model/roster.check.ts
import assert from "node:assert/strict";
import { parseCredentials, parseRoster, splitName } from "./roster.ts";

const { rows, skipped } = parseRoster(
  [
    "Nataly Ñustez González\tftnatalyngon@gmail.com",
    "ana Marcela González Sánchez\tdimagonsa24@gmail.com",
    "Ayda Ospina\tAYDAOS1967@gmail.com",
    "Ayda Ospina\taydaos1967@gmail.com", // repetida
    "Sin correo",
    "",
  ].join("\n"),
);
assert.equal(rows.length, 3);
assert.deepEqual(rows[0], { firstName: "Nataly", lastName: "Ñustez González", email: "ftnatalyngon@gmail.com" });
assert.deepEqual(rows[1], { firstName: "ana Marcela", lastName: "González Sánchez", email: "dimagonsa24@gmail.com" });
assert.equal(rows[2].email, "aydaos1967@gmail.com");
assert.deepEqual(skipped, ["Sin correo"]);
assert.deepEqual(splitName("Ayda"), { firstName: "Ayda", lastName: "" });

const creds = parseCredentials(
  [
    "Comparto las credenciales de acceso:",
    "| Nombre | Correo | Contraseña |",
    "|---|---|---|",
    "| Ana Prueba | ANA@t.co | `claveFalsa1` |",
    "| Ana Prueba | ana@t.co | `otra` |", // repetida
    "Beto Prueba\tbeto@t.co\tclaveFalsa2",
    "Sin clave\tsinclave@t.co",
    "Saludos cordiales.",
  ].join("\n"),
);
assert.deepEqual(creds.rows, [
  { email: "ana@t.co", password: "claveFalsa1" },
  { email: "beto@t.co", password: "claveFalsa2" },
]);
assert.deepEqual(creds.skipped, ["sinclave@t.co"]);
console.log("roster ok");
