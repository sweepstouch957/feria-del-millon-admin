"use client";

import * as React from "react";
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Radio, RadioGroup, Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendInventoryReminder, type ReminderScope } from "@services/applications.service";

const SCOPES: { value: ReminderScope; label: string; hint: string }[] = [
  { value: "sent", label: "Los que ya enviaron", hint: "Para que editen sus obras o agreguen nuevas" },
  { value: "pending", label: "Los que aún no envían", hint: "Recordatorio para terminar la carga" },
  { value: "all", label: "Todos los artistas de los pabellones", hint: "" },
];

/**
 * Correo "Aún puedes editar tus obras o subir más" (flyer de las invitaciones
 * + botón que abre su estudio con la sesión puesta). Primero cuenta a quién le
 * llega; envía solo al confirmar. Con `artistIds` va solo a esos artistas.
 */
export default function UploadMoreDialog({
  eventId, open, onClose, artistIds,
}: { eventId: string; open: boolean; onClose: () => void; artistIds?: string[] }) {
  const [pickedScope, setScope] = React.useState<ReminderScope>("sent");
  const picked = !!artistIds?.length;
  const scope = picked ? "all" : pickedScope;

  const preview = useQuery({
    queryKey: ["inventory-reminder", eventId, scope, artistIds],
    queryFn: () => sendInventoryReminder({ eventId, scope, artistIds, dryRun: true }),
    enabled: open,
  });
  const send = useMutation({
    mutationFn: () => sendInventoryReminder({ eventId, scope, artistIds }),
    onSuccess: (r) => {
      toast.success(`Correo enviado a ${r.count} artista(s)`);
      onClose();
    },
    onError: () => toast.error("No se pudo enviar el correo"),
  });

  const count = preview.data?.count ?? 0;

  return (
    <Dialog open={open} onClose={() => !send.isPending && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Invitar a editar o subir más obras</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Les llega un correo con el flyer de la feria, la fecha de cierre de su carga y un botón que abre su estudio
          sin pedir contraseña. Pueden editar todas sus obras o agregar más aunque ya hayan enviado, y volver a enviar.
        </Typography>
        {picked ? (
          <Typography variant="body2">Solo a los {artistIds!.length} artista(s) que marcaste en la tabla.</Typography>
        ) : (
        <RadioGroup value={scope} onChange={(e) => setScope(e.target.value as ReminderScope)}>
          {SCOPES.map((s) => (
            <FormControlLabel
              key={s.value}
              value={s.value}
              control={<Radio />}
              label={
                <span>
                  {s.label}
                  {s.hint && <Typography component="span" variant="caption" color="text.secondary"> · {s.hint}</Typography>}
                </span>
              }
            />
          ))}
        </RadioGroup>
        )}
        <Alert severity={count ? "info" : "warning"} sx={{ mt: 2 }} icon={preview.isFetching ? <CircularProgress size={18} /> : undefined}>
          {preview.isFetching ? "Contando…" : count ? `Le llega a ${count} artista(s).` : "Nadie en este grupo."}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={send.isPending}>Cancelar</Button>
        <Button variant="contained" onClick={() => send.mutate()} disabled={!count || send.isPending || preview.isFetching}>
          {send.isPending ? "Enviando…" : `Enviar a ${count}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
