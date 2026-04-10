"use client";

import Image from "next/image";
import {
  Box,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Typography,
  Stack,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import { ExternalLink, Edit3, Share2, Loader2, QrCode } from "lucide-react";
import { ArtworkRow } from "@/hooks/useArtworksCursor";

export default function ArtworksTable({
  rows,
  loading,
  onView,
  onEdit,
  onShare,
  onLoadMore,
  hasMore,
  loadingMore,
  onOpenQr,
}: {
  rows: ArtworkRow[];
  loading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onShare: (msg: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onOpenQr: (id: string) => void;
}) {
  const theme = useTheme();

  const formatMoney = (n?: number, currency: string = "COP") =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
      }).format(n)
      : "—";

  const doShare = async (id: string, title: string) => {
    const url = `${window.location.origin}/obra/${encodeURIComponent(id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      onShare("Enlace listo para compartir ✨");
    } catch {
      await navigator.clipboard.writeText(url);
      onShare("Enlace copiado al portapapeles");
    }
  };

  // 👇 aquí forzamos texto oscuro y borde visible
  const actionButtonSx = {
    borderRadius: 999,
    textTransform: "none",
    fontSize: 12,
    px: 1.8,
    py: 0.5,
    borderColor: "grey.300",
    bgcolor: "grey.50",
    color: "text.primary",
    "& svg": {
      // iconitos un poco más suaves
      color: "text.secondary",
    },
    "& .MuiButton-startIcon": {
      mr: 0.6,
    },
    "&:hover": {
      bgcolor: "grey.100",
      borderColor: "grey.400",
      boxShadow: 1,
    },
  } as const;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        position: "relative",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "grey.100",
        background: `linear-gradient(135deg, ${alpha(
          theme.palette.primary.main,
          0.06
        )}, ${theme.palette.background.paper})`,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(circle at 0% 0%, ${alpha(
            theme.palette.primary.main,
            0.12
          )} 0, transparent 55%)`,
        },
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <TableContainer sx={{ maxHeight: 560, borderRadius: 3 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: "blur(6px)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: "text.secondary",
                    borderBottomColor: "grey.200",
                  }}
                >
                  Obra
                </TableCell>
                {["Pabellón", "Técnica", "Precio", "Stock"].map((label) => (
                  <TableCell
                    key={label}
                    sx={{
                      bgcolor: alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: "blur(6px)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      color: "text.secondary",
                      borderBottomColor: "grey.200",
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
                <TableCell
                  align="right"
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: "blur(6px)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: "text.secondary",
                    borderBottomColor: "grey.200",
                  }}
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody
              sx={{
                "& tr:nth-of-type(odd)": {
                  backgroundColor: alpha(theme.palette.common.white, 0.4),
                },
                "& tr:nth-of-type(even)": {
                  backgroundColor: alpha(theme.palette.common.white, 0.8),
                },
              }}
            >
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="center"
                      sx={{ py: 6 }}
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <Typography variant="body2" color="text.secondary">
                        Cargando obras…
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 6 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        No hay obras aún
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        Crea tu primera obra y verás aquí todo tu catálogo ✨
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{
                      "&:last-of-type td, &:last-of-type th": {
                        borderBottom: 0,
                      },
                      transition:
                        "background-color 0.15s ease, transform 0.1s ease",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.04
                        ),
                      },
                    }}
                  >
                    <TableCell sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 2,
                            bgcolor: "grey.100",
                            overflow: "hidden",
                            border: "1px solid",
                            borderColor: "grey.200",
                            position: "relative",
                            flexShrink: 0,
                          }}
                        >
                          {r.image && (
                            <Image
                              src={r.image}
                              alt={r.title}
                              fill
                              sizes="64px"
                              style={{ objectFit: "cover" }}
                            />
                          )}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              maxWidth: 220,
                            }}
                          >
                            {r.title}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={0.5}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {r.year || "Sin año"}
                            </Typography>
                            {r?.pavilionInfo?.name && (
                              <Chip
                                label={r.pavilionInfo.name}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderRadius: 999,
                                  borderColor: "grey.300",
                                  fontSize: 10,
                                  height: 20,
                                }}
                              />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2">
                        {r?.pavilionInfo?.name || "—"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2">
                        {r?.techniqueInfo?.name || r.technique || "—"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "text.primary" }}
                      >
                        {formatMoney(r.price, r.currency)}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2">
                        {typeof r.stock === "number" ? r.stock : "—"}
                      </Typography>
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                        flexWrap="wrap"
                      >
                        <Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          onClick={() => onView(r.id)}
                          startIcon={<ExternalLink className="w-4 h-4" />}
                          sx={actionButtonSx}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          onClick={() => onEdit(r.id)}
                          startIcon={<Edit3 className="w-4 h-4" />}
                          sx={actionButtonSx}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          onClick={() => doShare(r.id, r.title)}
                          startIcon={<Share2 className="w-4 h-4" />}
                          sx={actionButtonSx}
                        >
                          Compartir
                        </Button>
                        <Button
                          variant="outlined"
                          color="inherit"
                          size="small"
                          onClick={() => onOpenQr(r.id)}
                          startIcon={<QrCode className="w-4 h-4" />}
                          sx={actionButtonSx}
                        >
                          Ver QR
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderTop: "1px solid",
            borderColor: "grey.100",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backdropFilter: "blur(8px)",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {rows.length > 0 ? `${rows.length} ítems visibles` : "Sin resultados"}
          </Typography>
          <Button
            variant="contained"
            size="small"
            disabled={!hasMore || loadingMore}
            onClick={onLoadMore}
            startIcon={
              loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null
            }
            sx={{
              borderRadius: 999,
              textTransform: "none",
              fontSize: 12,
              px: 2.5,
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              "&:disabled": {
                boxShadow: "none",
                opacity: 0.7,
              },
            }}
          >
            Cargar más
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
