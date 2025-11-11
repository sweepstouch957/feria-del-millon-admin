'use client';

import React from 'react';
import {
  Box,
  Avatar,
  Typography,
  Button,
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';

interface UserProfileProps {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  rating?: number;
  avatarUrl?: string;
  showContact?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({
  name,
  email,
  phone,
  role = 'Promotor',
  rating = 0,
  avatarUrl,
  showContact = true,
}) => {
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon
          key={i}
          sx={{
            color: i <= rating ? '#E91E63' : '#E0E0E0',
            fontSize: '1.2rem',
          }}
        />
      );
    }
    return stars;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        backgroundColor: 'white',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <Avatar
        src={avatarUrl}
        sx={{
          width: 64,
          height: 64,
          backgroundColor: '#E91E63',
          fontSize: '1.5rem',
          fontWeight: 'bold',
        }}
      >
        {!avatarUrl && getInitials(name)}
      </Avatar>
      
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {renderStars(rating)}
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {role}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          {email} {phone && `/ ${phone}`}
        </Typography>
      </Box>
      
      {showContact && (
        <Box
          sx={{
            background: 'linear-gradient(45deg, #E91E63, #F48FB1)',
            borderRadius: '50%',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'transparent',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: 'none',
              },
              minWidth: 'auto',
              p: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
              Contact
            </Typography>
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default UserProfile;

