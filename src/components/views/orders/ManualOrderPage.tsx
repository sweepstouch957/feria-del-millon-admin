        "use client";

        import { useMemo, useState } from "react";
        import {
            Box,
            Button,
            Card,
            CardContent,
            CardHeader,
            Divider,
            Grid,
            MenuItem,
            Stack,
            TextField,
            Typography,
            Table,
            TableBody,
            TableCell,
            TableContainer,
            TableHead,
            TableRow,
            Paper,
        } from "@mui/material";
        import { useForm, type SubmitHandler } from "react-hook-form";
        import { toast } from "sonner";
        import { useTranslation } from "react-i18next";

        import {
            createOrder,
            markOrderPaid,
            type PaymentMethod,
            type OrderItemInput,
            type BuyerInput,
            type OrderDoc,
        } from "@services/orders.service";

        import {
            useArtworksCursor,
            type ArtworkRow,
        } from "@hooks/useArtworksCursor";
        import { useArtworkDetail } from "@hooks/useArtworkDetail";

        import { useAuth } from "@/provider/authProvider";
        import { DEFAULT_EVENT_ID } from "@/core/constants";

        type ManualOrderFormValues = {
            qty: number;
            paymentMethod: PaymentMethod;
            buyerName: string;
            buyerEmail: string;
            notes: string;
        };

        const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
            { value: "cash", label: "Efectivo" },
            { value: "card_offline", label: "Tarjeta (datáfono / POS)" },
            { value: "whatsapp", label: "Transferencia / WhatsApp" },
        ];

        const ManualOrderPage = () => {
            const { t } = useTranslation();
            const { user } = useAuth();

            const [search, setSearch] = useState("");
            const [selectedArtwork, setSelectedArtwork] = useState<ArtworkRow | null>(
                null
            );

            // 🔎 Lista de obras (busca por slug / sku / nombre según backend)
            const {
                rows,
                isLoading,
                hasNextPage,
                loadMore,
                isFetchingNextPage,
            } = useArtworksCursor({
                q: search || undefined,
                event: DEFAULT_EVENT_ID,
                limit: 25,
            });

            // Detalle de obra seleccionada
            const selectedArtworkId = useMemo(
                () => (selectedArtwork as any)?.id ?? (selectedArtwork as any)?._id,
                [selectedArtwork]
            );

            const { data: artworkDetail } = useArtworkDetail(
                selectedArtworkId as string | undefined
            );

            const {
                register,
                handleSubmit,
                setValue,
                watch,
                formState: { isSubmitting },
            } = useForm<ManualOrderFormValues>({
                defaultValues: {
                    qty: 1,
                    paymentMethod: "cash",
                    buyerName: "",
                    buyerEmail: "",
                    notes: "",
                },
            });

            const qty = watch("qty");

            const formatMoney = (amount?: number, currency: string = "COP") => {
                if (typeof amount !== "number") return "";
                return new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 0,
                }).format(amount);
            };

            const handleSelectArtwork = (row: ArtworkRow) => {
                setSelectedArtwork(row);
                setValue("qty", 1);
            };

            const onSubmit: SubmitHandler<ManualOrderFormValues> = async (values) => {
                try {
                    if (!selectedArtwork) {
                        toast.error("Selecciona una obra antes de registrar la venta.");
                        return;
                    }

                    const row = selectedArtwork as ArtworkRow & {
                        id?: string;
                        _id?: string;
                        price?: number;
                        currency?: string;
                        artistId?: string;
                    };

                    const price = row.price ?? 0;
                    const currency = row.currency ?? "COP";

                    if (!price) {
                        toast.error("La obra seleccionada no tiene precio configurado.");
                        return;
                    }

                    const qtyNumber = Number(values.qty || 0);
                    if (!qtyNumber || qtyNumber <= 0) {
                        toast.error("La cantidad debe ser mayor a 0.");
                        return;
                    }

                    const artworkId = row.id ?? row._id;
                    const artistId = row.artistId ?? row.artistInfo?._id ?? "";

                    if (!artworkId || !artistId) {
                        toast.error("No se pudo resolver el ID de la obra o del artista.");
                        return;
                    }

                    const item: OrderItemInput = {
                        artworkId,
                        artistId,
                        qty: qtyNumber,
                        unitPrice: price,
                        currency,
                    };

                    const buyerName =
                        values.buyerName?.trim() || "Venta mostrador Feria del Millón";
                    const buyerEmail =
                        values.buyerEmail?.trim() || "pos@feriadelmillon.com";

                    const buyer: BuyerInput = {
                        name: buyerName,
                        email: buyerEmail,
                        phone: undefined,
                        address: {
                            line1: "Venta presencial",
                            city: "Bogotá",
                            country: "CO",
                        },
                    };

                    // 1) Crear orden
                    const order: OrderDoc = await createOrder({
                        event: DEFAULT_EVENT_ID,
                        items: [item],
                        buyer,
                        userId: user?.id,
                    });

                    // 2) Marcar como pagada (manual)
                    await markOrderPaid(order.id, {
                        method: values.paymentMethod,
                        amount: order.total,
                        details: {
                            cashierId: user?.id,
                            notes: values.notes,
                        },
                        invoice: {
                            channel: "event_pos",
                            issuedBy:
                                `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
                                user?.email ||
                                "Cajero",
                        },
                    });

                    toast.success("Venta registrada como pagada ✨");
                } catch (err: any) {
                    console.error(err);
                    toast.error(
                        err?.response?.data?.message ??
                        "Error al registrar la venta manual. Revisa los datos."
                    );
                }
            };

            return (
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="h5" fontWeight={800} mb={1}>
                        Venta manual / POS
                    </Typography>

                    <Grid container spacing={2}>
                        {/* IZQUIERDA: búsqueda + tabla */}
                        <Grid 
                            size={{
                                xs: 12,
                                md: 7,
                            }}
                        >
                            <Card
                                sx={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <CardHeader
                                    title="Buscar obra"
                                    subheader="Busca por slug, SKU o nombre de la obra"
                                />
                                <CardContent
                                    sx={{
                                        pt: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                    }}
                                >
                                    <TextField
                                        label="Buscar por slug o SKU"
                                        size="small"
                                        fullWidth
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Ej: obra-azul-01 o SKU123"
                                    />

                                    <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Slug</TableCell>
                                                    <TableCell>SKU</TableCell>
                                                    <TableCell>Título</TableCell>
                                                    <TableCell>Artista</TableCell>
                                                    <TableCell align="right">Precio</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {isLoading && rows.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} align="center">
                                                            Cargando obras...
                                                        </TableCell>
                                                    </TableRow>
                                                )}

                                                {!isLoading &&
                                                    rows.map((row: any) => {
                                                        const key = (row as any).id ?? (row as any)._id;
                                                        const artistName = row.artistInfo
                                                            ? `${row.artistInfo.firstName ?? ""} ${row.artistInfo.lastName ?? ""
                                                                }`.trim()
                                                            : "";
                                                        const selected =
                                                            key &&
                                                            selectedArtworkId &&
                                                            String(key) === String(selectedArtworkId);

                                                        return (
                                                            <TableRow
                                                                key={key}
                                                                hover
                                                                onClick={() => handleSelectArtwork(row)}
                                                                sx={{
                                                                    cursor: "pointer",
                                                                    backgroundColor: selected
                                                                        ? "rgba(0,0,0,0.04)"
                                                                        : "inherit",
                                                                }}
                                                            >
                                                                <TableCell>{(row as any).slug}</TableCell>
                                                                <TableCell>{(row as any).sku}</TableCell>
                                                                <TableCell>{row.title}</TableCell>
                                                                <TableCell>{artistName}</TableCell>
                                                                <TableCell align="right">
                                                                    {formatMoney(row.price, row.currency)}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}

                                                {!isLoading && rows.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} align="center">
                                                            No se encontraron obras.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {hasNextPage && (
                                        <Box display="flex" justifyContent="center" mt={1}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={loadMore}
                                                disabled={isFetchingNextPage}
                                            >
                                                {isFetchingNextPage ? "Cargando..." : "Cargar más"}
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* DERECHA: detalle de obra + formulario de venta */}
                        <Grid
                            size={{
                                xs: 12,
                                md: 5,
                            }}
                        >
                            <Stack spacing={2}>
                                {/* Detalle de la obra */}
                                <Card>
                                    <CardHeader
                                        title={
                                            selectedArtwork ? "Detalle de la obra" : "Selecciona una obra"
                                        }
                                    />
                                    <CardContent>
                                        {selectedArtwork && artworkDetail ? (
                                            <Stack spacing={1.5}>
                                                <Typography variant="subtitle1" fontWeight={700}>
                                                    {artworkDetail.artwork.title}
                                                </Typography>

                                                <Typography variant="body2" color="text.secondary">
                                                    {artworkDetail.artist
                                                        ? `${artworkDetail.artist.firstName ?? ""} ${artworkDetail.artist.lastName ?? ""
                                                            }`.trim()
                                                        : ""}
                                                </Typography>

                                                {artworkDetail.technique?.name && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        {`Técnica: ${artworkDetail.technique.name}`}
                                                    </Typography>
                                                )}

                                                {artworkDetail.pavilion?.name && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        {`Pabellón: ${artworkDetail.pavilion.name}`}
                                                    </Typography>
                                                )}

                                                <Typography variant="h6" mt={1}>
                                                    {(() => {
                                                        const price = artworkDetail.artwork.price;
                                                        const currency =
                                                            artworkDetail.artwork.currency ?? "COP";
                                                        if (!price) return "Precio no definido";
                                                        return formatMoney(price, currency);
                                                    })()}
                                                </Typography>

                                                {artworkDetail.artwork.description && (
                                                    <Typography variant="body2" mt={1}>
                                                        {artworkDetail.artwork.description}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                No hay obra seleccionada. Elige una de la tabla de la
                                                izquierda para ver el detalle.
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Formulario de venta manual */}
                                <Card>
                                    <CardHeader title="Registrar venta manual" />
                                    <CardContent>
                                        <Stack
                                            component="form"
                                            spacing={2}
                                            onSubmit={handleSubmit(onSubmit)}
                                        >
                                            <TextField
                                                label="Cantidad"
                                                type="number"
                                                size="small"
                                                inputProps={{ min: 1 }}
                                                {...register("qty", {
                                                    valueAsNumber: true,
                                                    min: 1,
                                                })}
                                                disabled={!selectedArtwork || isSubmitting}
                                            />

                                            <TextField
                                                select
                                                label="Método de pago"
                                                size="small"
                                                {...register("paymentMethod")}
                                                disabled={!selectedArtwork || isSubmitting}
                                            >
                                                {PAYMENT_OPTIONS.map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            <Divider />

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

                                            <TextField
                                                label="Notas internas"
                                                size="small"
                                                multiline
                                                minRows={2}
                                                {...register("notes")}
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
                                                        {(() => {
                                                            if (!selectedArtwork) return "—";
                                                            const row = selectedArtwork as ArtworkRow & {
                                                                price?: number;
                                                                currency?: string;
                                                            };
                                                            const price = row.price;
                                                            const currency = row.currency ?? "COP";
                                                            if (!price || !qty) return "—";
                                                            const total = Number(price) * Number(qty);
                                                            return formatMoney(total, currency);
                                                        })()}
                                                    </Typography>
                                                </Box>

                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    color="primary"
                                                    disabled={
                                                        !selectedArtwork || isSubmitting || Number(qty) <= 0
                                                    }
                                                >
                                                    {isSubmitting
                                                        ? "Registrando venta..."
                                                        : "Registrar venta como pagada"}
                                                </Button>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            );
        };

        export default ManualOrderPage;
