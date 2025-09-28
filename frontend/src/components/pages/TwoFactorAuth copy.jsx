import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import QrCodeIcon from "@mui/icons-material/QrCode";
import QRCode from "qrcode.react";
import axios from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const TwoFactorAuth = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [copied, setCopied] = useState(false);

  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  // Fallback otpauth URL for client-side QR if server doesn't return an image
  const computedOtpAuthUrl =
    secret && auth?.user
      ? `otpauth://totp/${encodeURIComponent(
          "ProductGuard"
        )}%20(${encodeURIComponent(auth.user)})?secret=${encodeURIComponent(
          secret
        )}&issuer=${encodeURIComponent("ProductGuard")}`
      : null;

  useEffect(() => {
    if (auth.is2FAEnabled !== undefined) {
      setIs2FAEnabled(auth.is2FAEnabled);
    }
  }, [auth.is2FAEnabled]);

  const handle2FASetup = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/auth/2fa/setup");
      const payload = response?.data || {};
      const qr = payload.qrCode || payload.qr || payload?.data?.qrCode;
      let sec = payload.secret || payload?.data?.secret;
      const otpauthUrl = payload.otpauthUrl || payload?.data?.otpauthUrl;
      // Try extracting secret from otpauth URL if provided
      if (!sec && typeof otpauthUrl === "string") {
        try {
          const m = otpauthUrl.match(/secret=([^&]+)/i);
          if (m && m[1]) sec = decodeURIComponent(m[1]);
        } catch {}
      }

      if (sec) setSecret(sec);
      if (qr) setQrCode(qr);

      if (qr || sec || otpauthUrl) {
        // Open dialog and also render inline fallback (via secret/qrCode state)
        setShowSetupDialog(true);
        setMessage({
          type: "info",
          text: "Scan the QR code with your authenticator app",
        });
      } else {
        setMessage({
          type: "error",
          text:
            payload.message ||
            "Unexpected response from server while setting up 2FA",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          (error.response?.status === 401 || error.response?.status === 403
            ? "Please sign in again to manage 2FA"
            : "Failed to setup 2FA"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/auth/2fa/verify", {
        token: verificationToken,
      });

      if (response.data.success) {
        setIs2FAEnabled(true);
        setAuth((prev) => ({ ...prev, is2FAEnabled: true }));
        setShowSetupDialog(false);
        setVerificationToken("");
        setMessage({ type: "success", text: "2FA enabled successfully!" });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Invalid verification code",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/auth/2fa/disable", {
        password,
        token: verificationToken,
      });

      if (response.data.success) {
        setIs2FAEnabled(false);
        setAuth((prev) => ({ ...prev, is2FAEnabled: false }));
        setShowDisableDialog(false);
        setPassword("");
        setVerificationToken("");
        setMessage({ type: "success", text: "2FA disabled successfully" });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to disable 2FA",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = () => {
    if (is2FAEnabled) {
      setShowDisableDialog(true);
    } else {
      handle2FASetup();
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        padding: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 600,
          margin: "0 auto",
          padding: 4,
          backgroundColor: "#1e293b",
          color: "white",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <SecurityIcon sx={{ fontSize: 32, color: "#3b82f6", mr: 2 }} />
          <Typography variant="h4" component="h1">
            Two-Factor Authentication
          </Typography>
        </Box>

        {message.text && (
          <Alert
            severity={message.type}
            sx={{ mb: 3 }}
            onClose={() => setMessage({ type: "", text: "" })}
          >
            {message.text}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 3, color: "#cbd5e1" }}>
          Two-factor authentication adds an extra layer of security to your
          account. When enabled, you'll need to provide a code from your
          authenticator app in addition to your password.
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={is2FAEnabled}
              onChange={handleToggle2FA}
              disabled={loading}
              color="primary"
            />
          }
          label={
            <Typography variant="h6">
              {is2FAEnabled ? "2FA Enabled" : "Enable 2FA"}
            </Typography>
          }
          sx={{ mb: 3 }}
        />

        {is2FAEnabled && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Two-factor authentication is currently enabled for your account.
          </Alert>
        )}

        {/* Inline fallback UI in case dialog fails to show due to portal issues */}
        {!is2FAEnabled && (qrCode || secret) && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              border: "1px solid #334155",
              borderRadius: 2,
              backgroundColor: "#0b1020",
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Scan this QR code with your authenticator app
            </Typography>
            {qrCode && (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  style={{ maxWidth: "100%" }}
                />
              </Box>
            )}
            {!qrCode && computedOtpAuthUrl && (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <QRCode
                  value={computedOtpAuthUrl}
                  size={192}
                  includeMargin={true}
                />
              </Box>
            )}
            {!qrCode && secret && !computedOtpAuthUrl && (
              <Alert severity="info" sx={{ mb: 2 }}>
                QR code not available. You can manually enter this secret in
                your authenticator app: <b>{secret}</b>
              </Alert>
            )}
            {secret && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <TextField
                  fullWidth
                  label="Secret (manual entry)"
                  value={secret}
                  InputProps={{ readOnly: true }}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard?.writeText(secret);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </Box>
            )}
            <Typography variant="body2" sx={{ mb: 1 }}>
              Then enter the 6-digit code to verify:
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                label="Verification Code"
                value={verificationToken}
                onChange={(e) =>
                  setVerificationToken(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: "center", fontSize: "1.2em" },
                }}
              />
              <Button
                onClick={handleVerify2FA}
                disabled={verificationToken.length !== 6 || loading}
                variant="contained"
              >
                {loading ? <CircularProgress size={20} /> : "Verify"}
              </Button>
            </Box>
          </Box>
        )}

        <Button
          variant="outlined"
          onClick={handleBack}
          sx={{
            color: "#3b82f6",
            borderColor: "#3b82f6",
            "&:hover": {
              borderColor: "#2563eb",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
            },
          }}
        >
          Back
        </Button>

        {/* Setup Dialog */}
        <Dialog
          open={showSetupDialog}
          onClose={() => setShowSetupDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <QrCodeIcon sx={{ mr: 1 }} />
              Setup Two-Factor Authentication
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              1. Install an authenticator app like Google Authenticator or Authy
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              2. Scan this QR code with your authenticator app:
            </Typography>

            {qrCode && (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  style={{ maxWidth: "100%" }}
                />
              </Box>
            )}
            {!qrCode && computedOtpAuthUrl && (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <QRCode
                  value={computedOtpAuthUrl}
                  size={224}
                  includeMargin={true}
                />
              </Box>
            )}

            {secret && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <TextField
                  fullWidth
                  label="Secret (manual entry)"
                  value={secret}
                  InputProps={{ readOnly: true }}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard?.writeText(secret);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </Box>
            )}

            <Typography variant="body2" sx={{ mb: 2 }}>
              3. Enter the 6-digit code from your app to verify:
            </Typography>

            <TextField
              fullWidth
              label="Verification Code"
              value={verificationToken}
              onChange={(e) =>
                setVerificationToken(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              inputProps={{
                maxLength: 6,
                style: { textAlign: "center", fontSize: "1.2em" },
              }}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSetupDialog(false)}>Cancel</Button>
            <Button
              onClick={handleVerify2FA}
              disabled={verificationToken.length !== 6 || loading}
              variant="contained"
            >
              {loading ? <CircularProgress size={20} /> : "Verify & Enable"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Disable Dialog */}
        <Dialog
          open={showDisableDialog}
          onClose={() => setShowDisableDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              To disable 2FA, please enter your current password and a
              verification code from your authenticator app:
            </Typography>

            <TextField
              fullWidth
              type="password"
              label="Current Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="2FA Code"
              value={verificationToken}
              onChange={(e) =>
                setVerificationToken(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              inputProps={{
                maxLength: 6,
                style: { textAlign: "center", fontSize: "1.2em" },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDisableDialog(false)}>Cancel</Button>
            <Button
              onClick={handleDisable2FA}
              disabled={!password || verificationToken.length !== 6 || loading}
              variant="contained"
              color="error"
            >
              {loading ? <CircularProgress size={20} /> : "Disable 2FA"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default TwoFactorAuth;
