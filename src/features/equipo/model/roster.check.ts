// node --experimental-strip-types src/features/equipo/model/roster.check.ts
import assert from "node:assert/strict";
import { parseRoster, splitName } from "./roster.ts";

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
console.log("roster ok");
