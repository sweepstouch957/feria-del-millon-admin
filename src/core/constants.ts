export const AUTH_TOKEN_KEY = "auth_token_feria-millon"; // opcional si quieres también tenerlo legible
/** Fija la feria a mano (pruebas). Vacía = se usa la feria ACTIVA,
 *  vía useActiveEvent(). Antes aquí había un ObjectId de una feria vieja
 *  como fallback y todo el panel de boletos pedía datos de esa feria. */
export const ENV_EVENT_ID = process.env.NEXT_PUBLIC_EVENT_ID || "";
export const FIXED_PAVILION_ID = process.env.NEXT_PUBLIC_FIXED_PAVILION_ID || "691143ebe974514d194d8b5e";
