    "use client";

    import { useMemo, useState } from "react";
    import {
        Box,
        Button,
        Card,
        CardContent,
        CardHeader,
        Grid,
        Paper,
        Stack,
        Table,
        TableBody,
        TableCell,
        TableContainer,
        TableHead,
        TableRow,
        TextField,
        Typography,
    } from "@mui/material";
    import { useForm } from "react-hook-form";
    import { toast } from "sonner";
    import { useTranslation } from "react-i18next";

    import {
        createOrder,
        markOrderPaid,
        type OrderItemInput,
        type BuyerInput,
        type OrderDoc,
    } from "@services/orders.service";

    import {
        useArtworksCursor,
        type ArtworkRow,
    } from "@hooks/useArtworksCursor";
    import { useArtworkDetail } from "@hooks/useArtworkDetail";
    import { useCities } from "@hooks/useCities";

    import { ManualOrderDetail } from "./ManualOrderDetail";
    import {
        ManualOrderForm,
        type ManualOrderFormValues,
    } from "./ManualOrderForm";

    import { useAuth } from "@/provider/authProvider";
    import { DEFAULT_EVENT_ID } from "@/core/constants";

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

        // ciudades
        const { data: cities, isLoading: citiesLoading } = useCities();

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
            formState: { isSubmitting, errors },
        } = useForm<ManualOrderFormValues>({
            defaultValues: {
                qty: 1,
                paymentMethod: "cash",
                buyerName: "",
                buyerEmail: "",
                notes: "",
                addressLine1: "",
                cityId: "",
                state: "",
                zipCode: "",
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

        const estimatedTotal = useMemo(() => {
            if (!selectedArtwork || !qty) return "—";
            const price = (selectedArtwork as any).price as number | undefined;
            const currency =
                (selectedArtwork as any).currency?.toString() ?? "COP";
            if (!price) return "—";
            const total = Number(price) * Number(qty);
            return formatMoney(total, currency);
        }, [selectedArtwork, qty]);

        const onSubmit = async (values: ManualOrderFormValues) => {
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

                const selectedCity = cities?.find(
                    (c) =>
                        (c as any).id === values.cityId ||
                        (c as any)._id === values.cityId
                );

                console.log(selectedCity);
                
                const buyer: BuyerInput = {
                    name: buyerName,
                    email: buyerEmail,
                    phone: undefined,
                    address: {
                        line1: values.addressLine1,
                        city: selectedCity?._id ?? "0",
                        state: values.state || (selectedCity as any)?.state,
                        zip: values.zipCode || (selectedCity as any)?.zipCode,
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
                        deliveryAddress: buyer.address,
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
                                                rows.map((row:any) => {
                                                    const key = (row as any).id ?? (row as any)._id;
                                                    const rowArtistName = row.artistInfo
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
                                                            <TableCell>{rowArtistName}</TableCell>
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

                    {/* DERECHA: detalle + formulario */}
                    <Grid 
                        size={{
                            xs: 12,
                            md: 5,
                        }}
                    >
                        <Stack spacing={2}>
                            <ManualOrderDetail
                                selectedArtwork={selectedArtwork}
                                artworkDetail={artworkDetail}
                                formatMoney={formatMoney}
                            />

                            <ManualOrderForm
                                register={register}
                                errors={errors}
                                isSubmitting={isSubmitting}
                                selectedArtwork={selectedArtwork}
                                qty={qty}
                                estimatedTotal={estimatedTotal}
                                onSubmit={handleSubmit(onSubmit)}
                                cities={cities}
                                citiesLoading={citiesLoading}
                            />
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
        );
    };

    export default ManualOrderPage;
