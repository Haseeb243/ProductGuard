import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import bgImg from "../../img/bg.png";
import logoImg from "../../img/logo.png";
import useAuth from "../../hooks/useAuth";

const getEthereumObject = () => window.ethereum;

const findMetaMaskAccount = async () => {
  try {
    const ethereum = getEthereumObject();

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

const Supplier = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    findMetaMaskAccount().then((account) => {
      if (account !== null) {
        setCurrentAccount(account);
      }
    });
  }, []);

  const connectWallet = async () => {
    try {
      const ethereum = getEthereumObject();
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-gray-950 bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,20,0.75),rgba(10,10,20,0.85)), url(${bgImg})`,
        backgroundSize: "contain",
      }}
    >
      <div className="w-full max-w-md mx-auto px-4 py-8 relative">
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-sm border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
          >
            <LogoutIcon className="mr-2 h-5 w-5" />
            Logout
          </button>
        </div>

        <div className="relative rounded-2xl p-1 mt-8 bg-gradient-to-tr from-primary-500 via-indigo-500 to-primary-400 animate-gradient-border">
          <div className="relative bg-gray-900/80 backdrop-blur-lg shadow-2xl rounded-2xl p-10 border border-gray-800">
            <div className="flex flex-col items-center mb-8">
              <img
                src={logoImg}
                alt="ProductGuard Logo"
                className="h-16 mb-2 drop-shadow-[0_0_16px_rgba(14,165,233,0.5)]"
              />
              <h2 className="text-lg font-semibold text-primary-400 mb-1">
                Welcome to
              </h2>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Supplier Dashboard
              </h1>
            </div>

            <div className="space-y-4">
              <Link to="/profile" className="block">
                <button className="w-full flex justify-center py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-cyan-500/25 transition-all duration-200 transform hover:scale-[1.02]">
                  Check Profile
                </button>
              </Link>

              <Link to="/scanner" className="block">
                <button className="w-full flex justify-center py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-cyan-500/25 transition-all duration-200 transform hover:scale-[1.02]">
                  Update Product
                </button>
              </Link>

              <Link to="/transparency" className="block">
                <button className="w-full flex justify-center py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400 shadow-lg shadow-emerald-400/20 transition-all duration-200 transform hover:scale-[1.02]">
                  Transparency Dashboard
                </button>
              </Link>

              {!currentAccount && (
                <button
                  onClick={connectWallet}
                  className="w-full flex justify-center py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-cyan-500/25 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Supplier;
