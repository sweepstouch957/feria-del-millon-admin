/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import dayjs from "dayjs";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Popover,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  useTheme,
  Avatar,
  Tooltip,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ClearIcon from "@mui/icons-material/ClearAll";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import { DateRange } from "react-date-range";

/** IMPORTA TU PREVIEWER (no se redeclara) */
import ImagePreviewer, {
  useImagePreview,
} from "@/components/common/ImagePreviwer"; // ⬅️ asegura que el path/archivo coincida

/* ============================================================
 * Tipos
 * ============================================================ */
export interface Prize {
  _id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  [k: string]: unknown;
}

export interface ActiveSweepstake {
  _id: string;
  name?: string;
  title?: string;
  description?: string;
  status: "in progress" | "draft" | "finished" | string;
  image?: string; // imagen de la campaña
  startDate?: string; // ISO
  endDate?: string; // ISO
  prize?: Prize[];
  participants?: number;
  [k: string]: unknown;
}

type StatusOption = {
  value: string;
  label: string;
  color?: "default" | "primary" | "success" | "warning" | "error" | "info";
  icon?: React.ReactNode;
};

export type DateStatusFilterBarProps = {
  /** Info del sorteo que se muestra en la columna izquierda */
  sweepstake?: ActiveSweepstake | null;

  /** Filtros (columna derecha) */
  status: string;
  onStatusChange: (next: string) => void;

  startDate?: Date | null;
  endDate?: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;

  onApply?: () => void;
  onClear?: () => void;

  statusOptions: StatusOption[];
  loading?: boolean;

  title?: string;
  applyLabel?: string;
  clearLabel?: string;
  rangeLabel?: string;
};

/* ============================================================
 * Componente
 * ============================================================ */
