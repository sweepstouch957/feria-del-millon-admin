"use client";

import React, { useState, useMemo } from "react";
import { Box, Card, Typography, Stack, TextField, InputAdornment } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Search, MapPin } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import type { CityDoc } from "@/services/city.service";
import { formatDate } from "@/utils/date";
import ResponsiveRows from "@/components/common/ResponsiveRows";
import PageHeader from "@/components/ui/PageHeader";
import KpiStrip from "@/components/ui/KpiStrip";
import StatusPill from "@/components/ui/StatusPill";

export default function CitiesPage() {
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
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {value}
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
          <MapPin size={13} strokeWidth={1.4} style={{ opacity: 0.45, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 14 }}>{value}</Typography>
        </Stack>
      ),
    },
    {
      field: "active",
      headerName: "Estado",
      width: 130,
      renderCell: ({ value }) => (
        <StatusPill label={value ? "Activa" : "Inactiva"} tone={value ? "ok" : "bad"} />
      ),
    },
    {
      field: "createdAt",
      headerName: "Registrada",
      width: 150,
      renderCell: ({ value }) => (
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          {value ? formatDate(value, { day: "2-digit", month: "short", year: "numeric" }) : "—"}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>

      <PageHeader
        crumb="Inventario"
        title="Ciudades"
        description="Catálogo oficial de municipios DANE habilitados para la feria."
        badge={<StatusPill label="Colombia · DANE" tone="mid" />}
      />

      <KpiStrip
        loading={isLoading}
        min={150}
        items={[
          { label: "Total", value: cities.length },
          { label: "Activas", value: activeCount, accent: true },
          { label: "Inactivas", value: inactiveCount },
        ]}
      />

      {/* Buscador + tabla */}
      <Card sx={{ overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar ciudad…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={15} strokeWidth={1.4} style={{ opacity: 0.45 }} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 340 }}
          />
          {search && (
            <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 1 }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &ldquo;{search}&rdquo;
            </Typography>
          )}
        </Box>

        {/* DataGrid */}
        <ResponsiveRows
          loading={isLoading}
          emptyText="No hay ciudades registradas."
          cards={filtered.map((c: any) => ({
            id: String(c.id ?? c._id ?? c.legacyId),
            title: c.name,
            badge: <StatusPill label={c.active ? "Activa" : "Inactiva"} tone={c.active ? "ok" : "bad"} />,
            fields: [
              { label: "Código", value: c.legacyId },
              {
                label: "Registrada",
                value: c.createdAt
                  ? formatDate(c.createdAt, { day: "2-digit", month: "short", year: "numeric" })
                  : "",
              },
            ],
          }))}
        >
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
          sx={{ border: "none", "& .MuiDataGrid-virtualScroller": { minHeight: 200 } }}
        />
        </ResponsiveRows>
      </Card>
    </Box>
  );
}
