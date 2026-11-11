"use client";

import React, { useState } from "react";
import { Box, Tooltip } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Paintbrush2,
  QrCode,
  Layers,
  Users,
  FileText,
  Palette,
  Megaphone,
  CalendarDays,
  Ticket,
  ShoppingBag,
  BarChart3,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardCheck,
  Wallet,
  ScanLine,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

import { LAYOUT_COLORS as C } from "../layoutConfig";
import SectionTitle from "./SectionTitle";
import NavItem from "./NavItem";
import CollapsibleGroup from "./CollapsibleGroup";
import { useAuth } from "@/provider/authProvider";
import { useCajaAccess } from "@features/caja/hooks/useCajaAccess";

/* Lateral del panel: tinta sobre papel, secciones en versalitas y el ítem
   activo marcado con un filete de acento. Se puede contraer a riel (solo
   iconos) para dejarle la página al contenido. */

type SidebarContentProps = {
  pathname: string;
  /** Contraída a solo iconos (escritorio). */
  rail?: boolean;
  onToggleRail?: () => void;
  /** Cierra el cajón en móvil al navegar. */
  onNavigate?: () => void;
};

const ICON = { strokeWidth: 1.3 as const, size: 16 };

const SidebarContent: React.FC<SidebarContentProps> = ({
  pathname,
  rail = false,
  onToggleRail,
  onNavigate,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const roles = user?.roles || {};
  const isSuperUser = !!roles.superuser;
  const isArtist = !!roles.artista;
  const isCashier = !!(roles.cajero || roles.jefeCaja);
  const { canLayaway } = useCajaAccess();
  // Las cajeras también venden entradas: ven "Vender entradas" junto a su caja.
  const isBoxOffice = !!(roles as { taquilla?: boolean }).taquilla || isCashier;
  const isEditor = !!(roles as { editor?: boolean }).editor;

  const [ticketsOpen, setTicketsOpen] = useState(pathname.startsWith("/tickets"));
  const settingsActive = ["/inventory/cities", "/inventory/techniques", "/caja/guia", "/guia"].includes(pathname);
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  const go = (href: string) => () => {
    router.push(href);
    onNavigate?.();
  };

  const item = (href: string, text: string, icon: React.ReactNode, hint?: string, exact = true) => (
    <NavItem
      key={href}
      rail={rail}
      active={exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)}
      onClick={go(href)}
      icon={icon}
      text={text}
      hint={hint}
    />
  );

  const kid = (href: string, text: string, hint?: string) => (
    <NavItem key={href} inset active={pathname === href} onClick={go(href)} text={text} hint={hint} />
  );

  const ticketsGroup = (
    <CollapsibleGroup
      open={ticketsOpen}
      setOpen={setTicketsOpen}
      rail={rail}
      onRailClick={go("/tickets")}
      icon={<Ticket {...ICON} />}
      text="Entradas"
      active={pathname.startsWith("/tickets")}
    >
      {kid("/tickets", "Entradas de la feria", "Tipos de entrada, cupos por día y todas las entradas emitidas.")}
      {kid("/tickets/taquilla", "Taquilla", "Vender entradas en la puerta: el QR llega al correo al instante.")}
      {kid("/tickets/validator", "Validar entradas", "La puerta: escanear el QR para dejar entrar o no.")}
      {kid("/tickets/asistentes", "Asistencia", "Cuánta gente entró cada día y a qué horas.")}
      {kid("/tickets/invitaciones", "Invitaciones", "Invitados con pase QR, enlaces para empresas y recordatorios.")}
    </CollapsibleGroup>
  );

  const ordersItem = item("/orders", "Ventas de obras", <FileText {...ICON} />,
    "Todas las ventas, en línea y en caja, con su comprador y su pago.");

  // Lo mismo que ve la cajera, para que el admin pueda cubrir una caja.
  const cajaSection = (
    <>
      <SectionTitle label="Caja" rail={rail} />
      {item("/caja", "Vender obra", <ShoppingBag {...ICON} />, "La caja: escanea el QR de la obra y cobra.")}
      {item("/caja/cierre", "Mi cierre del día", <ClipboardCheck {...ICON} />, "Lo que cobraste tú hoy, para cuadrar efectivo y vouchers.")}
      {item("/tickets/validator", "Validar entradas", <ScanLine {...ICON} />, "La puerta: escanear el QR para dejar entrar o no.")}
      {canLayaway && item("/orders/cartera", "Apartados / cartera", <Wallet {...ICON} />, "Obras separadas con abono: aquí se cobra el saldo.")}
      {item("/caja/guia", "Guía de caja", <GraduationCap {...ICON} />, "Paso a paso de caja, taquilla y puerta, y qué hacer si algo falla.")}
    </>
  );

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: (t) => (t.palette.mode === "dark" ? C.panelDark : C.panel),
        color: C.text,
      }}
    >
      {/* Marca + contraer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: rail ? "center" : "space-between",
          gap: 1,
          px: rail ? 0 : 1.75,
          py: 2,
          minHeight: 58,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={go("/")}
          aria-label="Panel"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            background: "transparent",
            border: 0,
            p: 0,
            cursor: "pointer",
            color: "inherit",
          }}
        >
          {/* El escudo viene en un lienzo muy ancho y en negro sobre blanco: se
              recorta al centro con `cover` y se invierte para la tinta. */}
          <Box
            aria-label="Feria del Millón"
            sx={{
              width: rail ? 38 : 52,
              aspectRatio: "2.46",
              flexShrink: 0,
              backgroundImage: "url(/fdm-logo.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "49% center",
              filter: "invert(1) contrast(1.3)",
            }}
          />
          {!rail && (
            <Box
              component="span"
              sx={{
                fontSize: 9,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(245,244,239,0.6)",
              }}
            >
              Panel · v2
            </Box>
          )}
        </Box>

        {onToggleRail && (
          <Tooltip title={rail ? "Expandir menú" : "Contraer menú"} placement="right">
            <Box
              component="button"
              type="button"
              onClick={onToggleRail}
              aria-label={rail ? "Expandir menú" : "Contraer menú"}
              sx={{
                display: rail ? "none" : "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "rgba(245,244,239,0.55)",
                "&:hover": { color: C.text },
              }}
            >
              <PanelLeftClose size={14} strokeWidth={1.4} />
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Navegación */}
      <Box
        component="nav"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          px: 1,
          py: 1,
          overflowY: "auto",
        }}
      >
        {rail && onToggleRail && (
          <NavItem
            rail
            onClick={onToggleRail}
            icon={<PanelLeftOpen {...ICON} />}
            text="Expandir menú"
          />
        )}

        {isSuperUser && (
          <>
            {item("/", "Tablero", <LayoutDashboard {...ICON} />, "Las cifras de la feria de un vistazo y accesos rápidos a todo.")}

            {/* El menú sigue el ciclo de la feria: convocatoria → obras →
                entradas → venta en la feria → tienda en línea → reportes. */}
            <SectionTitle label="Convocatoria" rail={rail} />
            {item("/events", "Ferias y pabellones", <CalendarDays {...ICON} />, "Fechas de cada feria, sus pabellones y qué cajera cobra en cada uno.", false)}
            {item("/solicitudes", "Postulaciones", <FileText {...ICON} />, "Artistas que se postularon: calificar, ver el pago y aceptar o rechazar.")}

            <SectionTitle label="Obras" rail={rail} />
            {item("/inventory/artworks", "Inventario de obras", <Paintbrush2 {...ICON} />, "Todas las obras: precio, stock, fotos y si salen en el catálogo.")}
            {item("/inventory/carga", "Avance de carga", <ClipboardCheck {...ICON} />, "Qué artistas ya subieron sus obras y quién va atrasado.")}
            {item("/inventory/artworks/qr", "Etiquetas QR de obras", <QrCode {...ICON} />, "Hojas de etiquetas listas para imprimir y pegar en cada obra.")}

            <SectionTitle label="Entradas e invitaciones" rail={rail} />
            {ticketsGroup}

            <SectionTitle label="Ventas" rail={rail} />
            {item("/caja", "Vender obra", <ShoppingBag {...ICON} />, "La caja: escanea el QR de la obra y cobra.")}
            {item("/caja/cierre", "Mi cierre del día", <ClipboardCheck {...ICON} />, "Lo que cobraste tú hoy, para cuadrar efectivo y vouchers.")}
            {ordersItem}
            {canLayaway && item("/orders/cartera", "Apartados / cartera", <Wallet {...ICON} />, "Obras separadas con abono: aquí se cobra el saldo.")}
            {item("/correcciones", "Correcciones de venta", <ClipboardCheck {...ICON} />, "Cambios que piden las cajeras: método de pago, precio o correo.")}
            {item("/reclamos", "Reclamos de artistas", <FileText {...ICON} />, "Ventas que un artista reporta y no aparecen en el sistema.")}

            <SectionTitle label="Personas" rail={rail} />
            {item("/users", "Equipo y cuentas", <Users {...ICON} />, "Crear y editar cuentas: cajeras, equipo y artistas, con sus roles.")}
            {item("/compradores", "Compradores", <Users {...ICON} />, "Todos los que han comprado obras o entradas, o confirmado invitación.")}

            <SectionTitle label="Sitio y difusión" rail={rail} />
            {item("/personalizacion", "Sitio web", <Palette {...ICON} />, "La página pública: textos, portada, convocatoria y venta en línea.")}
            {item("/comunicaciones", "Correos y boletín", <Megaphone {...ICON} />, "Envíos masivos: boletín, catálogos y promociones.")}
            {item("/qr", "QR para impresos", <QrCode {...ICON} />, "Convierte cualquier enlace en QR para afiches y flyers.")}

            <SectionTitle label="Reportes" rail={rail} />
            {item("/reportes", "Reportes", <BarChart3 {...ICON} />, "Ventas por día y método de pago, con Excel para contabilidad.", false)}
            {item("/auditoria", "Auditoría", <ShieldCheck {...ICON} />, "Quién entró al panel y qué cambió, con fecha y hora.")}

            <SectionTitle label="Ajustes" rail={rail} />
            <CollapsibleGroup
              open={settingsOpen}
              setOpen={setSettingsOpen}
              rail={rail}
              onRailClick={go("/guia")}
              icon={<Layers {...ICON} />}
              text="Ayuda y catálogos"
              active={settingsActive}
            >
              {kid("/guia", "Guía del panel", "El ciclo completo de la feria: qué se hace, dónde y cómo.")}
              {kid("/caja/guia", "Guía de caja", "Paso a paso de caja, taquilla y puerta, y qué hacer si algo falla.")}
              {kid("/inventory/cities", "Ciudades", "Municipios disponibles para direcciones de entrega.")}
              {kid("/inventory/techniques", "Técnicas", "Las técnicas con que se clasifican las obras.")}
            </CollapsibleGroup>
          </>
        )}

        {!isSuperUser && isArtist && (
          <>
            {item("/", "Tablero", <LayoutDashboard {...ICON} />)}
            <SectionTitle label="Artista" rail={rail} />
            {item("/my/artworks", "Mis obras", <Paintbrush2 {...ICON} />, "Tus obras en la feria: fotos, precios y cuántas quedan.")}
            {item("/my/orders", "Mis ventas", <ShoppingBag {...ICON} />, "Las ventas de tus obras; cada una también te llega por correo.")}
          </>
        )}

        {!isSuperUser && isBoxOffice && (
          <>
            <SectionTitle label="Taquilla" rail={rail} />
            {!isCashier && item("/tickets/validator", "Validar entradas", <ScanLine {...ICON} />, "La puerta: escanear el QR para dejar entrar o no.")}
            {/* Vende y ve sus ventas del día (en la misma pantalla). */}
            {item("/tickets/taquilla", "Vender entradas", <Ticket {...ICON} />, "Cobrar entradas en la puerta: el QR llega al correo al instante.")}
            {!isCashier && item("/caja/guia", "Guía de caja", <GraduationCap {...ICON} />, "Paso a paso de taquilla y puerta, y qué hacer si algo falla.")}
          </>
        )}

        {!isSuperUser && isEditor && (
          <>
            <SectionTitle label="Contenido" rail={rail} />
            {item("/personalizacion", "Sitio web", <Palette {...ICON} />, "La página pública: textos, portada, convocatoria y venta en línea.")}
            {item("/comunicaciones", "Correos y boletín", <Megaphone {...ICON} />, "Envíos masivos: boletín, catálogos y promociones.")}
            {item("/qr", "QR para impresos", <QrCode {...ICON} />, "Convierte cualquier enlace en QR para afiches y flyers.")}
          </>
        )}

        {/* Caja: vende y ve su cierre del día; pedidos y reportes de todos, no. */}
        {!isSuperUser && isCashier && cajaSection}

        {!isSuperUser && !isArtist && !isCashier && !isBoxOffice && !isEditor &&
          item("/", "Tablero", <LayoutDashboard {...ICON} />)}
      </Box>

      {/* Cuenta */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          p: 1,
          borderTop: `1px solid ${C.line}`,
        }}
      >
        {item("/account", "Mi cuenta", <UserCircle {...ICON} />)}
        <NavItem
          rail={rail}
          onClick={() => logout()}
          icon={<LogOut {...ICON} />}
          text="Cerrar sesión"
        />
      </Box>
    </Box>
  );
};

export default SidebarContent;
