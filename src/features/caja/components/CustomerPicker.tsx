"use client";

import { useState } from "react";
import { Autocomplete, Box, InputAdornment, TextField, Typography } from "@mui/material";
import { UserSearch } from "lucide-react";
import type { CustomerDoc } from "@services/orders.service";
import { useCustomerSearch } from "../hooks/useCustomerSearch";

/**
 * Buscar a quien ya dejó sus datos (compró una obra o una entrada, o está
 * invitado) y llenarlos de un toque. Si no aparece, es cliente nuevo: se llenan
 * los campos de abajo y queda guardado al cobrar.
 */
export function CustomerPicker({ onPick }: { onPick: (c: CustomerDoc) => void }) {
  const [text, setText] = useState("");
  const { results, isLoading } = useCustomerSearch(text);
  const searching = text.trim().length > 0;

  return (
    <Autocomplete
      options={results}
      filterOptions={(x) => x}
      inputValue={text}
      onInputChange={(_, v, reason) => reason !== "reset" && setText(v)}
      value={null}
      onChange={(_, c) => {
        if (!c) return;
        onPick(c);
        setText("");
      }}
      getOptionLabel={(c) => c.name || c.email}
      isOptionEqualToValue={(a, b) => a.email === b.email}
      loading={isLoading}
      noOptionsText={searching ? "No aparece. Escribe sus datos abajo." : "Escribe el nombre, el correo o la cédula"}
      blurOnSelect
      renderOption={({ key, ...props }, c) => (
        <Box component="li" key={key} {...props} sx={{ display: "block !important", py: 1 }}>
          <Typography sx={{ fontSize: 18 }}>{c.name || "Sin nombre"}</Typography>
          <Typography sx={{ fontSize: 15 }} color="text.secondary">
            {[c.source, c.email, c.phone, c.document && `CC ${c.document}`].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Buscar al comprador"
          placeholder="Nombre, correo o cédula"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <UserSearch size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
    />
  );
}
