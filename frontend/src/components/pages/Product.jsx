import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import dayjs from "dayjs";
import abi from "../../utils/Identeefi.json";
import bgImg from "../../img/bg.png";
import { useConfig } from "../../context/ConfigContext";

const Product = () => {
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("Product");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [history, setHistory] = useState([]);
  const [isSold, setIsSold] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);

  const { apiBaseUrl, contractAddress, publicRpcUrl } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const qrData = location.state?.qrData;
  const flaggedSuspicious = Boolean(location.state?.isSuspicious);
  const scanLocation = location.state?.scanLocation;
  const scanLocationDisplay =
    scanLocation?.locationDisplay ||
    scanLocation?.locationString ||
    "Not captured";
  const scanRegion = [scanLocation?.geoCity, scanLocation?.geoCountry]
    .filter(Boolean)
    .join(", ");
  const scanCoordinates =
    scanLocation?.coordinates &&
    typeof scanLocation.coordinates.latitude === "number" &&
    typeof scanLocation.coordinates.longitude === "number"
      ? `${scanLocation.coordinates.latitude.toFixed(
          4
        )}, ${scanLocation.coordinates.longitude.toFixed(4)}`
      : null;
  const scanTimestamp = scanLocation?.scannedAt
    ? dayjs(scanLocation.scannedAt).format("MMM D, YYYY h:mm A")
    : null;
  const scanSourceLabel = scanLocation?.locationSource
    ? scanLocation.locationSource.charAt(0).toUpperCase() +
      scanLocation.locationSource.slice(1)
    : null;

  const setProductData = useCallback(
    (dataString) => {
      if (!dataString) {
        return;
      }
      const segments = dataString.split(",");
      setName(segments[1] || "Product");
      setBrand(segments[2] || "");
      setDescription((segments[3] || "").replace(/;/g, ","));
      const imageKey = segments[4];
      setImageUrl(imageKey ? `${apiBaseUrl}/file/product/${imageKey}` : null);

      const provenance = [];
      let soldFlagEncountered = false;
      for (let index = 5; index + 4 < segments.length; index += 5) {
        const actor = segments[index + 1] || "Unknown actor";
        const loc = (segments[index + 2] || "").replace(/;/g, ",");
        const timestamp = Number(segments[index + 3] || 0);
        const eventSold = segments[index + 4] === "true";
        if (eventSold) {
          soldFlagEncountered = true;
        }
        provenance.push({
          id: segments[index] || `${index}`,
          actor,
          location: loc,
          timestamp,
          isSold: eventSold,
        });
      }
      setHistory(provenance);
      setIsSold(soldFlagEncountered);
    },
    [apiBaseUrl]
  );

  const loadProductFromQr = useCallback(
    async (payload) => {
      if (!payload) {
        setLoadError("No QR data supplied. Please scan again.");
        return;
      }
      const parts = payload.split(",");
      const scannedContract = (parts[0] || "").trim();
      const scannedSerial = (parts[1] || "").trim();
      setSerialNumber(scannedSerial);

      if (!contractAddress) {
        setLoadError("Contract address is not configured.");
        return;
      }
      if (!scannedSerial) {
        setLoadError("Invalid QR payload.");
        return;
      }
      if (scannedContract !== contractAddress) {
        setLoadError("Scanned QR does not match the configured contract.");
        return;
      }

      try {
        setLoading(true);
        setLoadError("");
        setOwner(null);
        let provider;
        if (window.ethereum) {
          provider = new ethers.providers.Web3Provider(window.ethereum);
        } else if (publicRpcUrl) {
          provider = new ethers.providers.JsonRpcProvider(publicRpcUrl);
        } else {
          provider = ethers.getDefaultProvider();
        }

        const productContract = new ethers.Contract(
          contractAddress,
          abi.abi,
          provider
        );
        const product = await productContract.getProduct(scannedSerial);
        setProductData(product.toString());

        try {
          const resp = await fetch(`${apiBaseUrl}/ownership/${scannedSerial}`);
          if (resp.ok) {
            const body = await resp.json();
            if (body?.success && body?.owner) {
              setOwner(body.owner);
            }
          }
        } catch (fetchError) {
          console.warn("Failed to fetch owner details:", fetchError);
        }
      } catch (error) {
        console.error("Blockchain lookup failed", error);
        setLoadError("Unable to read product details from the blockchain.");
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, contractAddress, publicRpcUrl, setProductData]
  );

  useEffect(() => {
    if (!qrData) {
      setLoadError("No product information found. Start a new scan.");
      return;
    }
    loadProductFromQr(qrData);
  }, [loadProductFromQr, qrData]);

  const handleBack = () => {
    navigate("/scanner");
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,20,0.9),rgba(10,10,20,0.95)), url(${bgImg})`,
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-16 md:px-8">
        <div className="text-center text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-primary-200/80">
            Authenticity result
          </p>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Product details
          </h1>
          <p className="mt-3 text-sm text-white/70 md:text-base">
            Review provenance, ownership, and scan metadata for your product.
          </p>
        </div>

        {flaggedSuspicious && (
          <div className="mt-8 rounded-3xl border border-yellow-400/40 bg-yellow-500/10 p-5 text-sm text-yellow-100 backdrop-blur-md">
            <p className="font-semibold uppercase tracking-[0.25em]">Warning</p>
            <p className="mt-2 text-yellow-50/90">
              This scan triggered suspicious patterns. Inspect the timeline
              closely and contact the manufacturer if anything looks off.
            </p>
          </div>
        )}

        {loadError && (
          <div className="mt-8 rounded-3xl border border-rose-400/40 bg-rose-500/10 p-5 text-sm text-rose-100 backdrop-blur-md">
            {loadError}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/15 bg-black/50 p-6 text-white backdrop-blur-lg">
              <div className="flex flex-col gap-6 md:flex-row">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="h-32 w-32 rounded-3xl object-cover shadow-lg md:h-40 md:w-40"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white/10 text-3xl font-bold text-white md:h-40 md:w-40">
                    {name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                      Product name
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{name}</h2>
                  </div>
                  <div className="grid gap-3 text-sm text-white/70 md:grid-cols-2">
                    <div>
                      <span className="text-white/50">Brand</span>
                      <p className="text-white">{brand || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-white/50">Serial number</span>
                      <p className="text-white font-mono text-sm">
                        {serialNumber || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                      Description
                    </span>
                    <p className="mt-2 text-sm text-white/80">
                      {description || "No description provided."}
                    </p>
                  </div>
                  {loading && (
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Fetching the latest product state…
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-white backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                Provenance timeline
              </p>
              {history.length ? (
                <div className="mt-4 space-y-4">
                  {history.map((item, index) => {
                    const formattedDate = item.timestamp
                      ? dayjs(item.timestamp * 1000).format("MMM D, YYYY")
                      : "Unknown date";
                    const formattedTime = item.timestamp
                      ? dayjs(item.timestamp * 1000).format("h:mm A")
                      : "";
                    return (
                      <div key={`${item.id}-${index}`} className="flex gap-4">
                        <div className="flex flex-col items-center pt-1">
                          <span
                            className={`h-3 w-3 rounded-full ${
                              item.isSold ? "bg-emerald-400" : "bg-primary-300"
                            }`}
                          ></span>
                          {index < history.length - 1 && (
                            <span className="mt-1 h-full w-px flex-1 bg-white/20"></span>
                          )}
                        </div>
                        <div className="flex-1 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-white">
                              {formattedDate}
                              {formattedTime ? ` · ${formattedTime}` : ""}
                            </span>
                            {item.isSold && (
                              <span className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200">
                                Sold
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-white/60">
                            Actor:{" "}
                            <span className="text-white">{item.actor}</span>
                          </p>
                          <p className="text-white/60">
                            Location:{" "}
                            <span className="text-white">{item.location}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-center text-white/70">
                  No provenance history available for this product.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/15 bg-black/50 p-6 text-white backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                Scan metadata
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/80">
                <div className="flex flex-col gap-1 rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Location</span>
                  <span className="font-semibold text-white">
                    {scanLocationDisplay}
                  </span>
                  {scanRegion && (
                    <span className="text-white/60">{scanRegion}</span>
                  )}
                  {scanCoordinates && (
                    <span className="text-white/50">
                      Coordinates: {scanCoordinates}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Scanned at</span>
                  <span className="font-semibold text-white">
                    {scanTimestamp || "Not available"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Location source</span>
                  <span className="font-semibold text-white">
                    {scanSourceLabel || "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-white backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                Product status
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/80">
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Authenticity</span>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${
                      flaggedSuspicious
                        ? "border-yellow-300/40 bg-yellow-500/20 text-yellow-100"
                        : "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                    }`}
                  >
                    {flaggedSuspicious ? "Review" : "Authentic"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Sold on-chain</span>
                  <span className="font-semibold text-white">
                    {isSold ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Provenance events</span>
                  <span className="font-semibold text-white">
                    {history.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-white backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                Current owner
              </p>
              {owner ? (
                <div className="mt-4 space-y-3 text-sm text-white/80">
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <span className="text-white/60">Name</span>
                    <span className="font-semibold text-white">
                      {owner.owner_name || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <span className="text-white/60">Identifier</span>
                    <span className="font-semibold text-white">
                      {owner.owner_identifier || "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <span className="text-white/60">Since</span>
                    <span className="font-semibold text-white">
                      {owner.acquired_at
                        ? dayjs(owner.acquired_at).format("MMM D, YYYY h:mm A")
                        : "Not available"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/70">
                  Owner information not available for this product.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleBack}
            className="rounded-3xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-600"
          >
            Scan another product
          </button>
        </div>
      </div>
    </div>
  );
};

export default Product;
