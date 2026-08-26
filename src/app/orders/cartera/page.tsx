"use client";

import * as React from "react";
import {
  Box, Card, CardContent, Typography, Stack, Chip, Button, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Snackbar, Alert, LinearProgress,
} from "@mui/material";
import { Wallet, Plus, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listOrders, registerAbono, type OrderDoc } from "@services/orders.service";

const money = (n?: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", currencyDisplay: "code", maximumFractionDigits: 0 }).format(Number(n || 0));

const METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card_offline", label: "Tarjeta (datáfono)" },
] as const;

export default function CarteraPage() {
  const qc = useQueryClient();
  const [toast, setToast] = React.useState({ open: false, msg: "", sev: "success" as "success" | "error" });

  // Órdenes con saldo pendiente (apartadas / con abonos).
  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders", "cartera"],
    queryFn: () => listOrders({ status: "partial" }),
    staleTime: 30_000,
  });

  const [target, setTarget] = React.useState<OrderDoc | null>(null);
  const [amount, setAmount] = React.useState<number>(0);
  const [method, setMethod] = React.useState<"cash" | "card_offline">("cash");
  const [note, setNote] = React.useState("");

  const openAbono = (o: OrderDoc) => {
    setTarget(o);
    setAmount(Number(o.layaway?.balanceDue || 0));
    setMethod("cash");
    setNote("");
  };

  const abonoMut = useMutation({
    mutationFn: () => registerAbono(target!.id, { amount: Number(amount), method, note: note || undefined }),
    onSuccess: (res) => {
      setToast({ open: true, msg: res.settled ? "Abono registrado — obra SALDADA ✅" : "Abono registrado", sev: "success" });
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["orders"] });
      refetch();
    },
    onError: (e: any) => setToast({ open: true, msg: e?.response?.data?.error || e?.message || "Error al registrar abono", sev: "error" }),
  });

  const totalCartera = orders.reduce((a, o) => a + Number(o.layaway?.balanceDue || 0), 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(63,164,110,0.14)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Wallet size={20} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={900} fontSize={20}>Cartera — Fiado / Abonos</Typography>
          <Typography variant="caption" color="text.secondary">Obras apartadas con saldo pendiente. Registra abonos hasta saldar.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => refetch()} disabled={isFetching} sx={{ textTransform: "none" }}>
          Actualizar
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <Card sx={{ borderRadius: 3, flex: 1 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Cuentas por cobrar</Typography>
          <Typography fontWeight={900} fontSize={26}>{orders.length}</Typography>
        </CardContent></Card>
        <Card sx={{ borderRadius: 3, flex: 1 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Saldo total pendiente</Typography>
          <Typography fontWeight={900} fontSize={26} color="#16a34a">{money(totalCartera)}</Typography>
        </CardContent></Card>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        {isFetching && <LinearProgress />}
        <CardContent>
          {isLoading ? (
            <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
          ) : orders.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
              No hay obras apartadas con saldo pendiente.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Obras</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Abonado</TableCell>
                    <TableCell align="right">Saldo</TableCell>
                    <TableCell>Vence</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((o) => {
                    const paid = Number(o.layaway?.amountPaid || 0);
                    const bal = Number(o.layaway?.balanceDue || 0);
                    const pct = o.total ? Math.round((paid / o.total) * 100) : 0;
                    return (
                      <TableRow key={o.id} hover>
                        <TableCell>
                          <Typography fontWeight={700} fontSize={13}>{o.buyer?.name || "—"}</Typography>
                          <Typography variant="caption" color="text.secondary">{o.buyer?.email || o.buyer?.phone || ""}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{(o.items || []).map((it: any) => it.title || it.artworkId).join(", ")}</Typography>
                        </TableCell>
                        <TableCell align="right">{money(o.total)}</TableCell>
                        <TableCell align="right">
                          {money(paid)}
                          <Chip size="small" label={`${pct}%`} sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={800} color={bal > 0 ? "#b45309" : "#16a34a"}>{money(bal)}</Typography>
                        </TableCell>
                        <TableCell>
                          {o.layaway?.dueDate ? new Date(o.layaway.dueDate).toLocaleDateString("es-CO") : "—"}
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="contained" disableElevation startIcon={<Plus size={14} />}
                            onClick={() => openAbono(o)}
                            sx={{ textTransform: "none", bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}>
                            Abono
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog registrar abono */}
      <Dialog open={!!target} onClose={() => setTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar abono</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {target?.buyer?.name} · Saldo actual <b>{money(target?.layaway?.balanceDue)}</b>
            </Typography>
            <TextField label="Monto del abono (COP)" type="number" size="small" fullWidth
              value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <TextField label="Método" select size="small" fullWidth value={method}
              onChange={(e) => setMethod(e.target.value as "cash" | "card_offline")}>
              {METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField label="Nota (opcional)" size="small" fullWidth value={note} onChange={(e) => setNote(e.target.value)} />
            {amount >= Number(target?.layaway?.balanceDue || 0) && amount > 0 && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>Este abono salda la obra por completo.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)}>Cancelar</Button>
          <Button variant="contained" disableElevation disabled={abonoMut.isPending || amount <= 0}
            onClick={() => abonoMut.mutate()}
            sx={{ bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}>
            {abonoMut.isPending ? "Guardando…" : "Registrar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.sev} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
