"use client";

import React, { useState } from "react";
import { Box, Tooltip } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Paintbrush2,
  QrCode,
  MapPin,
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
} from "lucide-react";

import { LAYOUT_COLORS as C } from "../layoutConfig";
import SectionTitle from "./SectionTitle";
import NavItem from "./NavItem";
import CollapsibleGroup from "./CollapsibleGroup";
import { useAuth } from "@/provider/authProvider";

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
  const isCashier = !!roles.cajero;
  const isBoxOffice = !!(roles as { taquilla?: boolean }).taquilla;
  const isEditor = !!(roles as { editor?: boolean }).editor;

  const [ordersOpen, setOrdersOpen] = useState(pathname.startsWith("/orders"));
  const [ticketsOpen, setTicketsOpen] = useState(pathname.startsWith("/tickets"));

  const go = (href: string) => () => {
    router.push(href);
    onNavigate?.();
  };

  const item = (href: string, text: string, icon: React.ReactNode, exact = true) => (
    <NavItem
      key={href}
      rail={rail}
      active={exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)}
      onClick={go(href)}
      icon={icon}
      text={text}
    />
  );

  const kid = (href: string, text: string) => (
    <NavItem key={href} inset active={pathname === href} onClick={go(href)} text={text} />
  );

  const ticketsGroup = (
    <CollapsibleGroup
      open={ticketsOpen}
      setOpen={setTicketsOpen}
      rail={rail}
      onRailClick={go("/tickets")}
      icon={<Ticket {...ICON} />}
      text="Boletos"
      active={pathname.startsWith("/tickets")}
    >
      {kid("/tickets", "Ver boletos")}
      {kid("/tickets/validator", "Validador QR")}
      {kid("/tickets/taquilla", "Taquilla")}
      {kid("/tickets/asistentes", "Informe de asistentes")}
      {kid("/tickets/invitaciones", "Invitaciones")}
    </CollapsibleGroup>
  );

  const ordersGroup = (
    <CollapsibleGroup
      open={ordersOpen}
      setOpen={setOrdersOpen}
      rail={rail}
      onRailClick={go("/orders")}
      icon={<ShoppingBag {...ICON} />}
      text="Pedidos"
      active={pathname.startsWith("/orders")}
    >
      {kid("/orders", "Listado de pedidos")}
      {kid("/orders/new", "Crear pedido")}
      {kid("/orders/cartera", "Cartera / Fiado")}
    </CollapsibleGroup>
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
              Panel
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
            {item("/", "Tablero", <LayoutDashboard {...ICON} />)}

            <SectionTitle label="Inventario" rail={rail} />
            {item("/inventory/artworks", "Artes", <Paintbrush2 {...ICON} />)}
            {item("/inventory/artworks/qr", "QR de obras", <QrCode {...ICON} />)}
            {item("/inventory/cities", "Ciudades", <MapPin {...ICON} />)}
            {item("/inventory/techniques", "Técnicas", <Layers {...ICON} />)}

            <SectionTitle label="Comunidad" rail={rail} />
            {item("/users", "Usuarios", <Users {...ICON} />)}
            {item("/solicitudes", "Solicitudes", <FileText {...ICON} />)}

            <SectionTitle label="Contenido" rail={rail} />
            {item("/personalizacion", "Personalización", <Palette {...ICON} />)}
            {item("/comunicaciones", "Comunicaciones", <Megaphone {...ICON} />)}
            {item("/qr", "Códigos QR", <QrCode {...ICON} />)}

            <SectionTitle label="Operación" rail={rail} />
            {item("/events", "Ferias", <CalendarDays {...ICON} />, false)}
            {ticketsGroup}
            {ordersGroup}

            <SectionTitle label="Reportes" rail={rail} />
            {item("/reportes", "Reportes", <BarChart3 {...ICON} />)}
            {item("/reportes/ventas", "Informe de ventas", <BarChart3 {...ICON} />)}
          </>
        )}

        {!isSuperUser && isArtist && (
          <>
            {item("/", "Tablero", <LayoutDashboard {...ICON} />)}
            <SectionTitle label="Artista" rail={rail} />
            {item("/my/artworks", "Mis obras", <Paintbrush2 {...ICON} />)}
            {item("/my/orders", "Mis pedidos", <ShoppingBag {...ICON} />)}
          </>
        )}

        {!isSuperUser && isBoxOffice && (
          <>
            <SectionTitle label="Taquilla" rail={rail} />
            {item("/tickets/validator", "Validador QR", <QrCode {...ICON} />)}
            {item("/tickets/taquilla", "Taquilla", <Ticket {...ICON} />)}
            {item("/tickets/asistentes", "Informe de asistentes", <BarChart3 {...ICON} />)}
          </>
        )}

        {!isSuperUser && isEditor && (
          <>
            <SectionTitle label="Contenido" rail={rail} />
            {item("/personalizacion", "Personalización", <Palette {...ICON} />)}
            {item("/comunicaciones", "Comunicaciones", <Megaphone {...ICON} />)}
            {item("/qr", "Códigos QR", <QrCode {...ICON} />)}
          </>
        )}

        {!isSuperUser && isCashier && (
          <>
            {item("/", "Tablero", <LayoutDashboard {...ICON} />)}
            <SectionTitle label="Operación" rail={rail} />
            {ordersGroup}
          </>
        )}

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
