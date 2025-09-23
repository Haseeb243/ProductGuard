import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { ethers } from "ethers";
import axios from "axios";
import Geocode from "react-geocode";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import abi from "../../utils/Identeefi.json";
import bgImg from "../../img/bg.png";
import { useConfig } from "../../context/ConfigContext";

const options = ["true", "false"];

const getEthereumObject = () => window.ethereum;

const findMetaMaskAccount = async () => {
  try {
    const ethereum = getEthereumObject();
    if (!ethereum) {
      console.error("Make sure you have Metamask!");
      return null;
    }
    const accounts = await ethereum.request({ method: "eth_accounts" });
    if (accounts.length !== 0) {
      return accounts[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const UpdateProductDetails = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [currDate, setCurrDate] = useState("");
  const [currLatitude, setCurrLatitude] = useState("");
  const [currLongtitude, setCurrLongtitude] = useState("");
  const [currName, setCurrName] = useState("");
  const [currLocation, setCurrLocation] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [isSold, setIsSold] = useState(false);
  const [loading, setLoading] = useState("");

  const { apiBaseUrl, contractAddress, googleMapsApiKey } = useConfig();
  const CONTRACT_ADDRESS = contractAddress;
  const CONTRACT_ABI = abi.abi;

  const { auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qrData = location.state?.qrData;

  useEffect(() => {
    if (!qrData) return;
    const data = qrData.split(",");
    setSerialNumber(data[1]);
    findMetaMaskAccount().then((account) => {
      if (account !== null) {
        setCurrentAccount(account);
      }
    });
  }, [qrData]);

  useEffect(() => {
    getUsername();
    getCurrentTimeLocation();
  }, []);

  useEffect(() => {
    if (googleMapsApiKey) {
      Geocode.setApiKey(googleMapsApiKey);
    }
    if (currLatitude && currLongtitude) {
      Geocode.fromLatLng(currLatitude, currLongtitude).then(
        (response) => {
          const address = response.results[0].formatted_address;
          setCurrLocation(address.replace(/,/g, ";"));
        },
        (error) => {
          console.error(error);
        }
      );
    }
  }, [currLatitude, currLongtitude]);

  const getCurrentTimeLocation = () => {
    setCurrDate(dayjs().unix());
    navigator.geolocation.getCurrentPosition(function (position) {
      setCurrLatitude(position.coords.latitude);
      setCurrLongtitude(position.coords.longitude);
    });
  };

  const getUsername = async () => {
    const res = await axios
      .get(`${apiBaseUrl}/profile/${auth.user}`)
      .then((res) => {
        setCurrName(res?.data[0].name);
      });
  };

  const updateProduct = async (e) => {
    e.preventDefault();
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const productContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        const registerTxn = await productContract.addProductHistory(
          serialNumber,
          currName,
          currLocation,
          currDate.toString(),
          Boolean(isSold)
        );
        setLoading("Mining (Add Product History) ...", registerTxn.hash);
        await registerTxn.wait();
        setLoading("Done! Product details updated successfully!");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(
      "Please pay the transaction fee to update the product details..."
    );
    await updateProduct(e);
  };

  const handleBack = () => {
    navigate(-1);
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
          Update Product Details
        </h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white mb-1 font-semibold">
              Serial Number
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:border-white/50 transition duration-200"
              value={serialNumber}
              disabled
            />
          </div>
          <div>
            <label className="block text-white mb-1 font-semibold">Name</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:border-white/50 transition duration-200"
              value={currName}
              disabled
            />
          </div>
          <div>
            <label className="block text-white mb-1 font-semibold">
              Location
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:border-white/50 transition duration-200"
              value={currLocation.replace(/;/g, ",")}
              disabled
              rows={2}
            />
          </div>
          <div>
            <label className="block text-white mb-1 font-semibold">Date</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:border-white/50 transition duration-200"
              value={dayjs(currDate * 1000).format("MMMM D, YYYY h:mm A")}
              disabled
            />
          </div>
          {auth.role === "supplier" ? null : (
            <div>
              <label className="block text-white mb-1 font-semibold">
                Is Sold?
              </label>
              <select
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white focus:outline-none focus:border-white/50 transition duration-200"
                value={isSold}
                onChange={(e) => setIsSold(e.target.value === "true")}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </div>
          )}
          {loading && (
            <div className="text-center text-white/80 text-sm mb-4">
              {loading}
            </div>
          )}
          <button
            type="submit"
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
        </form>
      </div>
    </div>
  );
};

export default UpdateProductDetails;
