'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  Chip,
} from '@mui/material';
import { PhotoCamera as CameraIcon } from '@mui/icons-material';
import RatingStars from '@/components/ui/RatingStars';

interface ProductivityData {
  ranking: number;
  store: string;
  address: string;
  date: string;
  workShift: string;
  upload: boolean;
  participations: number;
  rating: number;
}

interface ProductivityTableProps {
  data: ProductivityData[];
  onRowClick?: (item: ProductivityData) => void;
}

const ProductivityTable: React.FC<ProductivityTableProps> = ({ data, onRowClick }) => {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
            <TableCell sx={{ fontWeight: 600, color: '#666' }}>RANKING</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#666' }}>STORE</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#666' }}>DATE</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#666' }}>WORK SHIFT</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#666' }}>UPLOAD</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#666' }}>PARTICIPATIONS</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#666' }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.ranking}
              hover
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: '#F9F9F9',
                },
              }}
            >
              <TableCell>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#F5F5F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: '#666',
                  }}
                >
                  {row.ranking}
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {row.store}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.address}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {row.date}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={row.workShift}
                  size="small"
                  sx={{
                    backgroundColor: '#E3F2FD',
                    color: '#1976D2',
                    fontWeight: 600,
                  }}
                />
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  sx={{
                    backgroundColor: row.upload ? '#E8F5E8' : '#F5F5F5',
                    color: row.upload ? '#4CAF50' : '#999',
                    '&:hover': {
                      backgroundColor: row.upload ? '#C8E6C9' : '#EEEEEE',
                    },
                  }}
                >
                  <CameraIcon fontSize="small" />
                </IconButton>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.participations}
                </Typography>
              </TableCell>
              <TableCell>
                <RatingStars rating={row.rating} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductivityTable;

