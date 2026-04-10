import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import type { ArtworkRow } from "@hooks/useArtworksCursor";

type ManualOrderSearchTableProps = {
  search: string;
  onSearchChange: (value: string) => void;
  rows: ArtworkRow[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  selectedArtworkId?: string;
  onSelectArtwork: (row: ArtworkRow) => void;
  formatMoney: (amount?: number, currency?: string) => string;
};

export const ManualOrderSearchTable: React.FC<
  ManualOrderSearchTableProps
> = ({
  search,
  onSearchChange,
  rows,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  selectedArtworkId,
  onSelectArtwork,
  formatMoney,
}) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <TextField
        label="Buscar por slug o SKU"
        size="small"
        fullWidth
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Ej: obra-azul-01 o SKU123"
      />

      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 420,
          borderRadius: 2,
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
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
              rows.map((row) => {
                const key = (row as any).id ?? (row as any)._id;
                const rowArtistName = row.artistInfo
                  ? `${row.artistInfo.firstName ?? ""} ${
                      row.artistInfo.lastName ?? ""
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
                    onClick={() => onSelectArtwork(row)}
                    sx={{
                      cursor: "pointer",
                      backgroundColor: selected
                        ? "rgba(25, 118, 210, 0.06)"
                        : "inherit",
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={(row as any).slug}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
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
        <Box display="flex" justifyContent="center" mt={0.5}>
          <Button
            variant="outlined"
            size="small"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Cargando..." : "Cargar más"}
          </Button>
        </Box>
      )}
    </Box>
  );
};
