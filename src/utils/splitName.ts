/* eslint-disable @typescript-eslint/no-explicit-any */
/** Split inteligente de nombre/dirección (para ProfileMenu + StoreSwitcher) */
export function splitNameAddress(s: any): { name: string; address: string } {
  const name = String(s?.name ?? "").trim();
  const address = String(s?.address ?? "").trim();

  // Si ya hay address explícito en el objeto → lo respetamos
  if (name && address && name !== address) return { name, address };

  const source = name || address || "";
  if (!source) return { name: "Unnamed store", address: "No address provided" };

  // 1) Caso típico: "Nombre, Dirección"
  const commaIdx = source.indexOf(",");
  if (commaIdx > 0) {
    const nm = source
      .slice(0, commaIdx)
      .trim()
      .replace(/[,\-]+$/, "");
    const addr = source.slice(commaIdx + 1).trim();
    return {
      name: nm || "Unnamed store",
      address: addr || "No address provided",
    };
  }

  // 2) Caso: "Nombre + número dirección" (ej: "El Huerto Supermarket 116 Maple Ave...")
  const digitIdx = source.search(/\d/);
  if (digitIdx > 0) {
    const nm = source
      .slice(0, digitIdx)
      .trim()
      .replace(/[,\-]+$/, "");
    const addr = source.slice(digitIdx).trim();
    return {
      name: nm || "Unnamed store",
      address: addr || "No address provided",
    };
  }

  // Fallback → todo como nombre
  return {
    name: source || "Unnamed store",
    address: "No address provided",
  };
}
