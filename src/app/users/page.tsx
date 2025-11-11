/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  Tooltip,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Filter as FilterIcon,
  Pencil as PencilIcon,
  Eye as EyeIcon,
  Save as SaveIcon,
  X as XIcon,
  RefreshCcw as RefreshIcon,
  Users as UsersIcon,
} from "lucide-react";

// ⬇️ ajusta esta ruta a donde dejaste tus hooks (yo asumí "@/hooks/useUsers")
import { useUsers, useDebouncedValue } from "@/hooks/useAuth";
import {
  getUserById,
  updateUser,
  type UsersSearchParams,
  type UserDTO,
  type Roles as RolesMap,
} from "@services/user.service";

const ROLE_OPTIONS: Array<{
  key: keyof RolesMap;
  label: string;
  color: "default" | "primary" | "success" | "warning" | "info" | "error";
}> = [
  { key: "superuser", label: "Superuser", color: "error" },
  { key: "staff", label: "Staff", color: "info" },
  { key: "curador", label: "Curador", color: "primary" },
  { key: "cajero", label: "Cajero", color: "warning" },
  { key: "artista", label: "Artista", color: "success" },
];

function roleChips(roles?: RolesMap) {
  const r = roles || {};
  const active = ROLE_OPTIONS.filter((opt) => r[opt.key]);
  if (!active.length) return <Typography variant="body2">—</Typography>;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {active.map((opt) => (
        <Chip
          key={opt.key}
          size="small"
          label={opt.label}
          color={opt.color}
          variant="outlined"
        />
      ))}
    </Stack>
  );
}