const DateStatusFilterBar: React.FC<DateStatusFilterBarProps> = ({
  sweepstake,
  status,
  onStatusChange,
  startDate,
  endDate,
  onRangeChange,
  onApply,
  onClear,
  statusOptions,
  loading = false,
  title = "Filtros",
  applyLabel = "Aplicar",
  clearLabel = "Limpiar",
  rangeLabel = "Seleccionar rango",
}) => {
  const theme = useTheme();

  /** Preview interno 100% encapsulado */
  const preview = useImagePreview();

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const openCalendar = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const closeCalendar = () => setAnchorEl(null);
  const calendarOpen = Boolean(anchorEl);

  const hasRange = Boolean(startDate || endDate);

  // Estado local del selector
  const [localRange, setLocalRange] = React.useState<any>([
    {
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      key: "selection",
    },
  ]);

  React.useEffect(() => {
    setLocalRange([
      {
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
        key: "selection",
      },
    ]);
  }, [startDate, endDate]);

  const handleRangeChange = (sel: any) => setLocalRange([{ ...sel }]);
  const handleRangeAccept = () => {
    const s = localRange?.[0]?.startDate ?? null;
    const e = localRange?.[0]?.endDate ?? null;
    onRangeChange(s, e);
    closeCalendar();
  };
  const handleRangeClear = () => {
    setLocalRange([
      { startDate: undefined, endDate: undefined, key: "selection" },
    ]);
    onRangeChange(null, null);
  };

  // Texto de rango
  const fmt = (d?: Date | null) => (d ? dayjs(d).format("MMM D, YYYY") : "—");
  const rangeText = hasRange ? `${fmt(startDate)} → ${fmt(endDate)}` : "";

  // Sweepstake UI
  const swTitle = sweepstake?.title || sweepstake?.name || "Sweepstake";
  const swDates =
    sweepstake?.startDate || sweepstake?.endDate
      ? `${
          sweepstake?.startDate
            ? dayjs(sweepstake.startDate).format("MMM D, YYYY")
            : "—"
        } → ${
          sweepstake?.endDate
            ? dayjs(sweepstake.endDate).format("MMM D, YYYY")
            : "—"
        }`
      : null;

  const statusColor =
    sweepstake?.status === "in progress"
      ? "success"
      : sweepstake?.status === "draft"
      ? "warning"
      : sweepstake?.status === "finished"
      ? "default"
      : "info";

  return (
    <>
      {/* Modal del visor de imagen — se monta una sola vez */}
      <ImagePreviewer preview={preview} />

      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          mb: 2,
          borderColor: "divider",
          overflow: "hidden",
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(180deg, #fff 0%, #f8f9fb 100%)"
              : "transparent",
        }}
      >
        <CardContent sx={{ py: 1.5 }}>
          {/* Layout responsive: izquierda (sorteo) | derecha (filtros) */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            gap={1.25}
          >
            {/* IZQUIERDA — Info del sorteo */}
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0, flex: { xs: "1 1 auto", md: "0 0 40%" } }}
            >
              {/* Imagen miniatura */}
              <Box sx={{ position: "relative" }}>
                <Avatar
                  variant="rounded"
                  src={sweepstake?.image || undefined}
                  alt={swTitle || "campaign"}
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    boxShadow:
                      theme.palette.mode === "light"
                        ? "0 8px 20px rgba(0,0,0,.08)"
                        : "none",
                    bgcolor: "background.paper",
                  }}
                >
                  {/* fallback sin imagen */}
                  <OpenInFullRoundedIcon fontSize="small" />
                </Avatar>

                {/* Botón para ampliar si hay imagen */}
                {sweepstake?.image && (
                  <Tooltip title="Ver imagen">
                    <IconButton
                      size="small"
                      onClick={() => preview.openWith(sweepstake.image!)}
                      sx={{
                        position: "absolute",
                        right: -10,
                        bottom: -10,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": { bgcolor: "background.paper" },
                      }}
                    >
                      <ZoomInIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {/* Texto */}
              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.25 }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 900,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: { xs: 240, md: 360 },
                    }}
                    title={swTitle || undefined}
                  >
                    {swTitle}
                  </Typography>

                  {sweepstake?.status && (
                    <Chip
                      size="small"
                      color={statusColor as any}
                      label={
                        sweepstake.status === "in progress"
                          ? "En curso"
                          : sweepstake.status === "draft"
                          ? "Borrador"
                          : sweepstake.status === "finished"
                          ? "Finalizado"
                          : sweepstake.status
                      }
                      icon={
                        sweepstake.status === "in progress" ? (
                          <CheckCircleRoundedIcon />
                        ) : (
                          <RadioButtonUncheckedRoundedIcon />
                        )
                      }
                      sx={{ borderRadius: 999 }}
                    />
                  )}
                </Stack>

                {(swDates) && (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    {swDates && (
                      <Typography variant="body2" color="text.secondary">
                        {swDates}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            </Stack>

            {/* Divider vertical desktop */}
            <Divider
              flexItem
              orientation="vertical"
              sx={{ display: { xs: "none", md: "block" }, mx: 1, opacity: 0.2 }}
            />

            {/* DERECHA — Filtros */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ flex: { xs: "1 1 auto", md: "1 1 60%" } }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mr: 0.5,
                }}
              >
                {title} {loading && <CircularProgress size={16} />}
              </Typography>

              {/* Input pill de rango */}
              <TextField
                size="small"
                value={rangeText}
                placeholder={rangeLabel}
                onClick={openCalendar}
                fullWidth={false}
                inputProps={{ readOnly: true }}
                sx={{
                  minWidth: 280,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 999,
                    backgroundColor:
                      theme.palette.mode === "light"
                        ? "rgba(0,0,0,0.02)"
                        : "action.hover",
                  },
                }}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start" sx={{ ml: 0.5 }}>
                      <CalendarMonthIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: hasRange ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        aria-label="Limpiar rango"
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRangeClear();
                        }}
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
              />

              <Popover
                open={calendarOpen}
                anchorEl={anchorEl}
                onClose={closeCalendar}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              >
                <Box sx={{ p: 1 }}>
                  <DateRange
                    ranges={localRange}
                    onChange={(r) => handleRangeChange(r.selection)}
                    moveRangeOnFirstSelection={false}
                    rangeColors={[theme.palette.primary.main]}
                  />
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ p: 1, pt: 0 }}
                  >
                    <Button
                      startIcon={<ClearIcon />}
                      color="inherit"
                      onClick={handleRangeClear}
                    >
                      {clearLabel}
                    </Button>
                    <Button onClick={handleRangeAccept}>Cerrar</Button>
                  </Stack>
                </Box>
              </Popover>

              {/* Acciones compactas */}
              <Stack direction="row" gap={0.75} alignItems="center">
                <Button
                  size="small"
                  variant="contained"
                  onClick={onApply}
                  sx={{ textTransform: "none", borderRadius: 999, px: 1.75 }}
                >
                  {applyLabel}
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<ClearIcon />}
                  onClick={onClear}
                  sx={{ textTransform: "none", borderRadius: 999 }}
                >
                  {clearLabel}
                </Button>
              </Stack>

              {/* Chips de métodos (scroll horizontal si no cabe) */}
              <Box
                sx={{
                  width: { xs: "100%", md: "auto" },
                  overflowX: "auto",
                  pb: { xs: 0.25, md: 0 },
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ flexWrap: "nowrap", mt: { xs: 1, md: 0 } }}
                >
                  {statusOptions.map((opt) => {
                    const selected = status === opt.value;
                    return (
                      <Chip
                        key={opt.value}
                        icon={opt.icon as any}
                        label={opt.label}
                        clickable
                        onClick={() => onStatusChange(opt.value)}
                        size="small"
                        sx={{
                          borderRadius: 999,
                          height: 34,
                          px: 0.25,
                          borderColor: "divider",
                          ...(selected
                            ? {
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                "& .MuiChip-icon": { color: "inherit" },
                                boxShadow:
                                  theme.palette.mode === "light"
                                    ? "0 6px 18px rgba(233,30,99,0.25)"
                                    : "none",
                              }
                            : {
                                bgcolor:
                                  theme.palette.mode === "light"
                                    ? "background.paper"
                                    : "transparent",
                              }),
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          </Stack>

          {/* Resumen discreto */}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
            {status && status !== "all" && (
              <Chip
                size="small"
                color="primary"
                label={`Método: ${
                  statusOptions.find((s) => s.value === status)?.label ?? status
                }`}
                onDelete={() => onStatusChange("all")}
                sx={{ borderRadius: 999 }}
              />
            )}
            {hasRange && (
              <Chip
                size="small"
                variant="outlined"
                label={`Rango: ${fmt(startDate)} → ${fmt(endDate)}`}
                onDelete={() => onRangeChange(null, null)}
                sx={{ borderRadius: 999 }}
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
};

export default DateStatusFilterBar;
