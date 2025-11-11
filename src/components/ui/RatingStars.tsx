'use client';

import React from 'react';
import { Box } from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 'medium',
  color = '#E91E63',
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return '1rem';
      case 'large':
        return '1.5rem';
      default:
        return '1.2rem';
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      stars.push(
        <StarIcon
          key={i}
          sx={{
            color: i <= rating ? color : '#E0E0E0',
            fontSize: getSizeValue(),
          }}
        />
      );
    }
    return stars;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      {renderStars()}
    </Box>
  );
};

export default RatingStars;

