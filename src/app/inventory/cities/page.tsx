"use client";

import React, { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Stack, Chip, TextField,
  InputAdornment, Skeleton, alpha, Tooltip,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import { Search, MapPin, CheckCircle2, XCircle, Globe } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import type { CityDoc } from "@/services/city.service";

const GREEN = "#22c55e";

export default function CitiesPage() {
  const theme   = useTheme();
  const dark    = theme.palette.mode === "dark";
  const { data: cities = [], isLoading } = useCities();

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cities;
    return cities.filter(c => c.name.toLowerCase().includes(q));
  }, [cities, search]);

  const activeCount   = cities.filter(c => c.active).length;
  const inactiveCount = cities.length - activeCount;

  /* ── columns ── */
  const columns: GridColDef<CityDoc>[] = [
    {
      field: "legacyId",
      headerName: "ID",
      width: 72,
      renderCell: ({ value }) => (
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.disabled", fontFamily: "monospace" }}>
          #{value}
        </Typography>
      ),
    },
    {
      field: "name",
      headerName: "Ciudad",
      flex: 1,
      minWidth: 180,
      renderCell: ({ value }) => (
        <Stack direction="row" alignItems="center" gap={1.25} height="100%">
          <Box sx={{
            width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
            bgcolor: alpha(GREEN, 0.1),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: GREEN,
          }}>
            <MapPin size={13} />
          </Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "text.primary" }}>{value}</Typography>
        </Stack>
      ),
    },
    {
      field: "active",
      headerName: "Estado",
      width: 130,
      renderCell: ({ value }) => (
        <Chip
          icon={value
            ? <CheckCircle2 size={12} style={{ marginLeft: 6 }} />
            : <XCircle size={12} style={{ marginLeft: 6 }} />
          }
          label={value ? "Activa" : "Inactiva"}
          size="small"
          sx={{
            fontWeight: 700, fontSize: 11,
            bgcolor: value ? alpha(GREEN, 0.12) : alpha("#ef4444", 0.1),
            color:   value ? GREEN             : "#ef4444",
            border: `1px solid ${value ? alpha(GREEN, 0.3) : alpha("#ef4444", 0.25)}`,
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
      ),
    },
    {
      field: "createdAt",
      headerName: "Registrada",
      width: 150,
      renderCell: ({ value }) => value
        ? <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
            {new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
          </Typography>
        : <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>,
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>

      {/* Header */}
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" mb={3}>
        <Box>
          <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: GREEN, textTransform: "uppercase", mb: 0.5 }}>
            Inventario
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, color: "text.primary", lineHeight: 1 }}>
            Ciudades
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.75 }}>
            Catálogo de ciudades de Colombia disponibles en el sistema
          </Typography>
        </Box>

        <Tooltip title="Catálogo oficial de municipios DANE">
          <Chip
            icon={<Globe size={12} style={{ marginLeft: 6 }} />}
            label="Colombia · DANE"
            size="small"
            sx={{
              bgcolor: alpha("#60a5fa", 0.1), color: "#60a5fa",
              border: `1px solid ${alpha("#60a5fa", 0.3)}`,
              fontWeight: 700, fontSize: 11,
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Tooltip>
      </Stack>

      {/* Stat chips */}
      <Stack direction="row" gap={1.5} mb={3} flexWrap="wrap">
        {[
          { label: "Total",    value: cities.length,  color: "#a78bfa" },
          { label: "Activas",  value: activeCount,    color: GREEN     },
          { label: "Inactivas",value: inactiveCount,  color: "#ef4444" },
        ].map(s => (
          <Paper
            key={s.label}
            sx={{
              px: 2, py: 1.25, borderRadius: 2.5,
              bgcolor: dark ? "#111113" : "#ffffff",
              border: `1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"}`,
              display: "flex", alignItems: "center", gap: 1.5,
              minWidth: 100,
            }}
          >
            {isLoading
              ? <Skeleton variant="text" width={60} height={28} />
              : <>
                  <Typography sx={{ fontSize: 22, fontWeight: 900, letterSpacing: -1, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>
                    {s.label}
                  </Typography>
                </>
            }
          </Paper>
        ))}
      </Stack>

      {/* Search + Table */}
      <Paper sx={{
        borderRadius: 3,
        bgcolor: dark ? "#111113" : "#ffffff",
        border: `1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"}`,
        boxShadow: dark ? "0 4px 28px rgba(0,0,0,.45)" : "0 2px 14px rgba(0,0,0,.06)",
        overflow: "hidden",
      }}>

        {/* Search bar */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"}` }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar ciudad…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={15} style={{ color: dark ? "rgba(255,255,255,.3)" : "rgba(0,0,0,.3)" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 340,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: dark ? "rgba(255,255,255,.04)" : "#f5f5f5",
                fontSize: 13.5,
                "& fieldset": { borderColor: dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)" },
                "&:hover fieldset": { borderColor: dark ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.2)" },
                "&.Mui-focused fieldset": { borderColor: GREEN },
              },
            }}
          />
          {search && (
            <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 1 }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para "{search}"
            </Typography>
          )}
        </Box>

        {/* DataGrid */}
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          getRowId={r => r.id ?? r._id ?? r.legacyId}
          pageSizeOptions={[25, 50, 112]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={52}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: dark ? "rgba(255,255,255,.03)" : "#fafafa",
              borderBottom: `1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"}`,
              borderRadius: 0,
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontSize: 11, fontWeight: 800, letterSpacing: .06,
              textTransform: "uppercase", color: "text.secondary",
            },
            "& .MuiDataGrid-row": {
              "&:hover": { bgcolor: dark ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.018)" },
              "&.Mui-selected": { bgcolor: alpha(GREEN, 0.06) },
            },
            "& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)"}`,
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: `1px solid ${dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"}`,
            },
            "& .MuiDataGrid-virtualScroller": { minHeight: 200 },
          }}
        />
      </Paper>
    </Box>
  );
}
