import { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Avatar, Menu, MenuItem,
  Drawer, List, ListItemButton, ListItemText, IconButton,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

import type { User } from '../api';
import { signOut } from '../api';

const DRAWER_WIDTH = 240;

const projects = ['Project Alpha', 'Project Beta', 'Project Gamma'];

export const EntryPage = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const initials = `${user.given_name[0]}${user.family_name[0]}`.toUpperCase();

  const handleLogout = async () => {
    setAnchorEl(null);
    try { await signOut(); } catch { /* ignore */ }
    onLogout();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Top bar — full width, above everything */}
      <AppBar position="fixed" color="default" elevation={1} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton edge="start" sx={{ mr: 2 }} onClick={() => setDrawerOpen((o) => !o)}>
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Dashboard</Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled>{user.email}</MenuItem>
            <MenuItem onClick={handleLogout}>Log out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar — starts below the AppBar */}
      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar /> {/* spacer to push content below the AppBar */}
        <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, py: 1 }}>
          Projects
        </Typography>
        <List disablePadding>
          {projects.map((name) => (
            <ListItemButton key={name}>
              <ListItemText primary={name} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Toolbar /> {/* spacer */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h3">HELLO WORLD</Typography>
        </Box>
      </Box>
    </Box>
  );
};
