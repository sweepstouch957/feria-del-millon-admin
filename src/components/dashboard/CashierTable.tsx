/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  Stack,
  IconButton,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export type CashierRow = {
  id: string | number; // solo para key
  name: string;
  phone: string;
  email: string;
  accessCode?: string | null; // ← CAMBIO: ahora se muestra accessCode
  active?: boolean; // para estado del botón Disable
};

export default function CashierTable({
  rows,
  onDisable,
  disablingIds = [],
  onDelete,
  deletingIds = [],
  confirmDeleteText = "This action will permanently delete this cashier. Continue?",
}: {
  rows: CashierRow[];
  /** Inhabilitar (opcional) */
  onDisable?: (row: CashierRow) => void;
  disablingIds?: Array<string | number>;
  /** Eliminar (opcional) */
  onDelete?: (row: CashierRow) => void;
  deletingIds?: Array<string | number>;
  /** Texto de confirmación para eliminar */
  confirmDeleteText?: string | ((row: CashierRow) => string);
}) {
  return (
    <TableContainer
      component={Paper}
      sx={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#F5F5F5" }}>
            <TableCell sx={{ fontWeight: 600, color: "#112E51" }}>
              Name
            </TableCell>
               <TableCell sx={{ fontWeight: 600, color: "#112E51" }}>
              Access code
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: "#112E51" }}>
              Phone
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: "#112E51" }}>
              Email
            </TableCell>
         
            <TableCell sx={{ fontWeight: 600, color: "#112E51" }}>
              Status
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: "#112E51" }} align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const isDisabling = disablingIds.includes(r.id);
            const isDeleting = deletingIds.includes(r.id);
            const isInactive = r.active === false;

            const askDelete = () => {
              const text =
                typeof confirmDeleteText === "function"
                  ? confirmDeleteText(r)
                  : confirmDeleteText;
              return window.confirm(text);
            };

            return (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                <TableCell>{r.accessCode ?? "—"}</TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.active ? "Active" : "Inactive"}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {/* Delete */}
                    <Tooltip title="Inactivate cashier">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (onDelete && askDelete()) {
                            onDelete(r);
                          }
                        }}
                      >
                        {isDeleting ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteOutlineIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
