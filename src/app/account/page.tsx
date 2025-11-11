/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Paper,
  Skeleton,
  Chip,
  Stack,
  Avatar,
  Tooltip,
  Grid as Grid2
} from "@mui/material";
// 👇 Usa el Grid2 correcto (Unstable_Grid2) para poder usar size={{ xs, md }}

import {
  AttachMoney as CashierIcon,
  TrendingUp as RankingIcon,
  Contacts as ContactIcon,
  Tablet as TabletIcon,
  OpenInNew as ExternalIcon,
  Place as PlaceIcon,
  LocalPhone as PhoneIcon,
  Tag as TagIcon,
} from "@mui/icons-material";

import { useAuth } from "@/provider/authProvider";
import { useTranslation } from "react-i18next";

/* -------------- utils -------------- */
function slugify(input?: string | null) {
  if (!input) return "";
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function kioskUrlFromStore(store: any) {
  const base = "https://kiosko.sweepstouch.com/?slug=";
  const s = store?.slug
    ? String(store.slug)
    : [store?.name, store?.address, store?.city, store?.state, store?.country]
        .filter(Boolean)
        .join(" ");
  const sSlug = slugify(s) || "store";
  return `${base}${encodeURIComponent(sSlug)}`;
}

function formatAddress(store: any) {
  const addr =
    store?.address?.formatted ||
    [
      store?.address?.line1,
      store?.address?.line2,
      store?.city,
      store?.state,
      store?.zip,
      store?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    store?.address ||
    "";
  return addr || "—";
}

function getLatLng(store: any) {
  const coords = store?.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const [lng, lat] = coords;
    return { lat, lng };
  }
  const lat = store?.latitude ?? store?.lat ?? null;
  const lng = store?.longitude ?? store?.lng ?? null;
  return { lat, lng };
}

function getStoreImageUrl(store: any): string | null {
  return (
    store?.image ||
    store?.imageUrl ||
    store?.photo ||
    store?.photoUrl ||
    store?.logo ||
    store?.logoUrl ||
    store?.banner ||
    store?.bannerUrl ||
    null
  );
}

const ReadOnlyField = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <TextField
    fullWidth
    label={label}
    value={value ?? "—"}
    disabled
    variant="outlined"
    sx={{
      mb: 2,
      "& .MuiInputBase-root.Mui-disabled": {
        color: "text.primary",
        WebkitTextFillColor: "inherit",
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.00))",
      },
    }}
  />
);

/* -------------- pretty helpers -------------- */

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="h6"
    gutterBottom
    sx={{ color: "#212121", fontWeight: 800, letterSpacing: 0.2, mb: 2 }}
  >
    {children}
  </Typography>
);

const GlassCard = ({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: any;
}) => (
  <Paper
    sx={{
      p: 3,
      borderRadius: 3,
      backdropFilter: "blur(6px)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.75))",
      boxShadow:
        "0 1px 2px rgba(0,0,0,0.04), 0 12px 24px -8px rgba(0,0,0,0.12)",
      ...sx,
    }}
  >
    {children}
  </Paper>
);

/* -------------- page -------------- */

