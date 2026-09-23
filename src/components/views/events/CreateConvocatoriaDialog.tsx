"use client";

import * as React from "react";
import {
  Alert, Autocomplete, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { createConvocatoria, type ConvocatoriaStatus } from "@/services/events.service";
import { listPavilions } from "@/services/pavilions.service";
import { listUsers } from "@/services/user.service";

/* Alta de convocatoria: la convocatoria, su pabellón y su gente en un solo paso.
   Los artistas y cajeros se guardan en el pabellón, que es de donde salen luego
   el catálogo, la caja asistida y las ventas por pabellón. */

const STATUSES: { value: ConvocatoriaStatus; label: string }[] = [
  { value: "open", label: "Abierta (recibiendo proyectos)" },
  { value: "draft", label: "Borrador" },
  { value: "selection", label: "En selección" },
  { value: "closed", label: "Cerrada" },
];

type Person = { email: string; label: string };

/** Busca usuarios por nombre o correo; permite escribir correos que aún no tienen cuenta. */
function PeoplePicker({
  label, help, value, onChange,
}: { label: string; help: string; value: Person[]; onChange: (v: Person[]) => void }) {
  const [q, setQ] = React.useState("");
  const { data: options = [], isFetching } = useQuery({
    queryKey: ["users", "picker", q],
    queryFn: async () =>
      (await listUsers({ q, limit: 20 })).users.map((u: any) => ({
        email: String(u.email),
        label: `${[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email} · ${u.email}`,
      })),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });

  return (
    <Autocomplete
      multiple
      freeSolo
      size="small"
      options={options}
      value={value}
      loading={isFetching}
      filterOptions={(x) => x}
      onInputChange={(_, v) => setQ(v)}
      isOptionEqualToValue={(a, b) => a.email === b.email}
      getOptionLabel={(o) => (typeof o === "string" ? o : o.label)}
      onChange={(_, v) =>
        onChange(
          v.map((item) =>
            typeof item === "string"
              ? { email: item.trim().toLowerCase(), label: item.trim().toLowerCase() }
              : item,
          ).filter((p) => /\S+@\S+\.\S+/.test(p.email)),
        )
      }
      renderTags={(v, getProps) =>
        v.map((p, i) => <Chip size="small" label={p.email} {...getProps({ index: i })} key={p.email} />)
      }
      renderInput={(params) => (
        <TextField {...params} label={label} helperText={help} placeholder="Nombre o correo…" />
      )}
    />
  );
}

export default function CreateConvocatoriaDialog({
  open, onClose, onCreated, eventId, eventName,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  eventId: string;
  eventName?: string;
}) {
  const [name, setName] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [fee, setFee] = React.useState(40000);
  const [status, setStatus] = React.useState<ConvocatoriaStatus>("open");
  const [maxArtworks, setMaxArtworks] = React.useState(3);
  const [createPav, setCreatePav] = React.useState(true);
  const [pavName, setPavName] = React.useState("");
  const [priceMin, setPriceMin] = React.useState<number | "">("");
  const [priceMax, setPriceMax] = React.useState<number | "">("");
  const [existingPav, setExistingPav] = React.useState("");
  const [artists, setArtists] = React.useState<Person[]>([]);
  const [cashiers, setCashiers] = React.useState<Person[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);

  const { data: pavilions = [] } = useQuery({
    queryKey: ["pavilions", eventId],
    queryFn: () => listPavilions(eventId),
    enabled: open && !!eventId,
  });

  React.useEffect(() => {
    if (open) return;
    setName(""); setStartDate(""); setEndDate(""); setFee(40000); setStatus("open");
    setMaxArtworks(3); setCreatePav(true); setPavName(""); setPriceMin(""); setPriceMax("");
    setExistingPav(""); setArtists([]); setCashiers([]); setError(null); setResult(null);
  }, [open]);

  // El pabellón toma el nombre de la convocatoria salvo que se escriba otro.
  const pavilionName = pavName.trim() || name.trim();
  const valid =
    !!eventId && name.trim().length > 2 && !!startDate && !!endDate && startDate < endDate &&
    (createPav ? pavilionName.length > 2 : !!existingPav);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await createConvocatoria({
        name: name.trim(),
        event: eventId,
        startDate,
        endDate,
        fee: Number(fee) || 0,
        status,
        maxArtworksPerArtist: Number(maxArtworks) || 3,
        ...(createPav
          ? {
              newPavilion: {
                name: pavilionName,
                ...(priceMin !== "" ? { minArtworkPrice: Number(priceMin) } : {}),
                ...(priceMax !== "" ? { maxArtworkPrice: Number(priceMax) } : {}),
              },
            }
          : { allowedPavilions: [existingPav] }),
        artistEmails: artists.map((a) => a.email),
        cashierEmails: cashiers.map((c) => c.email),
      });
      const missing = res.assigned?.notFound || [];
      setResult(
        `Convocatoria creada en el pabellón "${res.pavilion?.name}". ` +
          `Artistas asignados: ${res.assigned?.artists ?? 0}. Cajeros: ${res.assigned?.cashiers ?? 0}.` +
          (missing.length ? ` Sin cuenta todavía (no quedaron asignados): ${missing.join(", ")}` : ""),
      );
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.error || "No se pudo crear la convocatoria.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 500 }}>
        Nueva convocatoria{eventName ? ` · ${eventName}` : ""}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          {result && <Alert severity="success">{result}</Alert>}

          <TextField size="small" label="Nombre de la convocatoria" value={name}
            onChange={(e) => setName(e.target.value)} fullWidth autoFocus
            placeholder="Ej: Pabellón Azul 2026" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" type="date" label="Inicio" value={startDate}
              onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField size="small" type="date" label="Cierre" value={endDate}
              onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" type="number" label="Inscripción (COP)" value={fee}
              onChange={(e) => setFee(Number(e.target.value))} fullWidth />
            <TextField size="small" type="number" label="Obras por artista" value={maxArtworks}
              onChange={(e) => setMaxArtworks(Number(e.target.value))} fullWidth />
            <TextField size="small" select label="Estado" value={status}
              onChange={(e) => setStatus(e.target.value as ConvocatoriaStatus)} fullWidth>
              {STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
          </Stack>

          <Divider />
          <Typography variant="caption" color="text.secondary">
            Pabellón: de aquí salen el catálogo, la caja asistida y las ventas por pabellón.
          </Typography>
          <FormControlLabel
            control={<Switch checked={createPav} onChange={(e) => setCreatePav(e.target.checked)} />}
            label="Crear el pabellón junto con la convocatoria"
          />
          {createPav ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField size="small" label="Nombre del pabellón" value={pavName}
                onChange={(e) => setPavName(e.target.value)} fullWidth
                placeholder={name || "Pabellón"} helperText="Vacío = igual al de la convocatoria" />
              <TextField size="small" type="number" label="Precio mínimo" value={priceMin}
                onChange={(e) => setPriceMin(e.target.value === "" ? "" : Number(e.target.value))} fullWidth />
              <TextField size="small" type="number" label="Precio máximo" value={priceMax}
                onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))} fullWidth />
            </Stack>
          ) : (
            <TextField size="small" select label="Pabellón existente" value={existingPav}
              onChange={(e) => setExistingPav(e.target.value)} fullWidth>
              {pavilions.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
          )}

          <Divider />
          <PeoplePicker
            label="Artistas de la convocatoria"
            help="Se les asigna este pabellón y el rol de artista. Quien no tenga cuenta queda pendiente y se avisa."
            value={artists}
            onChange={setArtists}
          />
          <PeoplePicker
            label="Cajeros que ayudan en este pabellón"
            help="Podrán vender obras de este pabellón desde la caja."
            value={cashiers}
            onChange={setCashiers}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">{result ? "Cerrar" : "Cancelar"}</Button>
        <Button variant="contained" onClick={submit} disabled={!valid || saving || !!result}>
          {saving ? <CircularProgress size={18} /> : "Crear convocatoria"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
