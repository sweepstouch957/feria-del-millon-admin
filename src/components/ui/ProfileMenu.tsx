"use client";

import * as React from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import {
  AccountCircle as AccountIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/provider/authProvider";

// Alineado al nuevo modelo de /services/authService.ts
type Roles = {
  superuser?: boolean;
  staff?: boolean;
  curador?: boolean;
  cajero?: boolean;
  artista?: boolean;
};

type AuthUser = {
  id: string;
  email: string;
  roles?: Roles;
  firstName?: string;
  lastName?: string;
  // opcional por si en el futuro lo agregas
  profileImage?: string;
};

const getInitials = (first?: string, last?: string, email?: string) => {
  const a = (first ?? "").trim();
  const b = (last ?? "").trim();
  if (a || b) return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();
  const fromEmail = (email ?? "").trim();
  return fromEmail ? fromEmail[0].toUpperCase() : "";
};

// Mapea roles verdaderos a chips bonitos y sobrios (grises)
const roleChips = (roles?: Roles) => {
  if (!roles) return [];
  const items: string[] = [];
  if (roles.superuser) items.push("Superuser");
  if (roles.staff) items.push("Staff");
  if (roles.curador) items.push("Curador/a");
  if (roles.cajero) items.push("Cajero/a");
  if (roles.artista) items.push("Artista");
  return items;
};

const ProfileMenu: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth() as unknown as {
    user?: AuthUser | null;
    logout?: () => Promise<void> | void;
  };

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleAccount = () => {
    handleClose();
    router.push("/account");
  };

  const handleLogout = async () => {
    handleClose();
    try {
      await logout?.();
    } finally {
      router.push("/login");
    }
  };

  const initials = getInitials(user?.firstName, user?.lastName, user?.email);
  const avatar = user?.profileImage ? (
    <Avatar src={user.profileImage} alt={user?.firstName || "Profile"} />
  ) : initials ? (
    <Avatar sx={{ bgcolor: "#9e9e9e", color: "#fff" }}>{initials}</Avatar>
  ) : (
    <Avatar sx={{ bgcolor: "#9e9e9e", color: "#fff" }}>
      <PersonIcon />
    </Avatar>
  );

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const chips = roleChips(user?.roles);

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: "#666" }}>
        {avatar}
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 280,
            borderRadius: 2,
            boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
          },
        }}
      >
        {/* Header de usuario */}
        {(fullName || user?.email) && (
          <Box>
            <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
              {fullName && (
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 800, color: "#424242" }}
                >
                  {fullName}
                </Typography>
              )}
              {user?.email && (
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              )}

              {chips.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1, flexWrap: "wrap" }}
                >
                  {chips.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "rgba(0,0,0,0.2)",
                        color: "#616161",
                        height: 22,
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
            <Divider sx={{ my: 1 }} />
          </Box>
        )}

        <MenuItem onClick={handleAccount}>
          <ListItemIcon>
            <AccountIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Mi cuenta" />
        </MenuItem>

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cerrar sesión" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ProfileMenu;
