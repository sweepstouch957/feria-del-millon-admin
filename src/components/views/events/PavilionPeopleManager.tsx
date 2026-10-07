"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PavilionDoc } from "@services/pavilions.service";
import { updatePavilionArtists, updatePavilionCashiers } from "@services/pavilions.service";
import { listApplications } from "@services/applications.service";
import { listUsers } from "@services/user.service";
import { eyebrow } from "@/app/theme";

/* La gente de un pabellón: artistas y cajeros.

   Es una LISTA con casillas, no un autocompletar: la pregunta no es "cómo se
   llama", sino "a quién de estos le toca este pabellón". Los artistas salen de
   las solicitudes ACEPTADAS —son los únicos que exponen— y los cajeros de las
   cuentas con ese rol, con búsqueda abierta para nombrar a alguien que todavía
   no lo es (el rol se lo pone el backend al guardar). */

type Kind = "artists" | "cashiers";

type Person = { id: string; name: string; email: string };

const COPY: Record<Kind, { title: string; hint: string; empty: string; save: string; search: string }> = {
  artists: {
    title: "Artistas del pabellón",
    hint: "Salen de las solicitudes aceptadas de la convocatoria. Marca quiénes exponen en este pabellón.",
    empty: "Todavía no hay solicitudes aceptadas. Acepta artistas en Solicitudes y aparecen acá.",
    save: "Guardar artistas",
    search: "Buscar por nombre o correo",
  },
  cashiers: {
    title: "Cajeros del pabellón",
    hint: "Quienes cobran las obras en este stand. Al guardar, cada cuenta queda con el rol de cajero. Validar entradas en la puerta es el rol de taquilla, que es aparte.",
    empty: "No hay cuentas con rol de cajero. Busca a la persona por su correo y márcala: al guardar queda como cajera.",
    save: "Guardar cajeros",
    search: "Buscar cualquier cuenta por nombre o correo",
  },
};

const fullName = (u: { firstName?: string; lastName?: string; email?: string }) =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Sin nombre";

const key = (email: string) => (email || "").trim().toLowerCase();

/** Dedup por correo conservando el orden. */
function uniq(people: Person[]): Person[] {
  const seen = new Map<string, Person>();
  for (const p of people) if (p.email && !seen.has(key(p.email))) seen.set(key(p.email), p);
  return [...seen.values()];
}

