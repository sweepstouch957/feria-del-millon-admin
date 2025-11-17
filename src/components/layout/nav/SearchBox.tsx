"use client";

import { Box, InputBase, alpha } from "@mui/material";

type Props = {
  placeholder: string;
};

import { Search as SearchIcon } from "@mui/icons-material";

const SearchBox = ({ placeholder }: Props) => (
  <Box
    sx={{
      position: "relative",
      borderRadius: 999,
      backgroundColor: alpha("#000", 0.04),
      "&:hover": { backgroundColor: alpha("#000", 0.06) },
      width: "100%",
      maxWidth: 460,
      border: "1px solid rgba(0,0,0,0.06)",
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
      <SearchIcon sx={{ color: "#9e9e9e" }} />
    </Box>
    <InputBase
      placeholder={placeholder}
      sx={{
        width: "100%",
        "& .MuiInputBase-input": { padding: "10px 14px 10px 40px" },
      }}
    />
  </Box>
);

export default SearchBox;
