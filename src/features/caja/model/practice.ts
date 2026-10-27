import type { SalesLine } from "@services/orders.service";

/* Ventas de práctica: viven solo en este navegador para que la cajera vea su
   "cierre del día" mientras aprende. Nunca llegan al servidor. */

const KEY = "caja:practica";

export function listPracticeSales(): SalesLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addPracticeSale(line: SalesLine) {
  try {
    localStorage.setItem(KEY, JSON.stringify([line, ...listPracticeSales()].slice(0, 200)));
  } catch {
    /* sin almacenamiento: la práctica sigue, solo no se acumula */
  }
}

export function clearPracticeSales() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}

export const practiceId = () => `PRACTICA-${Date.now().toString(36).toUpperCase()}`;

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
