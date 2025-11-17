"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Stack,
    Typography,
    Chip,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PavilionDoc } from "@services/pavilions.service";
import {
    updatePavilionArtists,
    type UpdatePavilionArtistsPayload,
} from "@services/pavilions.service";
import { searchArtists } from "@services/users.service";
import type { UserDTO } from "@services/user.service";

type ArtistOption = {
    id: string;
    label: string;
    email: string;
    firstName?: string;
    lastName?: string;
    disabled?: boolean;
};

type Props = {
    eventId: string;
    pavilion: PavilionDoc | null;
};

export default function PavilionArtistsManager({ eventId, pavilion }: Props) {
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [options, setOptions] = useState<ArtistOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    // Artistas asignados al pabellón (estado local editable)
    const [assignedArtists, setAssignedArtists] = useState<ArtistOption[]>([]);

    // Estado para el modal de detalle
    const [detailArtist, setDetailArtist] = useState<ArtistOption | null>(null);

    // Inicializar desde pavilion.artistInfo cuando cambie el pabellón
    useEffect(() => {
        if (!pavilion) {
            setAssignedArtists([]);
            setDetailArtist(null);
            return;
        }

        const mapped: ArtistOption[] =
            pavilion.artistInfo?.map((a) => ({
                id: a.id,
                email: a.email,
                firstName: a.firstName,
                lastName: a.lastName,
                label: `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email,
            })) ?? [];

        setAssignedArtists(mapped);
        setDetailArtist(null);
    }, [pavilion]);

    // Mapa para saber qué emails ya están asignados
    const assignedEmailsSet = useMemo(
        () =>
            new Set(
                assignedArtists
                    .map((a) => a.email?.toLowerCase())
                    .filter(Boolean)
            ),
        [assignedArtists]
    );

    // Buscar artistas desde el backend (por nombre/email)
    useEffect(() => {
        let active = true;
        if (!search.trim()) {
            setOptions([]);
            return;
        }

        const fetch = async () => {
            try {
                setLoadingOptions(true);
                const users: UserDTO[] = await searchArtists({
                    q: search,
                    roles: ["artista"],
                    limit: 20,
                });

                if (!active) return;

                const nextOptions: ArtistOption[] = users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    label:
                        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
                    disabled: assignedEmailsSet.has((u.email || "").toLowerCase()),
                }));

                setOptions(nextOptions);
            } catch (err) {
                console.error("Error buscando artistas", err);
            } finally {
                if (active) setLoadingOptions(false);
            }
        };

        fetch();

        return () => {
            active = false;
        };
    }, [search, assignedEmailsSet]);

    // Mutación para guardar artistas en el pabellón
    const updateArtistsMutation = useMutation({
        mutationKey: ["pavilion", "updateArtists", pavilion?.id],
        mutationFn: async () => {
            if (!pavilion) throw new Error("No hay pabellón seleccionado");

            const payload: UpdatePavilionArtistsPayload = {
                artistEmails: assignedArtists.map((a) => a.email),
                mode: "replace", // reemplaza lista completa por la actual
            };

            return updatePavilionArtists(eventId, pavilion.id, payload);
        },
        onSuccess: async () => {
            // Refrescar lista de pabellones para tener artistInfo actualizado
            await queryClient.invalidateQueries({
                queryKey: ["pavilions", eventId],
            });
        },
    });

    const isSaving = updateArtistsMutation.isPending;

    const handleAddFromAutocomplete = (
        _any: any,
        newValue: ArtistOption[]
    ) => {
        // newValue ya es la lista que devuelve el Autocomplete
        const merged = [
            ...assignedArtists,
            ...newValue.filter(
                (opt) =>
                    !assignedEmailsSet.has((opt.email || "").toLowerCase())
            ),
        ];

        const byEmail = new Map(
            merged.map((a) => [a.email.toLowerCase(), a])
        );

        setAssignedArtists(Array.from(byEmail.values()));
    };

    const handleRemoveArtist = (email: string) => {
        setAssignedArtists((prev) =>
            prev.filter(
                (a) => a.email.toLowerCase() !== email.toLowerCase()
            )
        );
    };

    const handleOpenDetail = (artist: ArtistOption) => {
        setDetailArtist(artist);
    };

    const handleCloseDetail = () => {
        setDetailArtist(null);
    };

    if (!pavilion) {
        return (
            <Box>
                <Typography variant="body2" color="text.secondary">
                    Selecciona un pabellón para gestionar sus artistas.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) =>
                    theme.palette.mode === "light"
                        ? "grey.50"
                        : "background.default",
            }}
        >
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Artistas del pabellón
            </Typography>

            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
            >
                Agrega o quita artistas de este pabellón. Los cambios se guardan para
                todo el evento. Haz clic en un artista para ver sus datos.
            </Typography>

            {/* Chips de artistas asignados */}
            <Box sx={{ mb: 2 }}>
                {assignedArtists.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Este pabellón aún no tiene artistas asignados.
                    </Typography>
                ) : (
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {assignedArtists.map((artist) => (
                            <Chip
                                key={artist.email}
                                label={`${artist.label} (${artist.email})`}
                                size="small"
                                onClick={() => handleOpenDetail(artist)}
                                onDelete={() => handleRemoveArtist(artist.email)}
                                sx={{
                                    fontSize: "0.7rem",
                                    cursor: "pointer",
                                }}
                            />
                        ))}
                    </Stack>
                )}
            </Box>

            {/* Autocomplete para buscar y agregar artistas */}
            <Autocomplete
                multiple
                options={options}
                loading={loadingOptions}
                onChange={handleAddFromAutocomplete}
                onInputChange={(_, value) => setSearch(value)}
                getOptionLabel={(option) =>
                    `${option.label} (${option.email})`
                }
                getOptionDisabled={(option) => !!option.disabled}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Agregar artistas al pabellón"
                        size="small"
                        placeholder="Escribe para buscar por nombre o email…"
                    />
                )}
                noOptionsText={
                    search.trim()
                        ? "No se encontraron artistas con ese criterio"
                        : "Escribe para buscar artistas…"
                }
                sx={{ mb: 2 }}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => updateArtistsMutation.mutate()}
                    disabled={isSaving}
                >
                    {isSaving ? "Guardando..." : "Guardar cambios de artistas"}
                </Button>
            </Box>

            {/* Modal de detalle del artista */}
            <Dialog open={!!detailArtist} onClose={handleCloseDetail} fullWidth>
                <DialogTitle>Información del artista</DialogTitle>
                <DialogContent dividers>
                    {detailArtist && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {detailArtist.firstName || detailArtist.lastName
                                    ? `${detailArtist.firstName ?? ""} ${detailArtist.lastName ?? ""}`.trim()
                                    : detailArtist.label}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Email:</strong> {detailArtist.email}
                            </Typography>
                            <Typography variant="body2">
                                <strong>ID:</strong> {detailArtist.id}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetail}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
