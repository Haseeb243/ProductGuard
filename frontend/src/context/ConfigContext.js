import React, { createContext, useContext, useMemo } from "react";

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const config = useMemo(() => {
    const apiBaseUrl =
      process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
    const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    const publicRpcUrl =
      process.env.REACT_APP_PUBLIC_RPC_URL ||
      process.env.REACT_APP_CHAIN_INDEXER_RPC_URL ||
      "http://127.0.0.1:8545";
    const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

    return {
      apiBaseUrl,
      contractAddress,
      publicRpcUrl,
      googleMapsApiKey,
      fileEndpoint: (type, filename) =>
        `${apiBaseUrl}/file/${type}/${filename}`,
      profileUrl: (username) => `${apiBaseUrl}/profile/${username}`,
    };
  }, []);

  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within a ConfigProvider");
  return ctx;
};

export default ConfigContext;
