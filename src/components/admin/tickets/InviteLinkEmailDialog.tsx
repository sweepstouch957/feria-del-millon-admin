"use client";

import * as React from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography, CircularProgress, LinearProgress,
} from "@mui/material";
import { ImagePlus, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/useAuth";
import { uploadCampaignImage } from "@services/upload.service";
import { previewInviteLinkEmail, sendInviteLinkEmails, updateInviteLink, type InviteLink } from "@services/ticket.service";
import { useAuth } from "@/provider/authProvider";

/* Correo propio de un enlace de registro: pieza gráfica, texto y fecha límite.
   El botón del correo lleva al enlace corto, así que quien lo recibe puede
   reenviarlo. Se manda a quien se quiera (lista de correos). */

const DEFAULT_LINK_IMAGE =
  "https://res.cloudinary.com/dg9gzic4s/image/upload/w_1120,q_auto,f_auto/v1792853968/feria-del-millon/invitaciones/bc2ujctrgov8mpzye3rt.jpg";

const parseEmails = (t: string) =>
  [...new Set((t.match(/[^\s,;<>"'/()[\]]+@[^\s,;<>"'/()[\]]+\.[a-z]{2,}/gi) || []).map((e) => e.toLowerCase()))];

export default function InviteLinkEmailDialog({
  link, open, onClose, defaultMessage, shortUrl,
}: { link: InviteLink | null; open: boolean; onClose: () => void; defaultMessage: string; shortUrl: string }) {
  const qc = useQueryClient();
  const { user } = useAuth() as any;
  const [image, setImage] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [to, setTo] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !link) return;
    setImage(link.emailImage || DEFAULT_LINK_IMAGE);
    setLogo(link.logo || "");
    setMessage(link.emailMessage || defaultMessage);
    setDeadline(link.emailDeadline || "2026-11-01");
    setTo("");
  }, [open, link?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = { emailImage: image === DEFAULT_LINK_IMAGE ? "" : image, emailMessage: message.trim() === defaultMessage.trim() ? "" : message, emailDeadline: deadline, logo };
  const draftKey = useDebouncedValue(JSON.stringify(draft), 500);
  const preview = useQuery({
    queryKey: ["invite-link-preview", link?.id, draftKey],
    queryFn: () => previewInviteLinkEmail(link!.id, JSON.parse(draftKey)),
    enabled: open && !!link,
    placeholderData: (p) => p,
  });

  const save = useMutation({
    mutationFn: () => updateInviteLink(link!.id, draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invite-links"] }),
  });

  const recipients = parseEmails(to);
  const send = useMutation({
    mutationFn: async (test: boolean) => {
      await save.mutateAsync(); // lo que se ve es lo que se manda
      return sendInviteLinkEmails(link!.id, test ? [user?.email].filter(Boolean) : recipients, test);
    },
    onSuccess: (r, test) => {
      qc.invalidateQueries({ queryKey: ["invite-links"] });
      if (r.queued) toast.success(`Enviando a ${r.total} personas. Puede tardar unos minutos.`);
      else if (r.failed?.length) toast.error(`No se pudo enviar a ${r.failed.map((f) => f.email).join(", ")}`);
      else toast.success(test ? `Prueba enviada a ${user?.email}` : `Enviado a ${r.sent} ${r.sent === 1 ? "persona" : "personas"}`);
      if (!test) setTo("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "No se pudo enviar"),
  });

  const onPickImage = async (file?: File, set: (url: string) => void = setImage) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadCampaignImage(file, "invitaciones");
      set(url);
    } catch {
      toast.error("No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  if (!link) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Correo del enlace <b>{shortUrl.replace(/^https?:\/\//, "")}</b>
        <Typography variant="body2" color="text.secondary">
          El botón lleva a este enlace, así que quien lo reciba puede reenviarlo. Enviados hasta hoy: {link.emailsSent || 0}.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: "column", md: "row" }} gap={3}>
          <Stack gap={2} sx={{ flex: 1, minWidth: 0 }}>
            <Box>
              <Typography fontSize={13} fontWeight={600} mb={1}>Pieza gráfica (arriba del correo)</Typography>
              <Stack direction="row" gap={1.5} alignItems="center">
                <Box component="img" src={image} alt="" sx={{ width: 96, height: 120, objectFit: "cover", border: "1px solid", borderColor: "divider" }} />
                <Stack gap={1}>
                  <Button component="label" size="small" variant="outlined" startIcon={uploading ? <CircularProgress size={14} /> : <ImagePlus size={15} />} disabled={uploading}>
                    {uploading ? "Subiendo…" : "Cambiar imagen"}
                    <input hidden type="file" accept="image/*" onChange={(e) => { onPickImage(e.target.files?.[0]); e.target.value = ""; }} />
                  </Button>
                  {image !== DEFAULT_LINK_IMAGE && (
                    <Button size="small" color="inherit" onClick={() => setImage(DEFAULT_LINK_IMAGE)}>Usar la de la feria</Button>
                  )}
                </Stack>
              </Stack>
            </Box>
            <Box>
              <Typography fontSize={13} fontWeight={600} mb={1}>Logo del aliado (opcional, arriba del correo y de la página)</Typography>
              <Stack direction="row" gap={1.5} alignItems="center">
                {logo && <Box component="img" src={logo} alt="" sx={{ width: 64, height: 64, objectFit: "contain", border: "1px solid", borderColor: "divider" }} />}
                <Button component="label" size="small" variant="outlined" startIcon={<ImagePlus size={15} />} disabled={uploading}>
                  {logo ? "Cambiar logo" : "Subir logo"}
                  <input hidden type="file" accept="image/*" onChange={(e) => { onPickImage(e.target.files?.[0], setLogo); e.target.value = ""; }} />
                </Button>
                {logo && <Button size="small" color="inherit" onClick={() => setLogo("")}>Quitar</Button>}
              </Stack>
            </Box>
            <TextField
              label="Texto del correo" value={message} onChange={(e) => setMessage(e.target.value)} multiline minRows={10} fullWidth size="small"
              helperText="Un párrafo por línea en blanco. Las líneas que empiezan con “* ” salen como viñetas. El enlace no hace falta: va en el botón. Si lo cambias, también sale en la página del enlace, arriba del formulario."
            />
            <TextField
              type="date" size="small" label="Confirmar antes de" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ maxWidth: 220 }}
            />
            <TextField
              label="Enviar a (correos)" value={to} onChange={(e) => setTo(e.target.value)} multiline minRows={4} fullWidth size="small"
              placeholder={"curaduria@correo.com\nartista1@correo.com, artista2@correo.com"}
              helperText={`${recipients.length} correo${recipients.length === 1 ? "" : "s"} válido${recipients.length === 1 ? "" : "s"} · máximo 500 por envío · puedes pegar una columna de Excel`}
              error={recipients.length > 500}
            />
          </Stack>
          <Box sx={{ flex: 1, minWidth: 0, border: "1px solid", borderColor: "divider", position: "relative" }}>
            {preview.isFetching && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2 }} />}
            {preview.data ? (
              <iframe title="Vista previa" srcDoc={preview.data} style={{ width: "100%", height: 640, border: 0, display: "block" }} />
            ) : (
              <Box sx={{ height: 640, display: "grid", placeItems: "center", color: "text.secondary", fontSize: 13 }}>Cargando vista previa…</Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} color="inherit">Cerrar</Button>
        <Button onClick={() => save.mutate(undefined, { onSuccess: () => toast.success("Correo guardado") })} disabled={save.isPending}>
          Guardar
        </Button>
        <Button variant="outlined" startIcon={<Send size={14} />} disabled={send.isPending || !user?.email} onClick={() => send.mutate(true)}>
          Enviarme una prueba
        </Button>
        <Button
          variant="contained" startIcon={<Send size={14} />}
          disabled={send.isPending || !recipients.length || recipients.length > 500}
          onClick={() => send.mutate(false)}
        >
          {send.isPending ? "Enviando…" : `Enviar a ${recipients.length || ""} ${recipients.length === 1 ? "persona" : "personas"}`.replace("  ", " ")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
