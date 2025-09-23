import { Box, Paper, Typography, Button } from "@mui/material";
import bgImg from "../../img/bg.png";
import QrScanner from "../QrScanner";
import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";

const ScannerPage = () => {
  const { contractAddress } = useConfig();
  const CONTRACT_ADDRESS = contractAddress;
  const [qrData, setQrData] = useState("");
  const { auth } = useAuth();
  const navigate = useNavigate();

  const passData = (data) => {
    setQrData(data);
    console.log("qrdata 1: ", qrData);
  };

  useEffect(() => {
    if (!qrData) return;

    const arr = qrData.split(",");
    const contractAddress = arr[0];
    if (contractAddress) {
      if (contractAddress == CONTRACT_ADDRESS) {
        if (auth.role === "supplier" || auth.role === "retailer") {
          navigate("/update-product", { state: { qrData } });
        } else {
          navigate("/authentic-product", { state: { qrData } });
        }
      } else {
        navigate("/fake-product", { state: { qrData } });
      }
    }
  }, [qrData]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Box
      sx={{
        backgroundImage: `url(${bgImg})`,
        minHeight: "100vh",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: 400,
          maxWidth: "90vw",
          padding: 3,
          backgroundColor: "#e3eefc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            marginBottom: 3,
            fontFamily: "Gambetta",
            fontWeight: "bold",
            fontSize: "2.5rem",
          }}
        >
          Scan QR Code
        </Typography>
        <QrScanner passData={passData} />
        <Button
          onClick={handleBack}
          sx={{ marginTop: 3, width: "100%" }}
          variant="outlined"
        >
          Back
        </Button>
      </Paper>
    </Box>
  );
};

export default ScannerPage;