export default function UsersPage() {
  // ---------- Filtros ----------
  const [q, setQ] = React.useState("");
  const [city, setCity] = React.useState("");
  const [roles, setRoles] = React.useState<string[]>([]);
  const [active, setActive] = React.useState<string>(""); // "", "true", "false"
  const [sortBy, setSortBy] = React.useState("createdAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [pagination, setPagination] = React.useState<GridPaginationModel>({
    page: 0, // DataGrid usa 0-based
    pageSize: 20,
  });

  const debouncedQ = useDebouncedValue(q, 350);
  const debouncedCity = useDebouncedValue(city, 350);

  const params: UsersSearchParams = {
    q: debouncedQ || undefined,
    city: debouncedCity || undefined,
    roles: roles.length ? (roles as any) : undefined,
    active: active === "" ? undefined : active === "true",
    page: pagination.page + 1, // backend 1-based
    limit: pagination.pageSize,
    sortBy,
    sortDir,
    fields: [
      "email",
      "firstName",
      "lastName",
      "city",
      "mobile",
      "roles",
      "active",
      "createdAt",
      "lastLoginAt",
    ],
  };

  const { data, isLoading, isFetching, refetch } = useUsers(params);

  // ---------- Modal Ver/Editar ----------
  const [open, setOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"view" | "edit">("view");
  const [currentId, setCurrentId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<UserDTO>>({});
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{
    open: boolean;
    msg: string;
    severity: "success" | "error" | "info";
  }>({ open: false, msg: "", severity: "success" });

  const handleOpen = async (id: string, mode: "view" | "edit" = "view") => {
    setViewMode(mode);
    setCurrentId(id);
    try {
      const user = await getUserById(id);
      setForm({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        city: user.city,
        address: user.address,
        instagram: user.instagram,
        facebook: user.facebook,
        website: user.website,
        roles: user.roles || {},
        active: user.active,
      });
      setOpen(true);
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.message || "No se pudo cargar el usuario",
        severity: "error",
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentId(null);
    setForm({});
  };

  const toggleRole = (key: keyof RolesMap) => {
    setForm((prev: { roles: any; }) => {
      const nextRoles = { ...(prev.roles || {}) };
      nextRoles[key] = !nextRoles[key];
      return { ...prev, roles: nextRoles };
    });
  };

  const handleSave = async () => {
    if (!currentId) return;
    setSaving(true);
    try {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        mobile: form.mobile,
        city: form.city,
        address: form.address,
        instagram: form.instagram,
        facebook: form.facebook,
        website: form.website,
        roles: form.roles,
        active: form.active,
      };
      await updateUser(currentId, payload);
      setToast({ open: true, msg: "Usuario actualizado", severity: "success" });
      setOpen(false);
      refetch();
    } catch (e: any) {
      setToast({
        open: true,
        msg: e?.message || "Error al actualizar",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Tabla ----------
  const columns : any= React.useMemo<GridColDef<UserDTO>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 180,
        // renderCell es robusto; evita 'params.row' undefined
        renderCell: (p: GridRenderCellParams<UserDTO>) => {
          const fn = p?.row?.firstName || "";
          const ln = p?.row?.lastName || "";
          const full = `${fn} ${ln}`.trim();
          return full || "—";
        },
        sortComparator: (_a, _b, p1:any, p2:any) => {
          const a = `${p1?.row?.firstName || ""} ${p1?.row?.lastName || ""}`
            .trim()
            .toLowerCase();
          const b = `${p2?.row?.firstName || ""} ${p2?.row?.lastName || ""}`
            .trim()
            .toLowerCase();
          return a.localeCompare(b);
        },
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1,
        minWidth: 220,
        renderCell: (p) => p?.row?.email || "—",
      },
      {
        field: "city",
        headerName: "Ciudad",
        width: 140,
        renderCell: (p) => p?.row?.city || "—",
      },
      {
        field: "mobile",
        headerName: "Móvil",
        width: 140,
        renderCell: (p) => p?.row?.mobile || "—",
      },
      {
        field: "roles",
        headerName: "Roles",
        flex: 1,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<UserDTO, any>) =>
          roleChips(params?.row?.roles),
        sortable: false,
      },
      {
        field: "active",
        headerName: "Activo",
        width: 110,
        renderCell: (p) =>
          p?.row?.active ? (
            <Chip color="success" size="small" label="Sí" />
          ) : (
            <Chip color="default" size="small" label="No" />
          ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 140,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Ver">
              <IconButton
                size="small"
                onClick={() =>
                  handleOpen(p?.row?.id || (p?.row as any)?._id, "view")
                }
              >
                <EyeIcon size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() =>
                  handleOpen(p?.row?.id || (p?.row as any)?._id, "edit")
                }
              >
                <PencilIcon size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    []
  );

  const rows = React.useMemo(
    () =>
      (data?.users ?? []).map((u: { id: any; }) => ({
        ...u,
        id: u.id ?? (u as any)?._id, // redundante por si acaso
      })),
    [data?.users]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(0,0,0,.15)" }}>
        <CardHeader
          avatar={<UsersIcon size={28} />}
          title={<Typography variant="h6">Usuarios</Typography>}
          subheader={
            <Typography variant="body2" color="text.secondary">
              Gestión de usuarios, filtros avanzados y edición rápida
            </Typography>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refrescar">
                <IconButton onClick={() => refetch()}>
                  <RefreshIcon size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            {/* Filtros */}
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
            >
              <TextField
                size="small"
                label="Buscar"
                placeholder="Nombre, email o móvil"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPagination((p) => ({ ...p, page: 0 }));
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260 }}
              />
              <TextField
                size="small"
                label="Ciudad"
                placeholder="Ej: Bogotá"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPagination((p) => ({ ...p, page: 0 }));
                }}
                sx={{ minWidth: 180 }}
              />
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="roles-label">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FilterIcon size={16} />
                    <span>Roles</span>
                  </Stack>
                </InputLabel>
                <Select
                  labelId="roles-label"
                  multiple
                  value={roles}
                  label="Roles"
                  onChange={(e) => {
                    const val = e.target.value as string[];
                    setRoles(val);
                    setPagination((p) => ({ ...p, page: 0 }));
                  }}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {(selected as string[]).map((r) => (
                        <Chip key={r} size="small" label={r} />
                      ))}
                    </Stack>
                  )}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <MenuItem key={r.key} value={r.key}>
                      <Chip
                        size="small"
                        label={r.label}
                        color={r.color}
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="active-label">Activo</InputLabel>
                <Select
                  labelId="active-label"
                  value={active}
                  label="Activo"
                  onChange={(e) => {
                    setActive(e.target.value);
                    setPagination((p) => ({ ...p, page: 0 }));
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="true">Sí</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="sortBy-label">Ordenar por</InputLabel>
                <Select
                  labelId="sortBy-label"
                  value={sortBy}
                  label="Ordenar por"
                  onChange={(e) => setSortBy(String(e.target.value))}
                >
                  <MenuItem value="createdAt">Creado</MenuItem>
                  <MenuItem value="updatedAt">Actualizado</MenuItem>
                  <MenuItem value="firstName">Nombre</MenuItem>
                  <MenuItem value="lastName">Apellido</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="city">Ciudad</MenuItem>
                  <MenuItem value="lastLoginAt">Último login</MenuItem>
                  <MenuItem value="registeredAt">Registro</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="sortDir-label">Dirección</InputLabel>
                <Select
                  labelId="sortDir-label"
                  value={sortDir}
                  label="Dirección"
                  onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                >
                  <MenuItem value="desc">Desc</MenuItem>
                  <MenuItem value="asc">Asc</MenuItem>
                </Select>
              </FormControl>

              <Box flex={1} />

              <Button
                variant="outlined"
                startIcon={<RefreshIcon size={16} />}
                onClick={() => refetch()}
              >
                Actualizar
              </Button>
            </Stack>

            {/* Tabla */}
            <Box sx={{ position: "relative" }}>
              {isFetching && (
                <LinearProgress
                  sx={{ position: "absolute", top: -10, left: 0, right: 0 }}
                />
              )}
              <div style={{ width: "100%" }}>
                <DataGrid
                  autoHeight
                  density="compact"
                  disableRowSelectionOnClick
                  rows={rows}
                  columns={columns}
                  getRowId={(row) => row.id || (row as any)?._id}
                  rowCount={data?.total ?? 0}
                  paginationMode="server"
                  paginationModel={pagination}
                  onPaginationModelChange={(model) => setPagination(model)}
                  pageSizeOptions={[10, 20, 50, 100]}
                  loading={isLoading}
                  sx={{
                    borderRadius: 2,
                    "& .MuiDataGrid-columnHeaders": { fontWeight: 700 },
                    "& .MuiDataGrid-row:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                />
              </div>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Modal Ver/Editar */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewMode === "edit" ? "Editar usuario" : "Detalle de usuario"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Nombre"
                value={form.firstName ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, firstName: e.target.value }))
                }
                fullWidth
                disabled={viewMode === "view"}
              />
              <TextField
                label="Apellido"
                value={form.lastName ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, lastName: e.target.value }))
                }
                fullWidth
                disabled={viewMode === "view"}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Email"
                value={form.email ?? ""}
                fullWidth
                disabled
              />
              <TextField
                label="Móvil"
                value={form.mobile ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, mobile: e.target.value }))
                }
                fullWidth
                disabled={viewMode === "view"}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Ciudad"
                value={form.city ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, city: e.target.value }))
                }
                fullWidth
                disabled={viewMode === "view"}
              />
              <TextField
                label="Dirección"
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, address: e.target.value }))
                }
                fullWidth
                disabled={viewMode === "view"}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Instagram"
                value={form.instagram ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, instagram: e.target.value }))
                }
                fullWidth
                disabled={viewMode === "view"}
              />
              <TextField
                label="Facebook"
                value={form.facebook ?? ""}
                onChange={(e) =>
                  setForm((f: any) => ({ ...f, facebook: e.target.value }))
                }
                fullWidth
                disabled={viewMode === "view"}
              />
            </Stack>

            <TextField
              label="Website"
              value={form.website ?? ""}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, website: e.target.value }))
              }
              fullWidth
              disabled={viewMode === "view"}
            />

            <Divider />

            <Typography variant="subtitle2">Roles</Typography>
            <FormGroup row>
              {ROLE_OPTIONS.map((r) => (
                <FormControlLabel
                  key={r.key}
                  control={
                    <Checkbox
                      checked={Boolean(form.roles?.[r.key])}
                      onChange={() => toggleRole(r.key)}
                      disabled={viewMode === "view"}
                    />
                  }
                  label={r.label}
                />
              ))}
            </FormGroup>

            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(form.active)}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, active: e.target.checked }))
                  }
                  disabled={viewMode === "view"}
                />
              }
              label="Activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          {viewMode === "edit" ? (
            <>
              <Button
                startIcon={<SaveIcon size={16} />}
                onClick={handleSave}
                disabled={saving}
                variant="contained"
              >
                Guardar
              </Button>
              <Button startIcon={<XIcon size={16} />} onClick={handleClose}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                startIcon={<PencilIcon size={16} />}
                onClick={() => setViewMode("edit")}
                variant="contained"
              >
                Editar
              </Button>
              <Button startIcon={<XIcon size={16} />} onClick={handleClose}>
                Cerrar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