export default function PavilionPeopleManager({
  eventId,
  pavilion,
  kind,
  pavilions = [],
}: {
  eventId: string;
  pavilion: PavilionDoc | null;
  kind: Kind;
  /** Todos los pabellones de la feria: avisa si alguien ya está en otro. */
  pavilions?: PavilionDoc[];
}) {
  const qc = useQueryClient();
  const copy = COPY[kind];

  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [dirty, setDirty] = React.useState(false);

  const assignedInfo = kind === "artists" ? pavilion?.artistInfo : pavilion?.cashierInfo;

  // La lista guardada es la fuente: al cambiar de pabellón (o tras guardar) se
  // reescribe la selección.
  React.useEffect(() => {
    setSelected(new Set((assignedInfo ?? []).map((a) => key(a.email))));
    setDirty(false);
    setQ("");
  }, [assignedInfo, pavilion?.id, kind]);

  // ── De dónde sale la gente ────────────────────────────────────────────────
  const accepted = useQuery({
    queryKey: ["accepted-artists"],
    queryFn: () => listApplications({ status: "accepted", limit: 200 }),
    enabled: kind === "artists",
    staleTime: 60_000,
  });

  const cashierAccounts = useQuery({
    queryKey: ["users-by-role", "cajero"],
    queryFn: () => listUsers({ roles: ["cajero"], limit: 200, sortBy: "firstName", sortDir: "asc" }),
    enabled: kind === "cashiers",
    staleTime: 60_000,
  });

  // Búsqueda abierta: para los cajeros hay que poder nombrar a quien todavía no
  // tiene el rol, así que se busca en todas las cuentas.
  const needle = q.trim();
  const openSearch = useQuery({
    queryKey: ["users-search", needle],
    queryFn: () => listUsers({ q: needle, limit: 30, sortBy: "firstName", sortDir: "asc" }),
    enabled: kind === "cashiers" && needle.length >= 2,
    staleTime: 30_000,
  });

  const base: Person[] = React.useMemo(() => {
    // Quien ya está asignado va siempre en la lista, aunque no esté en el origen
    // (por ejemplo un artista que se aceptó en otra edición).
    const current: Person[] = (assignedInfo ?? []).map((a) => ({
      id: a.id,
      name: fullName(a),
      email: a.email,
    }));

    if (kind === "artists") {
      const fromApps: Person[] = (accepted.data?.docs ?? [])
        .map((d) => d.artist)
        .filter((a): a is Exclude<typeof a, string> => !!a && typeof a === "object")
        .map((a) => ({ id: a._id, name: fullName(a), email: a.email }));
      return uniq([...current, ...fromApps]);
    }

    const fromRole: Person[] = (cashierAccounts.data?.users ?? []).map((u) => ({
      id: u.id,
      name: fullName(u),
      email: u.email,
    }));
    const fromSearch: Person[] = (openSearch.data?.users ?? []).map((u) => ({
      id: u.id,
      name: fullName(u),
      email: u.email,
    }));
    return uniq([...current, ...fromRole, ...fromSearch]);
  }, [assignedInfo, kind, accepted.data, cashierAccounts.data, openSearch.data]);

  const shown = React.useMemo(() => {
    const n = needle.toLowerCase();
    if (!n) return base;
    return base.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(n));
  }, [base, needle]);

  /** En qué otro pabellón está esta persona (para no asignarla dos veces). */
  const elsewhere = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of pavilions) {
      if (p.id === pavilion?.id) continue;
      const list = kind === "artists" ? p.artistInfo : p.cashierInfo;
      for (const a of list ?? []) map[key(a.email)] = p.name;
    }
    return map;
  }, [pavilions, pavilion?.id, kind]);

  const toggle = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = key(email);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
    setDirty(true);
  };

  const save = useMutation({
    mutationKey: ["pavilion", kind, pavilion?.id],
    mutationFn: async () => {
      if (!pavilion) throw new Error("No hay pabellón seleccionado");
      // Se mandan los correos tal como vinieron (el backend los normaliza).
      const emails = base.filter((p) => selected.has(key(p.email))).map((p) => p.email);
      return kind === "artists"
        ? updatePavilionArtists(eventId, pavilion.id, { artistEmails: emails, mode: "replace" })
        : updatePavilionCashiers(eventId, pavilion.id, emails, "replace");
    },
    onSuccess: async () => {
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["pavilions", eventId] });
    },
  });

  const loading =
    (kind === "artists" && accepted.isLoading) || (kind === "cashiers" && cashierAccounts.isLoading);
  const failed = kind === "artists" ? accepted.isError : cashierAccounts.isError;

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

      <TextField
        size="small"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={copy.search}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={15} strokeWidth={1.4} />
              </InputAdornment>
            ),
          },
        }}
      />

      {failed && <Alert severity="error">No se pudo cargar la lista. Recarga la página.</Alert>}

      <Box sx={{ border: "1px solid", borderColor: "divider", maxHeight: 340, overflowY: "auto" }}>
        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : !shown.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2.5 }}>
            {needle ? "Nadie coincide con esa búsqueda." : copy.empty}
          </Typography>
        ) : (
          shown.map((p) => {
            const k = key(p.email);
            const on = selected.has(k);
            const other = elsewhere[k];
            return (
              <Stack
                key={k}
                direction="row"
                alignItems="center"
                gap={1}
                onClick={() => toggle(p.email)}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-of-type": { borderBottom: 0 },
                  backgroundColor: on ? "action.selected" : "transparent",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <Checkbox checked={on} size="small" sx={{ p: 0.5 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {p.email}
                  </Typography>
                </Box>
                {other && !on ? (
                  <Chip size="small" variant="outlined" label={`Ya en ${other}`} />
                ) : null}
              </Stack>
            );
          })
        )}
      </Box>

      {kind === "cashiers" && needle.length === 1 && (
        <Typography variant="caption" color="text.secondary">
          Escribe dos letras o más para buscar en todas las cuentas.
        </Typography>
      )}

      {save.isError && (
        <Alert severity="error">No se pudo guardar. Revisa la conexión e intenta de nuevo.</Alert>
      )}

      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} flexWrap="wrap">
        <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>
          {selected.size} {selected.size === 1 ? "seleccionada" : "seleccionadas"}
          {dirty ? " · sin guardar" : ""}
        </Typography>
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
