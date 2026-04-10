"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FormControlLabel, Switch } from "@mui/material";
import { type GridColDef } from "@mui/x-data-grid";

import {
  listPavilions,
  type PavilionDoc,
  type CreatePavilionDto,
  updatePavilion,
} from "@services/pavilions.service";

export type PavilionFormState = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active?: boolean;
  minArtworkPrice?: number;
  maxArtworkPrice?: number;
};

const toPavilionFormState = (p: PavilionDoc): PavilionFormState => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  description: p.description ?? "",
  active: p.active ?? true,
  minArtworkPrice: p.minArtworkPrice,
  maxArtworkPrice: p.maxArtworkPrice,
});

export function usePavilionsManager(selectedEventId: string | null) {
  const queryClient = useQueryClient();

  const [selectedPavilionId, setSelectedPavilionId] = useState<string | null>(
    null
  );
  const [pavilionForm, setPavilionForm] = useState<PavilionFormState | null>(
    null
  );

  const {
    data: pavilions,
    isLoading: loadingPavilions,
    isFetching: fetchingPavilions,
  } = useQuery({
    queryKey: ["pavilions", selectedEventId],
    queryFn: () => listPavilions(selectedEventId as string),
    enabled: !!selectedEventId,
  });

  const selectedPavilion: PavilionDoc | undefined = useMemo(
    () => pavilions?.find((p) => p.id === selectedPavilionId),
    [pavilions, selectedPavilionId]
  );

  // Reset selección cuando cambia el evento
  useEffect(() => {
    setSelectedPavilionId(null);
    setPavilionForm(null);
  }, [selectedEventId]);

  // Sincronizar form cuando cambia el pabellón seleccionado
  useEffect(() => {
    if (selectedPavilion) {
      setPavilionForm(toPavilionFormState(selectedPavilion));
    } else {
      setPavilionForm(null);
    }
  }, [selectedPavilion]);

  const updatePavilionMutation = useMutation({
    mutationKey: ["pavilion", "update"],
    mutationFn: async (payload: {
      pavilionId: string;
      data: Partial<CreatePavilionDto>;
    }) => {
      if (!selectedEventId) throw new Error("No event selected");
      const { pavilionId, data } = payload;
      return updatePavilion(selectedEventId, pavilionId, data);
    },
    onSuccess: async () => {
      if (selectedEventId) {
        await queryClient.invalidateQueries({
          queryKey: ["pavilions", selectedEventId],
        });
      }
    },
  });

  const handleSelectPavilion = (pavilionId: string) => {
    setSelectedPavilionId(pavilionId);
  };

  const handlePavilionFieldChange = (
    field: keyof PavilionFormState,
    value: string | number | boolean
  ) => {
    setPavilionForm((prev) =>
      prev ? { ...prev, [field]: value as any } : prev
    );
  };

  // Helper interno para cambiar activo por id (lo usan tabla y card)
  const togglePavilionActive = (pavilionId: string, checked: boolean) => {
    updatePavilionMutation.mutate({
      pavilionId,
      data: { active: checked },
    });
  };

  // Handler que se usa en el detalle del pabellón (card)
  const handleTogglePavilionActive = (active: boolean) => {
    if (!pavilionForm) return;
    togglePavilionActive(pavilionForm.id, active);
  };

  const handleSavePavilion = async () => {
    if (!pavilionForm || !selectedEventId) return;

    const payload: Partial<CreatePavilionDto> = {
      name: pavilionForm.name,
      slug: pavilionForm.slug,
      description: pavilionForm.description,
      active: pavilionForm.active,
      minArtworkPrice: pavilionForm.minArtworkPrice,
      maxArtworkPrice: pavilionForm.maxArtworkPrice,
    };

    await updatePavilionMutation.mutateAsync({
      pavilionId: pavilionForm.id,
      data: payload,
    });
  };

  // Columnas DataGrid (cierran sobre togglePavilionActive)
  const pavilionColumns: GridColDef[] = [
    {
      field: "name",
      headerName: "Pabellón",
      flex: 1.4,
      minWidth: 160,
    },
    {
      field: "slug",
      headerName: "Slug",
      flex: 1,
      minWidth: 130,
    },
    {
      field: "priceRange",
      headerName: "Rango precio",
      flex: 1,
      minWidth: 140,
      valueGetter: (params) => {
        const row = (params as any)?.row as PavilionDoc | undefined;
        if (!row) return "-";

        const min = row.minArtworkPrice;
        const max = row.maxArtworkPrice;

        if (min == null && max == null) return "-";
        if (min != null && max != null) {
          return `${min.toLocaleString("es-CO")} – ${max.toLocaleString(
            "es-CO"
          )}`;
        }
        if (min != null) {
          return `Desde ${min.toLocaleString("es-CO")}`;
        }
        return `Hasta ${max?.toLocaleString("es-CO")}`;
      },
    },
    {
      field: "active",
      headerName: "Activo",
      width: 120,
      renderCell: (params) => {
        const row = params.row as PavilionDoc;
        return (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={!!row.active}
                onChange={(e) =>
                  togglePavilionActive(row.id, e.target.checked)
                }
              />
            }
            label={row.active ? "Sí" : "No"}
          />
        );
      },
    },
  ];

  return {
    pavilions: pavilions ?? [],
    loadingPavilions,
    fetchingPavilions,
    selectedPavilion: selectedPavilion ?? null,
    pavilionForm,
    pavilionColumns,
    handleSelectPavilion,
    handlePavilionFieldChange,
    handleTogglePavilionActive, // (active: boolean) => void para el card
    handleSavePavilion,         // () => Promise<void> sin artistas
    isSavingPavilion: updatePavilionMutation.isPending,
  };
}
