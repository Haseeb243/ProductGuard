import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Grid, Paper } from '@mui/material';
import LiveChat from '../components/LiveChat';
import SupportDashboard from '../components/SupportDashboard';
import CustomerSupport from '../components/CustomerSupport';

const theme = createTheme();

const mockUser = {
  username: 'demo_user',
  role: 'manufacturer',
  email: 'demo@productguard.com'
};

const CommunicationDemo = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
          Communication & Customer Support Module Demo
        </Typography>
        
        <Grid container spacing={4}>
          {/* Live Chat Component */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom color="primary">
                Live Chat Component
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }} color="textSecondary">
                Real-time chat interface with Socket.IO support
              </Typography>
              <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1 }}>
                <LiveChat user={mockUser} onClose={() => console.log('Chat closed')} />
              </Box>
            </Paper>
          </Grid>

          {/* Customer Support Widget */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom color="primary">
                Customer Support Widget
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }} color="textSecondary">
                Floating action button for easy support access
              </Typography>
              <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1, position: 'relative' }}>
                <CustomerSupport user={mockUser} />
                <Box sx={{ p: 2, color: 'text.secondary' }}>
                  <Typography variant="body2">
                    The support widget appears as a floating action button in the bottom-right corner.
                    Click it to open the chat dialog.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Support Dashboard */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom color="primary">
                Admin Support Dashboard
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }} color="textSecondary">
                Comprehensive admin interface for managing support and notifications
              </Typography>
              <Box sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
                <SupportDashboard />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Feature Summary */}
        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5" gutterBottom color="primary">
            Module Features Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" color="secondary" gutterBottom>
                Email Notifications
              </Typography>
              <Typography variant="body2">
                • Product registration confirmations<br/>
                • Suspicious scan alerts<br/>
                • SMTP integration with nodemailer<br/>
                • Simple text and HTML templates<br/>
                • Notification logging and status tracking
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" color="secondary" gutterBottom>
                Live Chat Support
              </Typography>
              <Typography variant="body2">
                • Real-time messaging with Socket.IO<br/>
                • Role-based chat permissions<br/>
                • Online status indicators<br/>
                • Message history persistence<br/>
                • Typing indicators
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" color="secondary" gutterBottom>
                Admin Dashboard
              </Typography>
              <Typography variant="body2">
                • Email notification management<br/>
                • Chat history monitoring<br/>
                • Test email functionality<br/>
                • System message broadcasting<br/>
                • Support statistics and analytics
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default CommunicationDemo;