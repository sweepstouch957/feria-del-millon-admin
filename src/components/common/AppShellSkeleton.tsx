"use client";

import {
  AppBar,
  Toolbar,
  Box,
  Skeleton,
  IconButton,
  Container,
  Paper,
  Grid,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import React from "react";

export default function AppShellSkeleton() {
  return (
    <Box
      sx={{ minHeight: "100vh", bgcolor: (t) => t.palette.background.default }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton edge="start">
            <MenuIcon />
          </IconButton>
          <Skeleton variant="text" width={180} height={28} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="rounded" width={220} height={36} />
          <Skeleton variant="circular" width={36} height={36} />
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 3 }}>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="text" width="40%" height={24} />
                <Skeleton variant="rounded" height={60} sx={{ mt: 1 }} />
              </Paper>
            </Grid>
          ))}

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Skeleton variant="text" width="30%" height={28} />
              <Skeleton variant="rounded" height={320} sx={{ mt: 2 }} />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
