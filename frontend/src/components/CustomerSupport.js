import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Badge
} from '@mui/material';
import {
  Support as SupportIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import LiveChat from './LiveChat';

const CustomerSupport = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleOpen = () => {
    setOpen(true);
    setUnreadCount(0); // Clear unread count when opening
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Floating Action Button for Support */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={handleOpen}
      >
        <Badge badgeContent={unreadCount} color="error">
          <SupportIcon />
        </Badge>
      </Fab>

      {/* Support Chat Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '700px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Customer Support</Typography>
          <Button onClick={handleClose} startIcon={<CloseIcon />}>
            Close
          </Button>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, height: '100%' }}>
          <LiveChat user={user} onClose={handleClose} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerSupport;