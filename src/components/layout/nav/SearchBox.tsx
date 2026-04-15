"use client";

import { Box, InputBase } from "@mui/material";
import { useTheme } from "@mui/material/styles";

type Props = {
  placeholder: string;
};

import { Search as SearchIcon } from "@mui/icons-material";

const SearchBox = ({ placeholder }: Props) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 999,
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
        "&:hover": {
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
        width: "100%",
        maxWidth: 460,
        border: isDark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.06)",
        transition: "all 0.3s ease",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          height: "100%",
          position: "absolute",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SearchIcon sx={{ color: isDark ? "#71717a" : "#9e9e9e" }} />
      </Box>
      <InputBase
        placeholder={placeholder}
        sx={{
          width: "100%",
          color: isDark ? "#fafafa" : "inherit",
          "& .MuiInputBase-input": {
            padding: "10px 14px 10px 40px",
            "&::placeholder": {
              color: isDark ? "#71717a" : "#9e9e9e",
              opacity: 1,
            },
          },
        }}
      />
    </Box>
  );
};

export default SearchBox;
