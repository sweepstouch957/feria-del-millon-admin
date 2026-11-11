// Contenido de la guía de caja: pasos por rol y qué hacer con cada error.

export type GuideRole = "cajera" | "coordinadora" | "taquilla" | "puerta";

export const ROLE_TABS: { value: GuideRole; label: string }[] = [
  { value: "cajera", label: "Cajera" },
  { value: "coordinadora", label: "Coordinadora" },
  { value: "taquilla", label: "Taquilla" },
  { value: "puerta", label: "Puerta" },
];

export const STEPS: Record<GuideRole, string[]> = {
  cajera: [
    "Entra a «Vender obra».",
    "Busca la obra: toca el ícono de QR del buscador y apunta a la etiqueta, o escribe el código FDM…, el título o el artista.",
    "Toca la obra: revisa la foto grande, el precio y cuántas quedan.",
    "Precio: se cobra el de la obra. Si el artista autorizó descuento, baja el precio y escribe quién lo autorizó. Nunca más alto.",
    "Cliente: búscalo por nombre, correo, teléfono o cédula. Si no existe, créalo ahí mismo.",
    "Entrega: TODAS las obras se entregan a domicilio. Pide dirección y ciudad; la obra no sale de la feria con el comprador.",
    "Método de pago: Efectivo, Datáfono (escribe el código de autorización del voucher) o Transferencia (sube la foto del comprobante si la tienes).",
    "«Cobrar». Sale la venta lista con el número de pedido: díctalo o muéstralo al cliente.",
    "Al cerrar: «Mi cierre del día» y cuadra el efectivo y los vouchers con esas cifras.",
    "También validas entradas en «Validar entradas» (ver pestaña Puerta).",
  ],
  coordinadora: [
    "Haces todo lo de la cajera.",
    "Apartar: en la venta activa «Apartar con abono», recibe un abono (mayor a 0) y pon la fecha límite. La obra queda reservada.",
    "«Apartados / cartera»: ahí cobras los saldos de las obras apartadas, con foto del comprobante si es transferencia.",
    "Resuelves los casos de las cajeras: obra de otro pabellón, descuentos del artista, obra agotada, ventas que no cuadran en el cierre.",
  ],
  taquilla: [
    "Entra a «Taquilla».",
    "Elige el tipo de entrada, el día (si aplica) y la cantidad.",
    "Datos del comprador: nombre y correo (ahí le llegan las entradas).",
    "Método: Efectivo, Datáfono o Transferencia.",
    "«Cobrar y emitir»: los QR llegan al correo y el formulario queda listo para la siguiente venta. Si el correo no llega, toca «Ver QR» y deja que les tomen foto.",
    "Si dice «No hay cupo», ese día se agotó: ofrece otro día.",
    "También validas entradas en «Validar entradas».",
  ],
  puerta: [
    "Entra a «Validar entradas» y deja la cámara abierta.",
    "Apunta al QR del celular o del papel. Si la cámara no lee, escribe el código corto que sale debajo del QR.",
    "VERDE: entra. AMARILLO: el pase es de otro día, revisa antes de dejar pasar. ROJO: no entra, mira el motivo.",
    "Un QR sirve una vez por día. Si sale «ya escaneado», alguien ya entró con ese pase.",
    "Invitación sin confirmar: el invitado debe confirmar desde su correo antes de entrar.",
  ],
};

export type ErrorCase = { message: string; what: string; todo: string };

export const ERRORS: Record<"caja" | "taquilla" | "puerta", ErrorCase[]> = {
  caja: [
    { message: "Esta obra ya se vendió. Elige otra.", what: "No quedan copias (otra caja o la tienda en línea la vendió).", todo: "Ofrece otra obra del artista." },
    { message: "Esta obra es de otro pabellón.", what: "Tu caja solo cobra las obras de tu pabellón.", todo: "Manda al cliente a la caja de ese pabellón o llama a la coordinadora." },
    { message: "Esta venta ya se está registrando en otra caja.", what: "Dos cajas cobrando la misma obra al tiempo.", todo: "Espera unos segundos y busca la obra de nuevo." },
    { message: "La venta está pausada para esta obra.", what: "La feria la retiró de la venta.", todo: "Llama a la coordinadora." },
    { message: "No se pudo registrar la venta. Intenta de nuevo.", what: "Se cayó el internet o el servidor no respondió.", todo: "Revisa la conexión y vuelve a «Cobrar»: no se cobra dos veces." },
  ],
  taquilla: [
    { message: "No hay cupo disponible ese día.", what: "Se agotaron las entradas de ese día.", todo: "Ofrece otro día." },
  ],
  puerta: [
    { message: "El boleto ya fue escaneado hoy.", what: "Ya entró alguien con ese QR.", todo: "No entra. Si insiste, llama a coordinación." },
    { message: "Este pase no es para hoy.", what: "La entrada es de otro día.", todo: "No entra hoy; puede venir el día de su entrada." },
    { message: "Boleto anulado o reembolsado.", what: "Se devolvió el dinero o se anuló.", todo: "No entra. Puede comprar en taquilla." },
    { message: "Invitación sin confirmar.", what: "El invitado no confirmó desde su correo.", todo: "Que confirme en su correo y vuelva a escanear." },
    { message: "QR inválido o manipulado.", what: "No es un QR de la feria o está alterado.", todo: "Pide el código corto y escríbelo; si tampoco sirve, no entra." },
  ],
};
