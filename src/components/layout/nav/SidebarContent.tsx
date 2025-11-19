"use client";

import React, { useState } from "react";
import {
  Box,
  Divider,
  Toolbar,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Dashboard as DashboardIcon,
  Collections as CollectionsIcon,
  GroupOutlined as UsersIcon,
  Event as EventsIcon,
  ConfirmationNumberOutlined as TicketsIcon,
  AccountCircle as AccountIcon,
} from "@mui/icons-material";
import { NotebookIcon, Paintbrush2, QrCodeIcon, ShoppingBag } from "lucide-react";
import { LAYOUT_COLORS as C } from "../layoutConfig";
import SectionTitle from "./SectionTitle";
import NavItem from "./NavItem";
import CollapsibleGroup from "./CollapsibleGroup";
import { useAuth } from "@/provider/authProvider";

type SidebarContentProps = {
  pathname: string;
};

const SidebarContent: React.FC<SidebarContentProps> = ({ pathname }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();

  const roles = user?.roles || {};
  const isSuperUser = !!roles.superuser;
  const isArtist = !!roles.artista;
  const isCashier = !!roles.cajero;

  const [inventoryOpen, setInventoryOpen] = useState(
    pathname.startsWith("/inventory")
  );
  const [ordersOpen, setOrdersOpen] = useState(
    pathname.startsWith("/orders")
  );
  const [ticketsOpen, setTicketsOpen] = useState(
    pathname.startsWith("/tickets")
  );

  const inventoryItems = [
    {
      label: "Artes",
      icon: <Paintbrush2 />,
      href: "/inventory/artworks",
    },
  ];

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
        color: C.text,
      }}
    >
      {/* Brand */}
      <Toolbar sx={{ minHeight: 76, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 120, height: 28, position: "relative" }}>
            <Image
              src="/fdm-logo.png"
              alt="Feria del Millón"
              fill
              sizes="120px"
              priority
              style={{
                objectFit: "contain",
                filter: "invert(1) brightness(1.2)",
              }}
              onError={(e) => {
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent)
                  parent.innerHTML =
                    '<span style="font-weight:900;color:#EDEDED">Feria del Millón</span>';
              }}
            />
          </Box>
        </Box>
      </Toolbar>

      <Divider sx={{ borderColor: C.line }} />

      {/* SUPERUSER */}
      {isSuperUser && (
        <>
          {/* INVENTARIO */}
          <SectionTitle label="Inventario" />
          <List sx={{ py: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <NavItem
                active={pathname === "/"}
                onClick={() => router.push("/")}
                icon={<DashboardIcon />}
                text={t("navigation.dashboard")}
              />
            </ListItem>

            <CollapsibleGroup
              open={inventoryOpen}
              setOpen={setInventoryOpen}
              icon={<CollectionsIcon />}
              text="Inventario"
              active={pathname.startsWith("/inventory")}
            >
              {inventoryItems.map((it) => (
                <NavItem
                  key={it.href}
                  inset
                  active={pathname === it.href}
                  onClick={() => router.push(it.href)}
                  icon={it.icon}
                  text={it.label}
                />
              ))}
            </CollapsibleGroup>
          </List>

          {/* USERS */}
          <SectionTitle label={t("navigation.users")} />
          <List sx={{ py: 0 }}>
            <NavItem
              active={pathname === "/users"}
              onClick={() => router.push("/users")}
              icon={<UsersIcon sx={{ fontSize: 18 }} />}
              text={t("navigation.users")}
            />
          </List>

          {/* OPERATIONS - EVENTOS, BOLETOS, PEDIDOS */}
          <SectionTitle label={t("navigation.operations")} />
          <List sx={{ py: 0 }}>
            {/* Eventos en un solo nivel */}
            <ListItem disablePadding sx={{ display: "block" }}>
              <NavItem
                inset={false}
                active={pathname === "/events"}
                onClick={() => router.push("/events")}
                icon={<EventsIcon sx={{ fontSize: 18 }} />}
                text={t("navigation.events")}
              />
            </ListItem>

            {/* Boletos como grupo: Ver boletos + Validador */}
            <CollapsibleGroup
              open={ticketsOpen}
              setOpen={setTicketsOpen}
              icon={<TicketsIcon sx={{ fontSize: 18 }} />}
              text={t("navigation.tickets")}
              active={pathname.startsWith("/tickets")}
            >
              <NavItem
                inset
                active={pathname === "/tickets"}
                onClick={() => router.push("/tickets")}
                icon={<TicketsIcon sx={{ fontSize: 18 }} />}
                text="Ver boletos"
              />
              <NavItem
                inset
                active={pathname === "/tickets/validator"}
                onClick={() => router.push("/tickets/validator")}
                icon={<QrCodeIcon />}
                text="Validador QR"
              />
            </CollapsibleGroup>

            {/* Pedidos con sub-items */}
            <CollapsibleGroup
              open={ordersOpen}
              setOpen={setOrdersOpen}
              icon={<ShoppingBag />}
              text="Pedidos"
              active={pathname.startsWith("/orders")}
            >
              <NavItem
                inset
                active={pathname === "/orders"}
                onClick={() => router.push("/orders")}
                icon={<ShoppingBag />}
                text="Listado de pedidos"
              />
              <NavItem
                inset
                active={pathname === "/orders/new"}
                onClick={() => router.push("/orders/new")}
                icon={<NotebookIcon />}
                text="Crear pedido"
              />
            </CollapsibleGroup>
          </List>
        </>
      )}

      {/* ARTISTA */}
      {!isSuperUser && isArtist && (
        <>
          <SectionTitle label="Artista" />
          <List sx={{ py: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <NavItem
                active={pathname === "/"}
                onClick={() => router.push("/")}
                icon={<DashboardIcon />}
                text={t("navigation.dashboard")}
              />
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <NavItem
                active={pathname === "/my/artworks"}
                onClick={() => router.push("/my/artworks")}
                icon={<Paintbrush2 />}
                text="Mis obras"
              />
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <NavItem
                active={pathname === "/my/orders"}
                onClick={() => router.push("/my/orders")}
                icon={<ShoppingBag />}
                text="Mis pedidos"
              />
            </ListItem>
          </List>
        </>
      )}

      {/* CAJERO */}
      {!isSuperUser && !isArtist && isCashier && (
        <>
          <SectionTitle label={t("navigation.operations")} />
          <List sx={{ py: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <NavItem
                active={pathname === "/"}
                onClick={() => router.push("/")}
                icon={<DashboardIcon />}
                text={t("navigation.dashboard")}
              />
            </ListItem>

            <CollapsibleGroup
              open={ordersOpen}
              setOpen={setOrdersOpen}
              icon={<ShoppingBag />}
              text="Pedidos"
              active={pathname.startsWith("/orders")}
            >
              <NavItem
                inset
                active={pathname === "/orders"}
                onClick={() => router.push("/orders")}
                icon={<ShoppingBag />}
                text="Listado de pedidos"
              />
              <NavItem
                inset
                active={pathname === "/orders/new"}
                onClick={() => router.push("/orders/new")}
                icon={<NotebookIcon />}
                text="Crear pedido"
              />
            </CollapsibleGroup>
          </List>
        </>
      )}

      {/* Fallback sin rol mapeado */}
      {!isSuperUser && !isArtist && !isCashier && (
        <>
          <SectionTitle label="Navegación" />
          <List sx={{ py: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <NavItem
                active={pathname === "/"}
                onClick={() => router.push("/")}
                icon={<DashboardIcon />}
                text={t("navigation.dashboard")}
              />
            </ListItem>
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      {/* ACCOUNT */}
      <Divider sx={{ borderColor: C.line, mt: 1 }} />
      <Box sx={{ px: 2.25, py: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: C.textMuted,
            letterSpacing: 1.2,
            fontWeight: 800,
            fontSize: 11,
          }}
        >
          {t("navigation.account")}
        </Typography>
      </Box>
      <List sx={{ py: 0, mb: 1 }}>
        <ListItem disablePadding sx={{ display: "block" }}>
          <NavItem
            active={pathname === "/account"}
            onClick={() => router.push("/account")}
            icon={<AccountIcon />}
            text={t("navigation.myAccount")}
          />
        </ListItem>
      </List>
    </Box>
  );
};

export default SidebarContent;
