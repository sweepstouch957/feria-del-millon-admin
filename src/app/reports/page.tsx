'use client';

import * as React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

type Mode = 'week' | 'month' | 'year';
type Row = { label: string; total: number; points: number };

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genRows(mode: Mode, base: Dayjs): Row[] {
  const seed =
    base.year() * 100 +
    (mode === 'week'
      ? base.isoWeek()
      : mode === 'month'
      ? base.month() + 1
      : 0);
  const rnd = mulberry32(seed);
  if (mode === 'week') {
    return Array.from({ length: 10 }, (_, i) => ({
      label: String(i + 1),
      total: Math.round(rnd() * 50),
      points: Math.round(rnd() * 30),
    }));
  }
  if (mode === 'month') {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
    ];
    return months.map((m) => ({
      label: m,
      total: Math.round(rnd() * 200),
      points: Math.round(rnd() * 120),
    }));
  }
  const y = base.year();
  return Array.from({ length: 10 }, (_, i) => ({
    label: String(y - (9 - i)),
    total: Math.round(rnd() * 2000),
    points: Math.round(rnd() * 1200),
  }));
}

export default function ReportsPage() {
  const [mode, setMode] = React.useState<Mode>('week');
  const [cashier, setCashier] = React.useState('All');

  const [weekDate, setWeekDate] = React.useState<Dayjs | null>(dayjs());
  const [monthDate, setMonthDate] = React.useState<Dayjs | null>(dayjs());
  const [yearDate, setYearDate] = React.useState<Dayjs | null>(dayjs());

  const [rows, setRows] = React.useState<Row[]>(genRows('week', dayjs()));

  const handleSearch = () => {
    const base =
      mode === 'week'
        ? weekDate ?? dayjs()
        : mode === 'month'
        ? monthDate ?? dayjs()
        : yearDate ?? dayjs();
    setRows(genRows(mode, base));
  };

  const picker =
    mode === 'week' ? (
      <DatePicker
        label="Week"
        value={weekDate}
        onChange={(v) => setWeekDate(v)}
        views={['day']}
        format={'[Week] WW, YYYY'}
        slotProps={{ textField: { sx: { minWidth: 240 } } }}
      />
    ) : mode === 'month' ? (
      <DatePicker
        label="Month"
        value={monthDate}
        onChange={(v) => setMonthDate(v)}
        views={['year', 'month']}
        openTo="month"
        slotProps={{ textField: { sx: { minWidth: 240 } } }}
      />
    ) : (
      <DatePicker
        label="Year"
        value={yearDate}
        onChange={(v) => setYearDate(v)}
        views={['year']}
        slotProps={{ textField: { sx: { minWidth: 240 } } }}
      />
    );

  return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Cashier Report by
        </Typography>

        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'center' }}
            >
              <ToggleButtonGroup
                exclusive
                value={mode}
                onChange={(_, v) => v && setMode(v)}
                size="small"
              >
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="year">Year</ToggleButton>
              </ToggleButtonGroup>

              {picker}

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="cashier-label">Cashier</InputLabel>
                <Select
                  labelId="cashier-label"
                  label="Cashier"
                  value={cashier}
                  onChange={(e) => setCashier(String(e.target.value))}
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Alice Johnson">Alice Johnson</MenuItem>
                  <MenuItem value="Bruno Diaz">Bruno Diaz</MenuItem>
                  <MenuItem value="Carla Ruiz">Carla Ruiz</MenuItem>
                </Select>
              </FormControl>

              <Button variant="contained" onClick={handleSearch}>
                Search
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#112E51' }}>
                      {mode === 'week'
                        ? 'Day'
                        : mode === 'month'
                        ? 'Month'
                        : 'Year'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#112E51' }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#112E51' }}>
                      Points Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{r.label}</TableCell>
                      <TableCell>{r.total}</TableCell>
                      <TableCell>{r.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
  );
}
