"use client";

import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Typography,
    Chip,
    Stack,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

import type { EventDoc } from "@services/events.service";
import type { PavilionDoc } from "@services/pavilions.service";

type Props = {
    selectedEvent: EventDoc | null;
    pavilions: PavilionDoc[];
    loadingPavilions: boolean;
    pavilionColumns: GridColDef[];
    onSelectPavilion: (id: string) => void;
};

export default function PavilionsTableCard({
    selectedEvent,
    pavilions,
    loadingPavilions,
    pavilionColumns,
    onSelectPavilion,
}: Props) {
    // Pabellones activos que tienen artistas cargados
    const activePavilionsWithArtists = (pavilions || []).filter(
        (p) => p.active && p.artistInfo && p.artistInfo.length > 0
    );

    return (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardHeader
                title="Pabellones"
                subheader={
                    selectedEvent
                        ? `Pabellones del evento "${selectedEvent.name}"`
                        : "Selecciona un evento para ver sus pabellones"
                }
                sx={{ pb: 1 }}
            />

            <CardContent
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                {/* Tabla de pabellones */}
                <Box sx={{ height: 260 }}>
                    {loadingPavilions && !pavilions.length ? (
                        <Typography variant="body2" color="text.secondary">
                            Cargando pabellones...
                        </Typography>
                    ) : !pavilions.length ? (
                        <Typography variant="body2" color="text.secondary">
                            Este evento todavía no tiene pabellones.
                        </Typography>
                    ) : (
                        <DataGrid
                            rows={pavilions}
                            columns={pavilionColumns}
                            getRowId={(row) => row.id}
                            onRowClick={(params) => onSelectPavilion(params.id as string)}
                            disableRowSelectionOnClick
                            autoPageSize
                        />
                    )}
                </Box>

                {/* Panel de artistas en pabellones activos */}
                {activePavilionsWithArtists.length > 0 && (
                    <Box
                        sx={{
                            mt: 1,
                            p: 1.5,
                            borderRadius: 2,
                            border: "1px dashed",
                            borderColor: "divider",
                            bgcolor: (theme) =>
                                theme.palette.mode === "light"
                                    ? "grey.50"
                                    : "background.default",
                        }}
                    >
                        <Typography variant="subtitle2" gutterBottom>
                            Artistas asignados en pabellones activos
                        </Typography>

                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 1 }}
                        >
                            Los artistas mostrados aquí ya están vinculados a sus pabellones.
                            En el autocomplete del detalle del pabellón aparecerán como
                            seleccionados (no se deben volver a agregar).
                        </Typography>

                        <Stack direction="column" spacing={1}>
                            {activePavilionsWithArtists.map((pavilion) => (
                                <Box key={pavilion.id}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontWeight: 600, mb: 0.5, display: "block" }}
                                    >
                                        {pavilion.name}
                                    </Typography>
                                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                                        {pavilion.artistInfo?.map((artist) => {
                                            const label =
                                                `${artist.firstName ?? ""} ${artist.lastName ?? ""
                                                    }`.trim() || artist.email;

                                            return (
                                                <Chip
                                                    key={artist.id}
                                                    size="small"
                                                    label={label}
                                                    variant="outlined"
                                                    sx={{
                                                        fontSize: "0.7rem",
                                                    }}
                                                />
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
