import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import useAuth from "./useAuth";
import { findMetaMaskAccount, getEthereumObject } from "../utils/wallet";

const useSupplyWorkspace = ({ roleKey, buildSidebarLinks }) => {
  const { auth, logout } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [checkingWallet, setCheckingWallet] = useState(false);

  const isCurrentRole = auth?.role === roleKey;

  useEffect(() => {
    if (!isCurrentRole) {
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
  }, [isCurrentRole]);

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
    if (!isCurrentRole || typeof buildSidebarLinks !== "function") {
      return null;
    }

    return buildSidebarLinks({
      walletAddress,
      is2FAEnabled: Boolean(auth?.is2FAEnabled),
      onConnectWallet: connectWallet,
    });
  }, [
    isCurrentRole,
    buildSidebarLinks,
    walletAddress,
    auth?.is2FAEnabled,
    connectWallet,
  ]);

  return {
    auth,
    logout,
    walletAddress,
    checkingWallet,
    connectWallet,
    disconnectWallet,
    sidebarLinks,
    setWalletAddress,
    isCurrentRole,
  };
};

export default useSupplyWorkspace;
