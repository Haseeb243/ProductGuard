import React, { useState } from "react";
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
  Badge,
} from "@mui/material";
import {
  Close as CloseIcon,
  ChatBubbleOutline as ChatIcon,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import LiveChat from "./LiveChat";

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
      <Tooltip title="Chat" arrow placement="left">
        <Fab
          color="primary"
          aria-label="Open chat"
          className="!bg-gradient-to-tr from-sky-500 to-indigo-500 !shadow-2xl hover:from-sky-400 hover:to-indigo-400"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000,
            borderRadius: "14px",
          }}
          onClick={handleOpen}
        >
          <Badge badgeContent={unreadCount} color="error">
            <ChatIcon />
          </Badge>
        </Fab>
      </Tooltip>

      {/* Support Chat Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            maxHeight: "700px",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.15)",
            backgroundColor: "rgba(17,25,40,0.85)",
            backgroundImage:
              "linear-gradient(145deg, rgba(56,189,248,0.08), rgba(99,102,241,0.08))",
            backdropFilter: "blur(20px)",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(90deg, rgba(56,189,248,0.12), rgba(99,102,241,0.12))",
          }}
        >
          <Typography variant="h6" className="!text-white !font-semibold">
            Customer Support
          </Typography>
          <Button
            onClick={handleClose}
            startIcon={<CloseIcon />}
            className="!text-white !border-white/40"
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </DialogTitle>

        <DialogContent sx={{ p: 0, height: "100%" }}>
          <LiveChat user={user} onClose={handleClose} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerSupport;
