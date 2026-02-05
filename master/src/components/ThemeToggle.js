import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { IconButton, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import '../styles/ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        onClick={toggleTheme}
        className="theme-toggle-button"
        aria-label="toggle theme"
      >
        {theme === 'dark' ? (
          <Brightness7Icon className="theme-icon" />
        ) : (
          <Brightness4Icon className="theme-icon" />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
