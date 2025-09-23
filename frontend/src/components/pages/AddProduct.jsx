import { Box, Paper, Typography, TextField, Button } from "@mui/material";
import bgImg from "../../img/bg.png";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import abi from "../../utils/Identeefi.json";
import QRCode from "qrcode.react";
import dayjs from "dayjs";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Geocode from "react-geocode";
import { useConfig } from "../../context/ConfigContext";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";

const getEthereumObject = () => window.ethereum;

/*
 * This function returns the first linked account found.
 * If there is no account linked, it will return null.
 */
const findMetaMaskAccount = async () => {
  try {
    const ethereum = getEthereumObject();

    /*
     * First make sure we have access to the Ethereum object.
     */
    if (!ethereum) {
      console.error("Make sure you have Metamask!");
      alert("Make sure you have Metamask!");
      return null;
    }

    console.log("We have the Ethereum object", ethereum);
    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      return account;
    } else {
      console.error("No authorized account found");
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const AddProduct = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState({
    file: [],
    filepreview: null,
  });
  const [qrData, setQrData] = useState("");
  const [manuDate, setManuDate] = useState("");
  const [manuLatitude, setManuLatitude] = useState("");
  const [manuLongtitude, setManuLongtitude] = useState("");
  const [manuName, setManuName] = useState("");
  const [loading, setLoading] = useState("");
  const [manuLocation, setManuLocation] = useState("");
  const [isUnique, setIsUnique] = useState(true);

  const { apiBaseUrl, contractAddress, googleMapsApiKey } = useConfig();
  // Contract address from env
  const CONTRACT_ADDRESS = contractAddress;
  const contractABI = abi.abi;

  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    findMetaMaskAccount().then((account) => {
      if (account !== null) {
        setCurrentAccount(account);
      }
    });
    getUsername();
    getCurrentTimeLocation();
  }, []);

  useEffect(() => {
    if (googleMapsApiKey) {
      Geocode.setApiKey(googleMapsApiKey);
    }
    if (
      manuLatitude !== "" &&
      manuLongtitude !== "" &&
      !isNaN(Number(manuLatitude)) &&
      !isNaN(Number(manuLongtitude))
    ) {
      Geocode.fromLatLng(manuLatitude, manuLongtitude).then(
        (response) => {
          const address = response.results[0].formatted_address;
          let city, state, country;
          for (
            let i = 0;
            i < response.results[0].address_components.length;
            i++
          ) {
            for (
              let j = 0;
              j < response.results[0].address_components[i].types.length;
              j++
            ) {
              switch (response.results[0].address_components[i].types[j]) {
                case "locality":
                  city = response.results[0].address_components[i].long_name;
                  break;
                case "administrative_area_level_1":
                  state = response.results[0].address_components[i].long_name;
                  break;
                case "country":
                  country = response.results[0].address_components[i].long_name;
                  break;
              }
            }
          }
          setManuLocation(address.replace(/,/g, ";"));
          console.log("city, state, country: ", city, state, country);
          console.log("address:", address);
        },
        (error) => {
          console.error(error);
        }
      );
    }
  }, [manuLatitude, manuLongtitude]);

  const generateQRCode = async (serialNumber) => {
    // const qrCode = await productContract.getProduct(serialNumber);
    const data = CONTRACT_ADDRESS + "," + serialNumber;
    setQrData(data);
    console.log("QR Code: ", qrData);
  };

  const downloadQR = () => {
    const canvas = document.getElementById("QRCode");
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${serialNumber}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleImage = async (e) => {
    setImage({
      ...image,
      file: e.target.files[0],
      filepreview: URL.createObjectURL(e.target.files[0]),
    });
  };

  const getUsername = async (e) => {
    const res = await axios
      .get(`${apiBaseUrl}/profile/${auth.user}`)
      .then((res) => {
        console.log(JSON.stringify(res?.data[0]));
        setManuName(res?.data[0].name);
      });
  };

  // to upload image
  const uploadImage = async (image) => {
    const data = new FormData();
    data.append("image", image.file);

    axios
      .post(`${apiBaseUrl}/upload/product`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        console.log(res);

        if (res.data.success === 1) {
          console.log("image uploaded");
        }
      });
  };

  const registerProduct = async (e) => {
    e.preventDefault();

    try {
      const { ethereum } = window;

      if (ethereum) {
        // Ensure wallet is connected
        await ethereum.request({ method: "eth_requestAccounts" });

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const productContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        );

        console.log("here");

        // write transactions
        const registerTxn = await productContract.registerProduct(
          name,
          brand,
          serialNumber,
          description.replace(/,/g, ";"),
          image.file.name,
          manuName,
          manuLocation,
          manuDate.toString()
        );
        console.log("Mining (Registering Product) ...", registerTxn.hash);
        setLoading("Mining (Register Product) ...", registerTxn.hash);

        await registerTxn.wait();
        console.log("Mined (Register Product) --", registerTxn.hash);
        setLoading("Mined (Register Product) --", registerTxn.hash);

        generateQRCode(serialNumber);

        const product = await productContract.getProduct(serialNumber);

        console.log("Retrieved product...", product);
        setLoading("");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getCurrentTimeLocation = () => {
    setManuDate(dayjs().unix());
    navigator.geolocation.getCurrentPosition(function (position) {
      setManuLatitude(position.coords.latitude);
      setManuLongtitude(position.coords.longitude);
    });
  };

  const addProductDB = async (e) => {
    try {
      const profileData = JSON.stringify({
        serialNumber: serialNumber,
        name: name,
        brand: brand,
      });

      const res = await axios.post(`${apiBaseUrl}/addproduct`, profileData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log(JSON.stringify(res.data));
    } catch (err) {
      console.log(err);
    }
  };

  const checkUnique = async () => {
    const res = await axios.get(`${apiBaseUrl}/product/serialNumber`);
    const existingSerialNumbers = res.data.map(
      (product) => product.serialnumber
    );
    existingSerialNumbers.push(serialNumber);
    // checking for duplicated serial number
    const duplicates = existingSerialNumbers.filter(
      (item, index) => existingSerialNumbers.indexOf(item) != index
    );
    const isDuplicate = duplicates.length >= 1;
    setIsUnique(!isDuplicate);
    return !isDuplicate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    getCurrentTimeLocation();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const unique = await checkUnique();
    if (unique) {
      await uploadImage(image);
      await addProductDB(e);
      setLoading(
        "Please pay the transaction fee to update the product details..."
      );
      await registerProduct(e);
    }
    setIsUnique(true);
  };

  try {
    console.log("Rendering AddProduct page");
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
            variant="h3"
            sx={{
              textAlign: "center",
              mb: 3,
              fontFamily: "Gambetta",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: 1,
            }}
          >
            Add Product
          </Typography>
          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <ConfirmationNumberOutlinedIcon sx={{ color: "#fff", mr: 1 }} />
              <TextField
                fullWidth
                error={!isUnique}
                helperText={!isUnique ? "Serial Number already exists" : ""}
                id="serial-number"
                label="Serial Number"
                variant="outlined"
                onChange={(e) => setSerialNumber(e.target.value)}
                value={serialNumber}
                InputLabelProps={{ style: { color: "#fff" } }}
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#fff" },
                    "&:hover fieldset": { borderColor: "#90caf9" },
                    "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
                  },
                  mb: 0,
                }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <DriveFileRenameOutlineIcon sx={{ color: "#fff", mr: 1 }} />
              <TextField
                fullWidth
                id="product-name"
                label="Name"
                variant="outlined"
                onChange={(e) => setName(e.target.value)}
                value={name}
                InputLabelProps={{ style: { color: "#fff" } }}
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#fff" },
                    "&:hover fieldset": { borderColor: "#90caf9" },
                    "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
                  },
                  mb: 0,
                }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <StorefrontOutlinedIcon sx={{ color: "#fff", mr: 1 }} />
              <TextField
                fullWidth
                id="brand"
                label="Brand"
                variant="outlined"
                onChange={(e) => setBrand(e.target.value)}
                value={brand}
                InputLabelProps={{ style: { color: "#fff" } }}
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#fff" },
                    "&:hover fieldset": { borderColor: "#90caf9" },
                    "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
                  },
                  mb: 0,
                }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
              <InfoOutlinedIcon sx={{ color: "#fff", mr: 1, mt: 1 }} />
              <TextField
                fullWidth
                id="description"
                label="Description"
                variant="outlined"
                multiline
                minRows={2}
                onChange={(e) => setDescription(e.target.value)}
                value={description}
                InputLabelProps={{ style: { color: "#fff" } }}
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#fff" },
                    "&:hover fieldset": { borderColor: "#90caf9" },
                    "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
                  },
                  mb: 0,
                }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <ImageOutlinedIcon sx={{ color: "#fff", mr: 1 }} />
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{
                  color: "#fff",
                  borderColor: "#fff",
                  "&:hover": {
                    borderColor: "#38bdf8",
                    background: "rgba(56,189,248,0.08)",
                  },
                  mb: 0,
                }}
              >
                Upload Image
                <input type="file" hidden onChange={handleImage} />
              </Button>
            </Box>
            {image.filepreview !== null ? (
              <img
                src={image.filepreview}
                alt="preview"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              />
            ) : null}
            {qrData !== "" ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 2,
                }}
              >
                <QRCode value={qrData} id="QRCode" />
              </Box>
            ) : null}
            {qrData !== "" ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 2,
                }}
              >
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    color: "#fff",
                    borderColor: "#fff",
                    "&:hover": {
                      borderColor: "#38bdf8",
                      background: "rgba(56,189,248,0.08)",
                    },
                    mb: 0,
                  }}
                  onClick={downloadQR}
                >
                  Download QR
                </Button>
              </Box>
            ) : null}
            {loading === "" ? null : (
              <Typography
                variant="body2"
                sx={{ textAlign: "center", mt: 2, color: "#fff" }}
              >
                {loading}
              </Typography>
            )}
            <Button
              variant="contained"
              type="submit"
              fullWidth
              sx={{
                mt: 3,
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
              Add Product
            </Button>
            <Button
              onClick={handleBack}
              fullWidth
              sx={{
                mt: 2,
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
          </form>
        </Paper>
      </Box>
    );
  } catch (err) {
    console.error("Error rendering AddProduct:", err);
    return <div>Error rendering AddProduct: {err.message}</div>;
  }
};

export default AddProduct;
