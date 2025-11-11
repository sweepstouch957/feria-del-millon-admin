"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  CardActionArea,
} from "@mui/material";
import { useRouter } from "next/navigation";

const StatCard: React.FC<{
  title: string;
  value?: number | string;
  loading?: boolean;
  gradient: string;
  icon: React.ReactNode;
  link?: string;
}> = ({ title, value, loading, gradient, icon, link }) => {
  const router = useRouter();

  const handleClick = () => {    
    if (link) router.push(link);
  };

  return (
    <Card
      sx={{
        background: gradient,
        color: "white",
        height: 100,
        display: "flex",
        alignItems: "center",
        borderRadius: 2,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        cursor: link ? "pointer" : "default",
      }}
      // soporte click en toda la tarjeta
      onClick={handleClick}
    >
      <CardActionArea
        component="div"
        disableRipple={!link}
        sx={{ height: "100%", width: "100%" }}
        role={link ? "link" : undefined}
        tabIndex={link ? 0 : -1}
        onKeyDown={(e) => {
          if (!link) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(link);
          }
        }}
      >
        <CardContent
          sx={{ flex: 1, display: "flex", alignItems: "center", gap: 2 }}
        >
          <Box>{icon}</Box>
          <Box>
            {loading ? (
              <Skeleton
                variant="text"
                width={60}
                height={42}
                sx={{ bgcolor: "rgba(255,255,255,0.3)" }}
              />
            ) : (
              <Typography
                variant="h4"
                component="div"
                sx={{ fontWeight: "bold" }}
              >
                {value ?? 0}
              </Typography>
            )}
            <Typography variant="body1">{title}</Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default StatCard;
