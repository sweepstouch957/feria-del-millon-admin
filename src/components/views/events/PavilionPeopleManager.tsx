"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PavilionDoc } from "@services/pavilions.service";
import { updatePavilionArtists, updatePavilionCashiers } from "@services/pavilions.service";
import { searchUsersByRole } from "@services/users.service";
import type { RoleKey, UserDTO } from "@services/user.service";

/* La gente de un pabellón. Artistas y cajeros se gestionan igual —buscar por
   nombre o correo, agregar, quitar, guardar— así que es un solo componente con
   el rol como parámetro; lo único que cambia es a qué endpoint le pega y los
   textos. Asignar a alguien le da el rol en su cuenta (lo hace el backend). */

type Kind = "artists" | "cashiers";

type Person = {
  id: string;
  label: string;
  email: string;
  firstName?: string;
  lastName?: string;
  disabled?: boolean;
};

const COPY: Record<
  Kind,
  {
    /** Rol que se le pone a la cuenta al asignarla (lo hace el backend). */
    role: RoleKey;
    /** Con qué rol se filtra la búsqueda; sin él busca en todas las cuentas. */
    searchRole?: RoleKey;
    title: string;
    hint: string;
    empty: string;
    add: string;
    save: string;
  }
> = {
  artists: {
    role: "artista",
    // Son cientos: sin filtrar por rol, la búsqueda devuelve cualquier cuenta.
    searchRole: "artista",
    title: "Artistas del pabellón",
    hint: "Quienes exponen en este pabellón. Al guardar, cada cuenta queda con el rol de artista.",
    empty: "Este pabellón todavía no tiene artistas asignados.",
    add: "Agregar artistas",
    save: "Guardar artistas",
  },
  cashiers: {
    role: "cajero",
    title: "Cajeros del pabellón",
    hint: "Quienes cobran las obras en este stand. Al guardar, cada cuenta queda con el rol de cajero. Para validar entradas en la puerta hace falta el rol de taquilla, que es aparte.",
    empty: "Este pabellón todavía no tiene cajeros asignados.",
    add: "Agregar cajeros",
    save: "Guardar cajeros",
  },
};

const nameOf = (u: { firstName?: string; lastName?: string; email: string }) =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;

export default function PavilionPeopleManager({
  eventId,
  pavilion,
  kind,
}: {
  eventId: string;
  pavilion: PavilionDoc | null;
  kind: Kind;
}) {
  const queryClient = useQueryClient();
  const copy = COPY[kind];

  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Person[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [assigned, setAssigned] = useState<Person[]>([]);
  const [dirty, setDirty] = useState(false);

  const current = kind === "artists" ? pavilion?.artistInfo : pavilion?.cashierInfo;

  // La lista del pabellón es la fuente: al cambiar de pabellón (o al refrescar
  // tras guardar) se reescribe lo que se está editando.
  useEffect(() => {
    setAssigned(
      (current ?? []).map((a) => ({
        id: a.id,
        email: a.email,
        firstName: a.firstName,
        lastName: a.lastName,
        label: nameOf(a),
      }))
    );
    setDirty(false);
  }, [current, pavilion?.id]);

  const assignedEmails = useMemo(
    () => new Set(assigned.map((a) => (a.email || "").toLowerCase()).filter(Boolean)),
    [assigned]
  );

  // Búsqueda en el backend por nombre o correo, con el rol que corresponda.
  useEffect(() => {
    if (!search.trim()) {
      setOptions([]);
      return;
    }
    let active = true;
    const run = async () => {
      try {
        setLoadingOptions(true);
        const users: UserDTO[] = await searchUsersByRole(copy.searchRole, search, 20);
        if (!active) return;
        setOptions(
          users.map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            label: nameOf(u),
            disabled: assignedEmails.has((u.email || "").toLowerCase()),
          }))
        );
      } catch (err) {
        console.error("Error buscando cuentas", err);
      } finally {
        if (active) setLoadingOptions(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [search, assignedEmails, copy.role]);

  const save = useMutation({
    mutationKey: ["pavilion", kind, pavilion?.id],
    mutationFn: async () => {
      if (!pavilion) throw new Error("No hay pabellón seleccionado");
      const emails = assigned.map((a) => a.email);
      return kind === "artists"
        ? updatePavilionArtists(eventId, pavilion.id, { artistEmails: emails, mode: "replace" })
        : updatePavilionCashiers(eventId, pavilion.id, emails, "replace");
    },
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["pavilions", eventId] });
    },
  });

  const add = (_: unknown, picked: Person[]) => {
    const byEmail = new Map(assigned.map((a) => [a.email.toLowerCase(), a]));
    for (const p of picked) byEmail.set(p.email.toLowerCase(), p);
    setAssigned([...byEmail.values()]);
    setDirty(true);
  };

  const remove = (email: string) => {
    setAssigned((prev) => prev.filter((a) => a.email.toLowerCase() !== email.toLowerCase()));
    setDirty(true);
  };

  if (!pavilion) {
    return (
      <Typography variant="body2" color="text.secondary">
        Selecciona un pabellón.
      </Typography>
    );
  }

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle1">{copy.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {copy.hint}
        </Typography>
      </Box>

      {assigned.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {copy.empty}
        </Typography>
      ) : (
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {assigned.map((p) => (
            <Chip
              key={p.email}
              label={p.label}
              title={p.email}
              size="small"
              variant="outlined"
              onDelete={() => remove(p.email)}
            />
          ))}
        </Stack>
      )}

      <Autocomplete
        multiple
        value={[]}
        options={options}
        loading={loadingOptions}
        onChange={add}
        onInputChange={(_, value) => setSearch(value)}
        getOptionLabel={(o) => `${o.label} (${o.email})`}
        getOptionDisabled={(o) => !!o.disabled}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField
            {...params}
            label={copy.add}
            size="small"
            placeholder="Nombre o correo…"
          />
        )}
        noOptionsText={
          search.trim() ? "Nadie coincide con esa búsqueda" : "Escribe para buscar…"
        }
      />

      {save.isError && (
        <Alert severity="error">No se pudo guardar. Revisa la conexión e intenta de nuevo.</Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1.5}>
        {dirty && (
          <Typography variant="caption" color="text.secondary">
            Hay cambios sin guardar
          </Typography>
        )}
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
        >
          {save.isPending ? "Guardando…" : copy.save}
        </Button>
      </Stack>
    </Stack>
  );
}
