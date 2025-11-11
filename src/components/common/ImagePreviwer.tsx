"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";

export function useImagePreview() {
  const [open, setOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);

  const openWith = (url?: string | null) => {
    if (!url) return;
    setImgUrl(url);
    setZoom(1);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const zoomIn = () => setZoom((z) => Math.min(3, z + 0.2));
  const zoomOut = () => setZoom((z) => Math.max(0.4, z - 0.2));

  return { open, imgUrl, zoom, openWith, close, zoomIn, zoomOut };
}

export default function ImagePreviewer({
  preview,
}: {
  preview: ReturnType<typeof useImagePreview>;
}) {
  return (
    <Dialog
      open={preview.open}
      onClose={preview.close}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          backdropFilter: "blur(6px)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Campaign Image
        </Typography>
        <Box>
          <Tooltip title="Zoom out">
            <span>
              <IconButton
                onClick={preview.zoomOut}
                disabled={preview.zoom <= 0.5}
              >
                <ZoomOutIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Zoom in">
            <span>
              <IconButton onClick={preview.zoomIn} disabled={preview.zoom >= 3}>
                <ZoomInIcon />
              </IconButton>
            </span>
          </Tooltip>
          {preview.imgUrl && (
            <Tooltip title="Download">
              <IconButton
                component="a"
                href={preview.imgUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Close">
            <IconButton onClick={preview.close}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 0,
          display: "grid",
          placeItems: "center",
          bgcolor: "background.default",
        }}
      >
        {preview.imgUrl ? (
          <Box
            sx={{
              maxHeight: "80vh",
              maxWidth: "100%",
              overflow: "auto",
              p: 2,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Box
              sx={{
                transform: `scale(${preview.zoom})`,
                transformOrigin: "center center",
                transition: "transform .15s ease-out",
                display: "inline-block",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.imgUrl}
                alt="Campaign Preview"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: 12,
                  boxShadow: "0 16px 48px rgba(0,0,0,.25)",
                }}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 6 }}>
            <Typography>No image</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
