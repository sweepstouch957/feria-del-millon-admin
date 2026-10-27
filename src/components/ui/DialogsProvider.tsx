"use client";

import * as React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, TextField, Typography } from "@mui/material";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { eyebrow } from "@/app/theme";

/* Confirmar y preguntar con un modal del panel, no con el confirm()/prompt()
   del navegador ("feria-del-millon-admin.vercel.app dice…").

   const { confirm, prompt } = useDialogs();
   if (!(await confirm({ title: "¿Enviar?", message: "Salen 604 correos." }))) return;
   const note = await prompt({ title: "Nota", label: "Qué revisar" }); // null = canceló */

type ConfirmOpts = {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Acciones que no se deshacen (borrar, envíos masivos): botón en rojo. */
  danger?: boolean;
  /** Etiqueta pequeña arriba del título. */
  eyebrow?: string;
};
type PromptOpts = ConfirmOpts & {
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: "text" | "number";
  multiline?: boolean;
  /** Devuelve el error a mostrar, o null si el valor sirve. */
  validate?: (v: string) => string | null;
};
type Pending =
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void };

const Ctx = React.createContext<{
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  prompt: (o: PromptOpts) => Promise<string | null>;
} | null>(null);

export function useDialogs() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useDialogs fuera de DialogsProvider");
  return c;
}

export default function DialogsProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [value, setValue] = React.useState("");

  const api = React.useMemo(
    () => ({
      confirm: (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setPending({ kind: "confirm", opts, resolve })),
      prompt: (opts: PromptOpts) =>
        new Promise<string | null>((resolve) => {
          setValue(opts.defaultValue ?? "");
          setPending({ kind: "prompt", opts, resolve });
        }),
    }),
    [],
  );

  const close = (ok: boolean) => {
    if (!pending) return;
    if (pending.kind === "confirm") pending.resolve(ok);
    else pending.resolve(ok ? value : null);
    setPending(null);
  };

  const o = pending?.opts;
  const error = pending?.kind === "prompt" && pending.opts.validate ? pending.opts.validate(value) : null;
  const Icon = o?.danger ? AlertTriangle : HelpCircle;

  return (
    <Ctx.Provider value={api}>
      {children}
      <Dialog open={!!pending} onClose={() => close(false)} fullWidth maxWidth="sm">
        {o && (
          <>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, px: 3, pt: 3 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                bgcolor: o.danger ? "error.main" : "secondary.main", color: o.danger ? "error.contrastText" : "secondary.contrastText" }}>
                <Icon size={20} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                {o.eyebrow && <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary", mb: 0.5 }}>{o.eyebrow}</Typography>}
                <Typography sx={{ fontSize: 19, lineHeight: 1.3 }}>{o.title}</Typography>
              </Box>
              <IconButton size="small" onClick={() => close(false)} aria-label="Cerrar"><X size={18} /></IconButton>
            </Box>
            <DialogContent sx={{ pl: 10, pt: 1.5 }}>
              {o.message && (
                <Typography component="div" variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{o.message}</Typography>
              )}
              {pending?.kind === "prompt" && (
                <TextField
                  autoFocus fullWidth size="small" sx={{ mt: o.message ? 2 : 0 }}
                  label={pending.opts.label} placeholder={pending.opts.placeholder} type={pending.opts.type || "text"}
                  multiline={pending.opts.multiline} minRows={pending.opts.multiline ? 3 : undefined}
                  value={value} onChange={(e) => setValue(e.target.value)}
                  error={!!error} helperText={error || " "}
                  onKeyDown={(e) => { if (e.key === "Enter" && !pending.opts.multiline && !error) close(true); }}
                />
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => close(false)} color="inherit">{o.cancelText || "Cancelar"}</Button>
              <Button variant="contained" color={o.danger ? "error" : "primary"} disabled={!!error} onClick={() => close(true)} autoFocus={pending?.kind === "confirm"}>
                {o.confirmText || "Aceptar"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}
