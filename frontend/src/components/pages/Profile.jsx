import { Box, Paper, Avatar, Typography, Button } from "@mui/material";
import bgImg from "../../img/bg.png";
import { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";

const Profile = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState({
    file: [],
    filepreview: null,
  });

  const { auth } = useAuth();
  const { apiBaseUrl } = useConfig();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleData = async (e) => {
    const res = await axios
      .get(`${apiBaseUrl}/profile/${auth.user}`)
      .then((res) => {
        console.log(JSON.stringify(res?.data[0]));
        setName(res?.data[0].name);
        setDescription(res?.data[0].description);
        setRole(res.data[0].role);
        setWebsite(res?.data[0].website);
        setLocation(res?.data[0].location);
        setImage(res.data.image);
      });
  };

  useEffect(() => {
    handleData();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: `linear-gradient(rgba(10,10,20,0.85),rgba(10,10,20,0.95)), url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420, px: 2 }}>
        <Box
          sx={{
            borderRadius: 4,
            p: 0.5,
            mt: 8,
            background:
              "linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #0ea5e9 100%)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.25)",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              p: 5,
              background: "rgba(24, 28, 40, 0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "#f3f6fa",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 4px 24px 0 rgba(14, 165, 233, 0.10)",
            }}
          >
            <Avatar
              sx={{
                width: 96,
                height: 96,
                mb: 2,
                bgcolor: "primary.main",
                fontSize: 40,
                fontWeight: 700,
                color: "#fff",
                border: "3px solid #38bdf8",
                boxShadow: 2,
              }}
            >
              {name ? name[0] : ""}
            </Avatar>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                mb: 1,
                color: "#fff",
                textAlign: "center",
                letterSpacing: 1,
                fontFamily: "Gambetta, serif",
              }}
            >
              {name || "Profile"}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: "#a5b4fc",
                mb: 3,
                textAlign: "center",
                letterSpacing: 1,
                fontWeight: 600,
              }}
            >
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : ""}
            </Typography>
            <Box sx={{ width: "100%", mb: 2 }}>
              <Typography
                variant="body1"
                sx={{ color: "#e0e7ef", mb: 1, fontWeight: 500 }}
              >
                <b>Description:</b>{" "}
                {description || (
                  <span style={{ color: "#789" }}>No description</span>
                )}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "#e0e7ef", mb: 1, fontWeight: 500 }}
              >
                <b>Website:</b>{" "}
                {website ? (
                  <a
                    href={
                      website.startsWith("http")
                        ? website
                        : `https://${website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#38bdf8", textDecoration: "underline" }}
                  >
                    {website}
                  </a>
                ) : (
                  <span style={{ color: "#789" }}>No website</span>
                )}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "#e0e7ef", mb: 1, fontWeight: 500 }}
              >
                <b>Location:</b>{" "}
                {location || <span style={{ color: "#789" }}>No location</span>}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "#e0e7ef", mb: 2, fontWeight: 500 }}
              >
                <b>Two-Factor Authentication:</b>{" "}
                <span style={{ 
                  color: auth.is2FAEnabled ? "#10b981" : "#f59e0b",
                  fontWeight: 600
                }}>
                  {auth.is2FAEnabled ? "Enabled ✓" : "Disabled"}
                </span>
                <Button
                  onClick={() => navigate('/2fa-settings')}
                  size="small"
                  sx={{
                    ml: 2,
                    color: "#38bdf8",
                    textTransform: "none",
                    fontSize: "0.875rem",
                    "&:hover": {
                      backgroundColor: "rgba(56, 189, 248, 0.1)"
                    }
                  }}
                >
                  Manage
                </Button>
              </Typography>
            </Box>
            <Button
              onClick={handleBack}
              variant="contained"
              sx={{
                mt: 2,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                background: "linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)",
                color: "#fff",
                boxShadow: 1,
                letterSpacing: 1,
                fontSize: 16,
                textTransform: "none",
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)",
                },
              }}
            >
              Back
            </Button>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;
