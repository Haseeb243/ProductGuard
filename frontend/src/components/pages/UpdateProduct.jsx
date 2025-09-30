import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import abi from "../../utils/Identeefi.json";
import useAuth from "../../hooks/useAuth";
import { ethers } from "ethers";
import axios from "axios";
import dayjs from "dayjs";
import bgImg from "../../img/bg.png";
import { useConfig } from "../../context/ConfigContext";

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

const UpdateProduct = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [suppDate, setSuppDate] = useState("");
  const [suppLatitude, setSuppLatitude] = useState("");
  const [suppLongtitude, setSuppLongtitude] = useState("");
  const [suppName, setSuppName] = useState("");
  const [suppLocation, setSuppLocation] = useState("");
  const [loading, setLoading] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [productData, setProductData] = useState("");

  const [name, setName] = useState("P");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState("");
  const [history, setHistory] = useState([]);
  const [isSold, setIsSold] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [image, setImage] = useState({
    file: [],
    filepreview: null,
  });

  const { apiBaseUrl, contractAddress, publicRpcUrl } = useConfig();
  const CONTRACT_ADDRESS = contractAddress;
  const CONTRACT_ABI = abi.abi;

  const { auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qrData = location.state?.qrData;
  const flaggedSuspicious = Boolean(location.state?.isSuspicious);

  console.log("qrData", qrData);

  useEffect(() => {
    console.log("useEffect 1");

    findMetaMaskAccount().then((account) => {
      if (account) {
        setCurrentAccount(account);
      }
    });

    if (qrData) {
      handleScan(qrData);
    }
  }, [qrData]);

  const getImage = async (imageName) => {
    setImage((prevState) => ({
      ...prevState,
      filepreview: `${apiBaseUrl}/file/product/${imageName}`,
    }));
  };

  const handleScan = async (qrData) => {
    const parts = qrData.split(",");
    const scannedContract = parts[0];
    const scannedSerial = parts[1];
    setSerialNumber(scannedSerial);

    if (!CONTRACT_ADDRESS) {
      setLoadError("Contract address is not configured.");
      return;
    }

    if (scannedContract !== CONTRACT_ADDRESS) {
      setLoadError("Scanned QR does not match the configured contract.");
      return;
    }

    try {
      const { ethereum } = window;
      let provider;

      if (ethereum) {
        provider = new ethers.providers.Web3Provider(ethereum);
      } else {
        provider = new ethers.providers.JsonRpcProvider(publicRpcUrl);
      }

      const productContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const product = await productContract.getProduct(
        scannedSerial.toString()
      );
      setLoadError("");
      setData(product.toString());
    } catch (error) {
      console.log(error);
      setLoadError("Unable to load product details from the blockchain.");
    }
  };

  const setData = (d) => {
    console.log("product data: ", d);

    const arr = d.split(",");
    console.log("arr", arr);

    setName(arr[1]);
    setBrand(arr[2]);
    setDescription(arr[3].replace(/;/g, ","));
    // setImageName(arr[4]);
    getImage(arr[4]);

    const hist = [];
    let start = 5;

    for (let i = 5; i < arr.length; i += 5) {
      const actor = arr[start + 1];
      const location = arr[start + 2].replace(/;/g, ",");
      const timestamp = arr[start + 3];
      const isSold = arr[start + 4] === "true" ? setIsSold(true) : false;

      hist.push({
        actor,
        location,
        timestamp,
        isSold,
      });

      start += 5;
    }
    console.log("hist", hist);
    setHistory(hist);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getHistory = () => {
    return history.map((item, index) => {
      const date = dayjs(item.timestamp * 1000).format("MM/DD/YYYY");
      const time = dayjs(item.timestamp * 1000).format("HH:mm a");

      // if (item.isSold) {
      //     setIsSold(true);
      // }

      return (
        <div key={index} className="flex items-center mb-4">
          <div className="flex flex-col items-center mr-4">
            <div className="w-4 h-4 rounded-full bg-blue-500 mb-1"></div>
            {index < history.length - 1 && (
              <div className="w-1 h-8 bg-blue-200"></div>
            )}
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 shadow text-white w-full">
            <div className="text-xs text-blue-200 mb-1">
              {time} {date}
            </div>
            <div className="font-semibold">Location: {item.location}</div>
            <div className="text-sm">Actor: {item.actor}</div>
          </div>
        </div>
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    navigate("/update-product-details", {
      state: { qrData, isSuspicious: flaggedSuspicious },
    });
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative overflow-y-auto flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,20,0.85),rgba(10,10,20,0.95)), url(${bgImg})`,
      }}
    >
      <div className="max-w-lg w-full mx-auto bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-2xl p-8 mt-12 mb-12">
        <h1 className="text-3xl font-bold text-white text-center mb-8 font-gambetta">
          Product Details
        </h1>
        <div className="flex flex-row items-center mb-8">
          <div className="flex flex-col items-center flex-shrink-0 mr-6">
            <img
              src={image.filepreview}
              alt={name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mb-2 bg-blue-200"
            />
          </div>
          <div className="flex flex-col flex-grow text-white">
            <div className="text-xl font-semibold mb-2">{name}</div>
            <div className="text-sm mb-1">
              Serial Number: <span className="font-mono">{serialNumber}</span>
            </div>
            <div className="text-sm mb-1">Description: {description}</div>
            <div className="text-sm mb-1">Brand: {brand}</div>
          </div>
        </div>
        <div className="mb-8">
          <div className="text-white font-semibold mb-2">Product History</div>
          <div>{getHistory()}</div>
          <div className="flex items-center mt-4">
            <div className="flex flex-col items-center mr-4">
              <div className="w-4 h-4 rounded-full bg-green-400 mb-1"></div>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 shadow text-white w-full">
              <div className="text-xs text-green-200 mb-1">
                {dayjs().format("HH:mm a")} {dayjs().format("MM/DD/YYYY")}
              </div>
              <div className="font-semibold">IsSold: {isSold.toString()}</div>
            </div>
          </div>
        </div>
        {loading && (
          <div className="text-center text-white/80 text-sm mb-4">
            {loading}
          </div>
        )}
        {loadError && (
          <div className="text-center text-red-200 text-sm mb-4">
            {loadError}
          </div>
        )}
        <button
          type="submit"
          onClick={handleSubmit}
          className="w-full px-4 py-3 rounded-lg bg-white text-gray-800 font-semibold hover:bg-gray-100 transition duration-200 mb-4"
        >
          Update Product
        </button>
        <button
          type="button"
          onClick={handleBack}
          className="w-full px-4 py-3 rounded-lg bg-transparent border border-white text-white hover:bg-white/10 transition duration-200"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default UpdateProduct;
