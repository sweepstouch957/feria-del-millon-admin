"use client";

import Link from "next/link";
import { Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import PageHeader from "@/components/ui/PageHeader";

/* Guía de autoservicio del panel: el ciclo completo de la feria, dónde se hace
   cada cosa y qué hacer cuando algo falla, para no depender de soporte. */

type Step = { what: string; where?: { label: string; href: string }; how: string };
type Stage = { n: number; title: string; intro: string; steps: Step[] };

const STAGES: Stage[] = [
  {
    n: 1,
    title: "Convocatoria",
    intro: "Los artistas se postulan desde la página pública y pagan la inscripción.",
    steps: [
      { what: "Publicar o editar la convocatoria", where: { label: "Sitio web", href: "/personalizacion" }, how: "Pestaña Convocatoria: portada, requisitos, documentos y fechas. Nada sale al público hasta «Publicar cambios»." },
      { what: "Revisar las postulaciones", where: { label: "Postulaciones", href: "/solicitudes" }, how: "Abre cada una para ver las obras, calificar y dejar comentarios. El pago de inscripción queda marcado solo si la pasarela lo aprobó." },
      { what: "Aceptar, rechazar o pedir corrección", where: { label: "Postulaciones", href: "/solicitudes" }, how: "Al aceptar, el artista recibe acceso a su estudio para cargar obras. También puedes invitar a un artista directo sin postulación en Usuarios → Nueva cuenta → Artista invitado." },
    ],
  },
  {
    n: 2,
    title: "Carga de obras",
    intro: "Cada artista aceptado sube su inventario desde «Mi estudio» en la tienda.",
    steps: [
      { what: "Ver quién va atrasado", where: { label: "Estado de carga", href: "/inventory/carga" }, how: "Lista por artista: cuántas obras cargó, si llenó el proyecto y si ya le dio Enviar. A los que están en borrador, escríbeles." },
      { what: "Corregir una obra (precio, foto, stock, visibilidad)", where: { label: "Obras", href: "/inventory/artworks" }, how: "Busca la obra y ábrela. Ahí mismo se cambia el stock, se esconde del catálogo o se vende en lote." },
      { what: "Imprimir las etiquetas QR", where: { label: "Etiquetas QR de obras", href: "/inventory/artworks/qr" }, how: "Genera las hojas y pégalas en cada obra: con ese QR la caja encuentra la obra en un segundo." },
    ],
  },
  {
    n: 3,
    title: "Antes de abrir la feria",
    intro: "Cuentas del equipo, invitaciones y el interruptor de venta.",
    steps: [
      { what: "Crear las cuentas del equipo", where: { label: "Usuarios", href: "/users" }, how: "Una por una en «Nueva cuenta», o toda la lista de cajeras en Usuarios → equipo. La clave se genera sola; se envían por correo en «enviar accesos»." },
      { what: "Asignar cada cajera a su pabellón", where: { label: "Ferias", href: "/events" }, how: "Abre la feria → pabellón → Cajeros. Sin pabellón asignado, la cajera cobra obras de todos los pabellones." },
      { what: "Invitar gente", where: { label: "Invitaciones", href: "/tickets/invitaciones" }, how: "Invitados con pase QR por correo, enlaces con cupo para empresas y recordatorios a los que no confirman." },
      { what: "Encender el Modo feria", where: { label: "Sitio web", href: "/personalizacion" }, how: "Sección «Venta en línea del catálogo»: con Modo feria encendido la tienda esconde catálogo y carrito, y solo se compra desde el QR de cada obra." },
    ],
  },
  {
    n: 4,
    title: "Durante la feria",
    intro: "Caja, taquilla y puerta. La guía detallada por rol está en Guía de caja.",
    steps: [
      { what: "Vender una obra", where: { label: "Vender obra", href: "/caja" }, how: "Escanea el QR de la obra o búscala, datos del comprador, método de pago y «Cobrar». El comprador y el artista reciben correo." },
      { what: "Vender entradas", where: { label: "Taquilla", href: "/tickets/taquilla" }, how: "Tipo, día, cantidad y correo: los QR llegan al instante. Si el correo quedó mal, «Ver QR» y que le tomen foto." },
      { what: "Validar en la puerta", where: { label: "Validar entradas", href: "/tickets/validator" }, how: "Cámara abierta y a escanear: verde entra, rojo no. Un QR usado por error se puede rehabilitar ahí mismo (queda registrado)." },
      { what: "Cuadrar al final del día", where: { label: "Mi cierre del día", href: "/caja/cierre" }, how: "Cada cajera cuadra su efectivo y vouchers con esas cifras. Una venta mal registrada se corrige con el botón «Corregir» de la misma pantalla." },
      { what: "Cobrar apartados", where: { label: "Apartados / cartera", href: "/orders/cartera" }, how: "Las obras apartadas con abono se van saldando aquí hasta quedar vendidas." },
    ],
  },
  {
    n: 5,
    title: "Después de la feria",
    intro: "Se apaga el Modo feria y la venta sigue en línea.",
    steps: [
      { what: "Abrir el catálogo en línea", where: { label: "Sitio web", href: "/personalizacion" }, how: "Apaga el Modo feria: vuelven el catálogo, el carrito y la compra normal en la tienda." },
      { what: "Reportes y contabilidad", where: { label: "Reportes", href: "/reportes" }, how: "Ventas por día y método de pago, reporte en el formato de la feria y Excel. El histórico de ferias pasadas está en Reportes → Histórico." },
      { what: "Aprobar correcciones y reclamos", where: { label: "Correcciones", href: "/correcciones" }, how: "Los cambios de precio o correo que piden las cajeras esperan tu aprobación; los reclamos de compra de los artistas llegan a Reclamos." },
    ],
  },
];

const FIXES: { problem: string; fix: string }[] = [
  { problem: "A alguien no le llegó un correo (pase, confirmación de compra, acceso)", fix: "Casi todo tiene botón de reenvío: Invitaciones (reenviar pase), Pedidos (correo de dirección), Usuarios → equipo → enviar accesos. Revisa primero que el correo esté bien escrito: se puede corregir con el lápiz y reenviar." },
  { problem: "Un QR de entrada sale «ya usado» y es un error", fix: "En Validar entradas, quien tenga rol de taquilla o staff toca «Volver a habilitar este QR» y explica el motivo. Queda registrado en Auditoría." },
  { problem: "Una venta quedó con el método de pago, precio o correo equivocado", fix: "La cajera la corrige desde «Mi cierre del día» → Corregir. El método se aplica de una vez; precio y correo esperan aprobación en Correcciones." },
  { problem: "Una obra no aparece en la caja o en el catálogo", fix: "En Obras: revisa que tenga stock, precio y que no esté oculta. Si dice «venta pausada», alguien la pausó a propósito desde ahí mismo." },
  { problem: "No se sabe quién hizo un cambio", fix: "Auditoría guarda quién entró y qué cambió: ventas, obras, usuarios y configuración." },
  { problem: "La página pública tiene un texto o foto vieja", fix: "Sitio web: edita la sección y toca «Publicar cambios». No hay que pedirle el cambio a nadie." },
];

export default function GuiaPanelPage() {
  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <PageHeader
        crumb="Ayuda"
        title="Guía del panel"
        description="El ciclo completo de la feria: qué se hace en cada etapa, en qué parte del panel y cómo resolver lo típico sin pedir soporte."
        actions={[{ label: "Imprimir", kind: "sec", onClick: () => window.print() }]}
      />

      {STAGES.map((st) => (
        <Box key={st.n} component="section" sx={{ mt: 4, breakInside: "avoid-page" }}>
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 0.5 }}>
            <Chip size="small" label={`Etapa ${st.n}`} sx={{ borderRadius: 0, fontWeight: 600 }} />
            <Typography variant="h6" fontWeight={600}>{st.title}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{st.intro}</Typography>
          <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "28%" }}>Qué</TableCell>
                  <TableCell sx={{ width: "18%" }}>Dónde</TableCell>
                  <TableCell>Cómo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {st.steps.map((s) => (
                  <TableRow key={s.what}>
                    <TableCell sx={{ fontWeight: 600 }}>{s.what}</TableCell>
                    <TableCell>
                      {s.where ? <Link href={s.where.href} style={{ color: "inherit" }}>{s.where.label}</Link> : "—"}
                    </TableCell>
                    <TableCell>{s.how}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      <Box component="section" sx={{ mt: 4, breakInside: "avoid-page" }}>
        <Typography variant="h6" fontWeight={600}>Si algo falla</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Lo más común se resuelve desde el mismo panel, sin soporte técnico.
        </Typography>
        <TableContainer sx={{ border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "40%" }}>Problema</TableCell>
                <TableCell>Solución</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {FIXES.map((f) => (
                <TableRow key={f.problem}>
                  <TableCell sx={{ fontWeight: 600 }}>{f.problem}</TableCell>
                  <TableCell>{f.fix}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
