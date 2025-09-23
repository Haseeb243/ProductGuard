import { Box, Paper, Avatar, Typography, Button } from "@mui/material";
import bgImg from "../../img/bg.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import axios from "../../api/axios";

const FakeProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const qrData = location.state?.qrData;

  useEffect(() => {
    // Log the fake product scan
    if (qrData) {
      const arr = qrData.split(",");
      const serialNumber = arr[1]; // Get serial number from QR data
      axios
        .post("/scan-product", {
          serialNumber: serialNumber,
          username: "anonymous", // or get from auth context if user is logged in
          location: "scan location",
          isAuthentic: false,
        })
        .catch((err) => console.error("Error logging scan:", err));
    }
  }, [qrData]);

  const handleBack = () => {
    navigate(-2);
  };

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
      <Paper
        elevation={8}
        sx={{
          borderRadius: 6,
          p: 5,
          width: 440,
          maxWidth: "98vw",
          background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.25)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontFamily: "Montserrat, Gambetta, serif",
            textAlign: "center",
            mb: 3,
            mt: 1,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: 1,
          }}
        >
          Product Authentication Failed
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontFamily: "Montserrat, Gambetta, serif",
            textAlign: "center",
            mb: 3,
            mt: 1,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          We're sorry to inform you that the product you scanned is not
          authentic. It appears to be a counterfeit.
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontFamily: "Montserrat, Gambetta, serif",
            textAlign: "center",
            mb: 3,
            mt: 1,
            color: "#e0e7ef",
            fontWeight: 500,
          }}
        >
          We take counterfeiting very seriously, and we are working to prevent
          it from happening. We advise you not to use this product, as it may
          not meet the safety and quality standards of the genuine product. If
          you have any concerns or questions, please contact the manufacturer of
          the genuine product for further assistance.
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontFamily: "Montserrat, Gambetta, serif",
            textAlign: "center",
            mb: 3,
            mt: 1,
            color: "#e0e7ef",
            fontWeight: 500,
          }}
        >
          Thank you for using our anti-counterfeit system. We hope it has helped
          you make informed purchasing decisions and protected you from
          counterfeit products.
        </Typography>
        <Button
          onClick={handleBack}
          fullWidth
          sx={{
            mt: 4,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 700,
            background: "#fff",
            color: "#222",
            fontSize: 18,
            textTransform: "none",
            boxShadow: 1,
            "&:hover": {
              background: "#e0e7ef",
            },
          }}
        >
          Back
        </Button>
      </Paper>
    </Box>
  );
};

export default FakeProduct;
