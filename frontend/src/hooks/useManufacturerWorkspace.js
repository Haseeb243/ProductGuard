import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import useAuth from "./useAuth";
import { buildManufacturerSidebarLinks } from "../components/pages/manufacturerNav";
import { findMetaMaskAccount, getEthereumObject } from "../utils/wallet";

export const useManufacturerWorkspace = () => {
  const { auth } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [checkingWallet, setCheckingWallet] = useState(false);

  const isManufacturer = auth?.role === "manufacturer";

  useEffect(() => {
    if (!isManufacturer) {
      setWalletAddress("");
      return;
    }

    let mounted = true;
    setCheckingWallet(true);
    findMetaMaskAccount()
      .then((account) => {
        if (mounted && account) {
          setWalletAddress(account);
        }
      })
      .finally(() => {
        if (mounted) {
          setCheckingWallet(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isManufacturer]);

  const connectWallet = useCallback(async () => {
    const ethereum = getEthereumObject();
    if (!ethereum) {
      toast.error("Install MetaMask to connect your wallet.");
      return null;
    }
    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts?.length) {
        setWalletAddress(accounts[0]);
        toast.success("Wallet connected");
        return accounts[0];
      }
    } catch (error) {
      console.error("Wallet connection failed", error);
      toast.error(error?.message || "Failed to connect wallet");
    }
    return null;
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress("");
    toast.success("Wallet disconnected locally");
  }, []);

  const sidebarLinks = useMemo(() => {
    if (!isManufacturer) return null;
    return buildManufacturerSidebarLinks({
      walletAddress,
      is2FAEnabled: Boolean(auth?.is2FAEnabled),
      onConnectWallet: connectWallet,
    });
  }, [isManufacturer, walletAddress, auth?.is2FAEnabled, connectWallet]);

  return {
    auth,
    isManufacturer,
    walletAddress,
    checkingWallet,
    connectWallet,
    disconnectWallet,
    sidebarLinks,
    setWalletAddress,
  };
};

export default useManufacturerWorkspace;