const AccountPage: React.FC = () => {
  const { activeStore, user, currentUser } = useAuth() as any;
  const { t } = useTranslation();
  const me = user || currentUser;

  const loadingUser = !me;
  const loadingStore = !activeStore;

  const isMerchantManager =
    (me?.role || "").toLowerCase() === "merchant_manager";

  const storeLatLng = getLatLng(activeStore);
  const hasLatLng =
    typeof storeLatLng.lat === "number" && typeof storeLatLng.lng === "number";

  const fromNumber =
    activeStore?.fromNumber ||
    activeStore?.sourceTn ||
    activeStore?.sourceTN ||
    activeStore?.twilioPhoneNumber ||
    activeStore?.bandwidthPhoneNumber ||
    "—";

  const storeImage = getStoreImageUrl(activeStore);
  const providerLabel =
    activeStore?.provider ||
    (activeStore?.twilioPhoneNumber
      ? "twilio"
      : activeStore?.bandwidthPhoneNumber
      ? "bandwidth"
      : undefined);

  // Acciones con rutas/links
  const actions = [
    {
      label: t("navigation.cashier"),
      icon: <CashierIcon />,
      color: "#ff6f00",
      href: "/cashier",
      external: false,
    },
    {
      label: t("account.ranking"),
      icon: <RankingIcon />,
      color: "#8e24aa",
      href: "/cashier/ranking",
      external: false,
    },
    {
      label: t("navigation.contacts"),
      icon: <ContactIcon />,
      color: "#1976d2",
      href: "/contacts",
      external: false,
    },
    {
      label: t("account.tabletsKiosk"),
      icon: <TabletIcon />,
      color: "#2e7d32",
      href: kioskUrlFromStore(activeStore),
      external: true,
    },
  ];

  return (
    <>
      {/* Hero Header */}
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background:
            "linear-gradient(135deg, rgba(0,169,188,0.12) 0%, rgba(255,0,128,0.08) 100%)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: "#00A9BC",
            fontWeight: 700,
          }}
          alt={activeStore?.name || "Store"}
          src={storeImage || undefined}
        >
          {activeStore?.name?.[0]?.toUpperCase() ?? "S"}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 900, color: "#212121", lineHeight: 1.15 }}
            noWrap
            title={activeStore?.name || t("navigation.account")}
          >
            {activeStore?.name || t("navigation.account")}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
            {!loadingStore && providerLabel && (
              <Chip
                label={String(providerLabel).toUpperCase()}
                color="info"
                size="small"
                icon={<TagIcon sx={{ fontSize: 18 }} />}
                sx={{ fontWeight: 700, bgcolor: "rgba(0,169,188,0.12)" }}
              />
            )}
            {!loadingUser && me?.role && (
              <Chip
                label={String(me.role).toUpperCase()}
                size="small"
                sx={{ fontWeight: 700, bgcolor: "rgba(0,0,0,0.06)" }}
              />
            )}
            {hasLatLng && (
              <Chip
                label={t("account.hasLocation")}
                size="small"
                color="success"
                sx={{ fontWeight: 700 }}
              />
            )}
          </Stack>
        </Box>

        {!loadingStore && (
          <Tooltip title={t("account.openKiosk")}>
            <Button
              component={Link}
              href={kioskUrlFromStore(activeStore)}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              endIcon={<ExternalIcon />}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 700,
                bgcolor: "#00A9BC",
                "&:hover": { bgcolor: "#008aa0" },
              }}
            >
              {t("account.openKiosk")}
            </Button>
          </Tooltip>
        )}
      </Box>

      <Grid2 container spacing={3}>
        {/* Account Information: SOLO para merchant_manager */}
        {isMerchantManager && (
          <Grid2 size={{ xs: 12, md: 5 }}>
            <GlassCard>
              <SectionTitle>{t("account.accountInfo")}</SectionTitle>

              {loadingUser ? (
                <>
                  <Skeleton height={56} sx={{ mb: 2 }} />
                  <Skeleton height={56} sx={{ mb: 2 }} />
                  <Skeleton height={56} sx={{ mb: 2 }} />
                </>
              ) : (
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12 }}>
                    <ReadOnlyField
                      label={t("account.fullName")}
                      value={
                        me?.name ||
                        [me?.firstName, me?.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        "—"
                      }
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <ReadOnlyField label={t("auth.email")} value={me?.email ?? "—"} />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <ReadOnlyField
                      label={t("account.phoneNumber")}
                      value={me?.phoneNumber ?? me?.phone ?? "—"}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <ReadOnlyField
                      label={t("account.role")}
                      value={me?.role ? String(me.role).toUpperCase() : "—"}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <ReadOnlyField
                      label={t("account.userId")}
                      value={me?._id ?? me?.id ?? "—"}
                    />
                  </Grid2>
                </Grid2>
              )}
            </GlassCard>
          </Grid2>
        )}

        {/* Store Information */}
        <Grid2 size={{ xs: 12, md: isMerchantManager ? 7 : 12 }}>
          <GlassCard>
            <SectionTitle>{t("account.storeInfo")}</SectionTitle>

            {/* Header con imagen */}
            {loadingStore ? (
              <Skeleton
                variant="rectangular"
                height={180}
                sx={{ mb: 2, borderRadius: 2 }}
              />
            ) : (
              <Box
                sx={{
                  mb: 2,
                  position: "relative",
                  borderRadius: 2,
                  overflow: "hidden",
                  background:
                    "linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02))",
                }}
              >
                {storeImage ? (
                  <a
                    href={storeImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block" }}
                  >
                    <Image
                      src={storeImage}
                      alt={activeStore?.name || "Store"}
                      width={1200}
                      height={420}
                      style={{
                        width: "100%",
                        height: "220px",
                        objectFit: "cover",
                      }}
                    />
                  </a>
                ) : (
                  <Box
                    sx={{
                      height: 180,
                      bgcolor: "grey.100",
                      color: "text.secondary",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {t("account.noImage")}
                  </Box>
                )}
                {/* Overlay con nombre */}
                <Box
                  sx={{
                    position: "absolute",
                    left: 16,
                    bottom: 16,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1.5,
                    bgcolor: "rgba(0,0,0,0.45)",
                    color: "white",
                    backdropFilter: "blur(2px)",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800 }}
                    title={activeStore?.name}
                  >
                    {activeStore?.name ?? "—"}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Campos */}
            {loadingStore ? (
              <>
                <Skeleton height={56} sx={{ mb: 2 }} />
                <Skeleton height={56} sx={{ mb: 2 }} />
                <Skeleton height={56} sx={{ mb: 2 }} />
                <Skeleton height={56} sx={{ mb: 2 }} />
                <Skeleton height={56} sx={{ mb: 2 }} />
              </>
            ) : (
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12 }}>
                  <ReadOnlyField
                    label={t("account.address")}
                    value={formatAddress(activeStore)}
                  />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                  <ReadOnlyField label={t("account.fromNumber")} value={fromNumber} />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                  <ReadOnlyField
                    label={t("account.slug")}
                    value={
                      activeStore?.slug ?? slugify(activeStore?.name) ?? "—"
                    }
                  />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                  <ReadOnlyField
                    label={t("account.latitude")}
                    value={
                      typeof storeLatLng.lat === "number"
                        ? storeLatLng.lat
                        : "—"
                    }
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <ReadOnlyField
                    label={t("account.longitude")}
                    value={
                      typeof storeLatLng.lng === "number"
                        ? storeLatLng.lng
                        : "—"
                    }
                  />
                </Grid2>

                {hasLatLng && (
                  <Grid2 size={{ xs: 12 }}>
                    <Button
                      component={Link}
                      href={`https://www.google.com/maps/search/?api=1&query=${storeLatLng.lat},${storeLatLng.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      startIcon={<PlaceIcon />}
                      sx={{
                        textTransform: "none",
                        borderRadius: 2,
                        fontWeight: 700,
                      }}
                    >
                      {t("account.openInMaps")}
                    </Button>
                  </Grid2>
                )}
              </Grid2>
            )}
          </GlassCard>
        </Grid2>

        {/* Quick Actions */}
        <Grid2 size={{ xs: 12 }}>
          <GlassCard sx={{ p: { xs: 2, md: 3 } }}>
            <SectionTitle>{t("account.quickActions")}</SectionTitle>
            <Grid2 container spacing={2}>
              {actions.map((button) => {
                const isExternal = button.external;
                return (
                  <Grid2 key={button.label} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      component={Link as any}
                      href={button.href}
                      {...(isExternal
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      sx={{
                        cursor: "pointer",
                        textDecoration: "none",
                        borderRadius: 3,
                        transition: "all .25s ease",
                        boxShadow:
                          "0 2px 8px rgba(0,0,0,0.06), 0 12px 24px -10px rgba(0,0,0,0.08)",
                        "&:hover": {
                          transform: "translateY(-4px) scale(1.01)",
                          boxShadow:
                            "0 6px 18px rgba(0,0,0,0.10), 0 22px 40px -16px rgba(0,0,0,0.20)",
                        },
                      }}
                    >
                      <CardContent sx={{ textAlign: "center", p: 2.5 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: button.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 12px",
                            color: "white",
                            boxShadow: "inset 0 0 12px rgba(255,255,255,0.25)",
                          }}
                        >
                          {button.icon}
                        </Box>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 800, color: "#212121" }}
                        >
                          {button.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {isExternal ? t("account.opensNewTab") : t("account.open")}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid2>
                );
              })}
            </Grid2>
          </GlassCard>
        </Grid2>
      </Grid2>

      {/* Footer info line */}
      {!loadingUser && !loadingStore && (
        <Box sx={{ mt: 2, textAlign: "right", color: "text.secondary" }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PhoneIcon fontSize="small" />
              <Typography variant="caption">
                {fromNumber !== "—"
                  ? fromNumber
                  : t("account.noSenderNumber")}
              </Typography>
            </Stack>
            {providerLabel && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TagIcon fontSize="small" />
                <Typography variant="caption">
                  {t("account.provider")}: {String(providerLabel).toUpperCase()}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>
      )}
    </>
  );
};

export default AccountPage;
