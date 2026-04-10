"use client";

import React from "react";
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardContent,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type {
  UseFormRegister,
  FieldErrors,
  SubmitHandler,
} from "react-hook-form";
import type { PaymentMethod } from "@services/orders.service";
import type { ArtworkRow } from "@hooks/useArtworksCursor";
import type { CityDoc } from "@services/city.service";

export type ManualOrderFormValues = {
  qty: number;
  paymentMethod: PaymentMethod;
  buyerName: string;
  buyerEmail: string;
  notes: string;

  // NUEVOS CAMPOS DE DIRECCIÓN
  addressLine1: string;
  cityId: string;
  state: string;
  zipCode: string;
};

type ManualOrderFormProps = {
  register: UseFormRegister<ManualOrderFormValues>;
  errors: FieldErrors<ManualOrderFormValues>;
  isSubmitting: boolean;
  selectedArtwork: ArtworkRow | null;
  qty: number;
  estimatedTotal: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;

  // ciudades
  cities?: CityDoc[];
  citiesLoading: boolean;
};

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card_offline", label: "Tarjeta (datáfono / POS)" },
  { value: "whatsapp", label: "Transferencia / WhatsApp" },
];

export const ManualOrderForm: React.FC<ManualOrderFormProps> = ({
  register,
  errors,
  isSubmitting,
  selectedArtwork,
  qty,
  estimatedTotal,
  onSubmit,
  cities,
  citiesLoading,
}) => {
  const hasArtwork = Boolean(selectedArtwork);

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <CardHeader
        title="Registrar venta manual"
        sx={{
          pb: 1,
          "& .MuiCardHeader-title": {
            fontWeight: 700,
            fontSize: 16,
          },
        }}
      />
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={onSubmit}>
          {/* Cantidad + método de pago */}
          <TextField
            label="Cantidad"
            type="number"
            size="small"
            inputProps={{ min: 1 }}
            {...register("qty", {
              valueAsNumber: true,
              min: 1,
            })}
            disabled={!hasArtwork || isSubmitting}
            error={Boolean(errors.qty)}
            helperText={errors.qty?.message as string | undefined}
          />

          <TextField
            select
            label="Método de pago"
            size="small"
            {...register("paymentMethod")}
            disabled={!hasArtwork || isSubmitting}
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <Divider />

          {/* Dirección de entrega */}
          <Typography variant="subtitle2">Dirección de entrega</Typography>

          <TextField
            label="Dirección *"
            placeholder="Calle, carrera, número"
            size="small"
            fullWidth
            {...register("addressLine1", { required: "La dirección es obligatoria" })}
            disabled={isSubmitting}
            error={Boolean(errors.addressLine1)}
            helperText={errors.addressLine1?.message as string | undefined}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1.1fr 1fr 0.9fr" },
              gap: 1.5,
            }}
          >
            <TextField
              select
              label="Ciudad de entrega *"
              size="small"
              fullWidth
              {...register("cityId", { required: "Selecciona una ciudad" })}
              disabled={isSubmitting || citiesLoading}
              error={Boolean(errors.cityId)}
              helperText={
                (errors.cityId?.message as string | undefined) ||
                (citiesLoading ? "Cargando ciudades..." : undefined)
              }
            >
              {cities?.map((c) => {
                const value = (c as any).id ?? (c as any)._id ?? c.name;
                return (
                  <MenuItem key={value} value={value}>
                    {c.name}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              label="Departamento *"
              size="small"
              {...register("state", { required: "Departamento requerido" })}
              disabled={isSubmitting}
              error={Boolean(errors.state)}
              helperText={errors.state?.message as string | undefined}
            />

            <TextField
              label="Código Postal"
              size="small"
              {...register("zipCode")}
              disabled={isSubmitting}
            />
          </Box>

          <TextField
            label="Notas adicionales (opcional)"
            placeholder="Instrucciones especiales de entrega..."
            size="small"
            multiline
            minRows={2}
            {...register("notes")}
            disabled={isSubmitting}
          />

          <Divider />

          {/* Comprador opcional */}
          <Typography variant="subtitle2">
            Datos del comprador (opcional)
          </Typography>

          <TextField
            label="Nombre del comprador"
            size="small"
            {...register("buyerName")}
            disabled={isSubmitting}
          />
          <TextField
            label="Email del comprador"
            size="small"
            type="email"
            {...register("buyerEmail")}
            disabled={isSubmitting}
          />

          <Divider />

          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total estimado
              </Typography>
              <Typography variant="h6">
                {hasArtwork && qty ? estimatedTotal : "—"}
              </Typography>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!hasArtwork || isSubmitting || Number(qty) <= 0}
            >
              {isSubmitting
                ? "Registrando venta..."
                : "Registrar venta como pagada"}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
