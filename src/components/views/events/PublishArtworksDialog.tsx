"use client";

import * as React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listPavilions, type PavilionDoc } from "@services/pavilions.service";
import { publishArtworks } from "@services/artworks.service";
import { eyebrow } from "@/app/theme";

/* Publicar obras en el catálogo público.
   Lo que sube un artista queda cargado pero oculto; publicar es decidir QUÉ
   sale. Casi nunca es todo de una: se abre un pabellón cuando está montado, o
   un artista cuando ya revisaste su serie. Antes de escribir se cuenta a
   cuántas obras afecta (dryRun), porque esto se ve en el sitio público. */

type Scope = "all" | "pavilion" | "artist";

export default function PublishArtworksDialog({
  open,
  onClose,
  eventId,
  eventName,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventName?: string;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const [scope, setScope] = React.useState<Scope>("all");
  const [pavilion, setPavilion] = React.useState("");
  const [artist, setArtist] = React.useState("");
  const [publish, setPublish] = React.useState(true);
  const [done, setDone] = React.useState<{ modified: number; published: boolean } | null>(null);

  React.useEffect(() => {
    if (open) {
      setScope("all");
      setPavilion("");
      setArtist("");
      setPublish(true);
      setDone(null);
    }
  }, [open]);

  // Pabellones de la feria (con sus artistas): de aquí salen los dos selectores.
  const { data: pavilions = [] } = useQuery({
    queryKey: ["pavilions", eventId],
    queryFn: () => listPavilions(eventId, true),
    enabled: open && !!eventId,
  });

  /** Los artistas de la feria son los asignados a sus pabellones. */
  const artists = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pavilions as PavilionDoc[]) {
      for (const a of p.artistInfo ?? []) {
        const name = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email;
        map.set(String(a.id), name);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pavilions]);

  const target =
    scope === "pavilion" ? pavilion : scope === "artist" ? artist : "ok";
  const ready = !!eventId && !!target;

  const input = {
    event: eventId,
    scope,
    ...(scope === "pavilion" ? { pavilion } : {}),
    ...(scope === "artist" ? { artist } : {}),
    publish,
  };

  // Cuántas obras cambiarían con este alcance.
  const count = useQuery({
    queryKey: ["publish-count", input],
    queryFn: () => publishArtworks({ ...input, dryRun: true }),
    enabled: open && ready,
    staleTime: 0,
  });

  const run = useMutation({
    mutationFn: () => publishArtworks(input),
    onSuccess: (r) => {
      setDone({ modified: r.modified, published: !!r.published });
      qc.invalidateQueries({ queryKey: ["artworks"] });
      onDone?.();
    },
  });

  const n = count.data?.matched ?? 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>
          Catálogo público
        </Typography>
        <Typography variant="h4" component="div" sx={{ mt: 0.5 }}>
          Publicar obras
        </Typography>
        {eventName && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {eventName}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {done ? (
          <Alert severity="success">
            {done.modified === 0
              ? "No había obras pendientes con ese alcance."
              : `${done.modified} ${done.modified === 1 ? "obra" : "obras"} ${
                  done.published ? "publicadas" : "escondidas"
                }.`}
          </Alert>
        ) : (
          <Stack gap={2.5} sx={{ pt: 1 }}>
            <TextField
              select
              size="small"
              label="Qué publicar"
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
              fullWidth
            >
              <MenuItem value="all">Todas las obras de la feria</MenuItem>
              <MenuItem value="pavilion">Las de un pabellón</MenuItem>
              <MenuItem value="artist">Las de un artista</MenuItem>
            </TextField>

            {scope === "pavilion" && (
              <TextField
                select
                size="small"
                label="Pabellón"
                value={pavilion}
                onChange={(e) => setPavilion(e.target.value)}
                fullWidth
                helperText={!pavilions.length ? "Esta feria no tiene pabellones" : undefined}
              >
                {(pavilions as PavilionDoc[]).map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {scope === "artist" && (
              <TextField
                select
                size="small"
                label="Artista"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                fullWidth
                helperText={
                  !artists.length ? "Todavía no hay artistas asignados a pabellones" : undefined
                }
              >
                {artists.map(([id, name]) => (
                  <MenuItem key={id} value={id}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              size="small"
              label="Acción"
              value={publish ? "1" : "0"}
              onChange={(e) => setPublish(e.target.value === "1")}
              fullWidth
            >
              <MenuItem value="1">Publicar en el catálogo</MenuItem>
              <MenuItem value="0">Volver a esconder</MenuItem>
            </TextField>

            {ready && (
              <Alert severity={n ? "info" : "warning"}>
                {count.isFetching
                  ? "Contando obras…"
                  : n
                    ? `Con este alcance se ${publish ? "publican" : "esconden"} ${n} ${n === 1 ? "obra" : "obras"}.`
                    : `No hay obras por ${publish ? "publicar" : "esconder"} con este alcance.`}
              </Alert>
            )}

            {run.isError && (
              <Alert severity="error">No se pudo completar. Intenta de nuevo.</Alert>
            )}

            <Typography variant="caption" color="text.secondary">
              Publicar hace visibles las obras en el catálogo del sitio y en la página de cada
              artista. Lo que no se publica sigue cargado, solo no se ve.
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          {done ? "Cerrar" : "Cancelar"}
        </Button>
        {!done && (
          <Button
            variant="contained"
            color="secondary"
            disabled={!ready || !n || run.isPending || count.isFetching}
            onClick={() => run.mutate()}
          >
            {run.isPending
              ? "Aplicando…"
              : publish
                ? `Publicar ${n || ""}`.trim()
                : `Esconder ${n || ""}`.trim()}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
