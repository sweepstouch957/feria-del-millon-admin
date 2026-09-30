"use client";

import { Box, Card, CardHeader, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

import type { EventDoc } from "@services/events.service";
import type { PavilionDoc } from "@services/pavilions.service";

type Props = {
    selectedEvent: EventDoc | null;
    pavilions: PavilionDoc[];
    loadingPavilions: boolean;
    pavilionColumns: GridColDef[];
    /** Abre la ficha del pabellón (modal). */
    onSelectPavilion: (id: string) => void;
};

export default function PavilionsTableCard({
    selectedEvent,
    pavilions,
    loadingPavilions,
    pavilionColumns,
    onSelectPavilion,
}: Props) {
    return (
        <Card>
            <CardHeader
                title="Pabellones"
                subheader={
                    selectedEvent
                        ? "Abre un pabellón para editar sus datos y sus artistas"
                        : "Selecciona una feria para ver sus pabellones"
                }
                sx={{ pb: 1 }}
            />

            <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
                {loadingPavilions && !pavilions.length ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        Cargando pabellones…
                    </Typography>
                ) : !pavilions.length ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        Esta feria todavía no tiene pabellones.
                    </Typography>
                ) : (
                    <Box sx={{ height: 320 }}>
                        <DataGrid
                            rows={pavilions}
                            columns={pavilionColumns}
                            getRowId={(row) => row.id}
                            onRowClick={(params) => onSelectPavilion(params.id as string)}
                            disableRowSelectionOnClick
                            disableColumnMenu
                            autoPageSize
                            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
                        />
                    </Box>
                )}
            </Box>
        </Card>
    );
}
