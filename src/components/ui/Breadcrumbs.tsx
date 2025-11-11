'use client';

import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          if (isLast || !item.href) {
            return (
              <Typography
                key={index}
                color={isLast ? 'text.primary' : 'text.secondary'}
                sx={{ fontSize: '0.875rem' }}
              >
                {item.label}
              </Typography>
            );
          }
          
          return (
            <Link
              key={index}
              underline="hover"
              color="text.secondary"
              href={item.href}
              sx={{ fontSize: '0.875rem' }}
            >
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;

