export const getEthereumObject = () => window.ethereum;

export const findMetaMaskAccount = async () => {
  try {
    const ethereum = getEthereumObject();
    if (!ethereum) {
      return null;
    }
    const accounts = await ethereum.request({ method: "eth_accounts" });
    return accounts.length ? accounts[0] : null;
  } catch (error) {
    console.error("Failed to locate MetaMask account", error);
    return null;
  }
};

export const truncateAddress = (
  address,
  { leading = 6, trailing = 4 } = {}
) => {
  if (!address) return "";
  if (address.length <= leading + trailing) return address;
  return `${address.slice(0, leading)}…${address.slice(-trailing)}`;
};
