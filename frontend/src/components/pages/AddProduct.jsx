import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import axios from "axios";
import QRCode from "qrcode.react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Geocode from "react-geocode";
import abi from "../../utils/Identeefi.json";
import { buildDescriptiveLocation } from "../../utils/location";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  glassButtonClass,
  SectionHeader,
  Divider,
} from "../admin/ui";
import useManufacturerWorkspace from "../../hooks/useManufacturerWorkspace";
import { truncateAddress } from "../../utils/wallet";

dayjs.extend(utc);

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
};

const formatLocation = (location) => {
  if (!location) return "Unknown";
  return location.replace(/;/g, ", ").replace(/\s+/g, " ").trim();
};

const AddProduct = () => {
  const { apiBaseUrl, contractAddress, googleMapsApiKey } = useConfig();
  const { auth, walletAddress, connectWallet, disconnectWallet, sidebarLinks } =
    useManufacturerWorkspace();

  const CONTRACT_ADDRESS = contractAddress;
  const contractABI = abi.abi;

  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState({ file: null, preview: null });
  const [qrData, setQrData] = useState("");
  const [manuDate, setManuDate] = useState(dayjs().unix());
  const [manuLatitude, setManuLatitude] = useState("");
  const [manuLongitude, setManuLongitude] = useState("");
  const [manuName, setManuName] = useState("");
  const [manuLocation, setManuLocation] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isUnique, setIsUnique] = useState(true);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [googleGeocodeDisabled, setGoogleGeocodeDisabled] = useState(false);
  const [googleGeocodeAlerted, setGoogleGeocodeAlerted] = useState(false);

  const getUsername = useCallback(async () => {
    if (!auth?.user) return;
    try {
      const res = await axios.get(`${apiBaseUrl}/profile/${auth.user}`);
      const row = Array.isArray(res?.data) ? res.data[0] : res?.data?.data?.[0];
      if (row?.name) {
        setManuName(row.name);
      }
    } catch (error) {
      console.error("Failed to fetch manufacturer profile", error);
      toast.error("Unable to load manufacturer profile");
    }
  }, [apiBaseUrl, auth?.user]);

  const getCurrentTimeLocation = useCallback(async () => {
    setManuDate(dayjs().unix());
    try {
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({
            name: "geolocation",
          });
          if (status.state === "denied") {
            toast.error(
              "Location access is blocked. Please enable permissions and retry."
            );
          }
        } catch {
          // ignore permission query failures
        }
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setManuLatitude(position.coords.latitude);
          setManuLongitude(position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation error", error);
          toast.error(
            "Unable to access device location. Enable location services and try again."
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (error) {
      console.warn("getCurrentTimeLocation failed", error);
    }
  }, []);

  useEffect(() => {
    getUsername();
    getCurrentTimeLocation();
  }, [getUsername, getCurrentTimeLocation]);

  useEffect(() => {
    if (
      !manuLatitude ||
      !manuLongitude ||
      Number.isNaN(Number(manuLatitude)) ||
      Number.isNaN(Number(manuLongitude))
    ) {
      return;
    }

    const performReverseGeocode = async () => {
      setReverseGeocoding(true);
      try {
        if (googleMapsApiKey && !googleGeocodeDisabled) {
          try {
            Geocode.setApiKey(googleMapsApiKey);
            const response = await Geocode.fromLatLng(
              manuLatitude,
              manuLongitude
            );
            const address = response.results?.[0]?.formatted_address;
            if (address) {
              setManuLocation(address.replace(/,/g, ";"));
              return;
            }
          } catch (error) {
            console.warn("Google reverse geocoding failed", error);
            const message = (error?.message || "").toString();
            if (
              !googleGeocodeDisabled &&
              (message.includes("REQUEST_DENIED") ||
                message.includes("This API project is not authorized") ||
                message.includes(
                  "API keys with referer restrictions cannot be used"
                ))
            ) {
              setGoogleGeocodeDisabled(true);
              if (!googleGeocodeAlerted) {
                setGoogleGeocodeAlerted(true);
                toast.error(
                  "Google Maps reverse geocoding failed. Using backup location service instead."
                );
              }
            }
          }
        }

        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
          manuLatitude
        )}&longitude=${encodeURIComponent(manuLongitude)}&localityLanguage=en`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          const descriptive = buildDescriptiveLocation(data);
          if (descriptive) {
            setManuLocation(descriptive.replace(/,/g, ";"));
            return;
          }
        }
      } catch (error) {
        console.warn("Reverse geocoding failed", error);
      } finally {
        setReverseGeocoding(false);
      }

      setManuLocation(`lat:${manuLatitude};lon:${manuLongitude}`);
    };

    performReverseGeocode();
  }, [
    manuLatitude,
    manuLongitude,
    googleMapsApiKey,
    googleGeocodeDisabled,
    googleGeocodeAlerted,
  ]);

  useEffect(() => {
    return () => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }
    };
  }, [image.preview]);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setImage({ file, preview: URL.createObjectURL(file) });
  };

  const clearImage = () => {
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setImage({ file: null, preview: null });
  };

  const generateQRCode = useCallback(
    (serial) => {
      if (!serial) {
        setQrData("");
        return;
      }
      setQrData(`${CONTRACT_ADDRESS},${serial}`);
    },
    [CONTRACT_ADDRESS]
  );

  const downloadQR = () => {
    const canvas = document.getElementById("add-product-qr-canvas");
    if (!canvas) return;
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${serialNumber || "product"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const checkUnique = useCallback(async () => {
    if (!serialNumber.trim()) {
      setIsUnique(true);
      return false;
    }
    try {
      const res = await axios.get(`${apiBaseUrl}/product/serialNumber`);
      const existingSerials = Array.isArray(res.data)
        ? res.data.map((product) => product.serialnumber)
        : [];
      const duplicates = existingSerials.includes(serialNumber);
      setIsUnique(!duplicates);
      if (duplicates) {
        toast.error("Serial number already exists in the system");
      }
      return !duplicates;
    } catch (error) {
      console.error("Unique check failed", error);
      toast.error("Unable to validate serial uniqueness");
      return false;
    }
  }, [apiBaseUrl, serialNumber]);

  const uploadImage = useCallback(async () => {
    if (!image.file) {
      toast.error("Attach a product image before submitting");
      return null;
    }
    const data = new FormData();
    data.append("image", image.file);
    try {
      const res = await axios.post(`${apiBaseUrl}/upload/product`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res?.data?.success) {
        return res.data;
      }
      toast.error(res?.data?.message || "Image upload failed. Try again.");
    } catch (error) {
      console.error("Image upload failed", error);
      toast.error(
        error?.response?.data?.message || "Image upload failed. Try again."
      );
    }
    return null;
  }, [apiBaseUrl, image.file]);

  const registerProductOnChain = useCallback(async () => {
    const { ethereum } = window;
    if (!ethereum) {
      throw new Error("MetaMask is required to register products");
    }
    const sanitizedDescription = description.replace(/,/g, ";");
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const productContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractABI,
        signer
      );
      const registerTxn = await productContract.registerProduct(
        name,
        brand,
        serialNumber,
        sanitizedDescription,
        image.file?.name || "",
        manuName,
        manuLocation,
        manuDate.toString()
      );
      setLoadingMessage("Waiting for on-chain confirmation…");
      await registerTxn.wait();
      return registerTxn.hash;
    } catch (error) {
      if (error?.code === 4001) {
        const rejectionError = new Error(
          "Transaction was rejected in MetaMask."
        );
        rejectionError.__handled = true;
        throw rejectionError;
      }
      throw error;
    }
  }, [
    CONTRACT_ADDRESS,
    contractABI,
    name,
    brand,
    serialNumber,
    description,
    image.file,
    manuName,
    manuLocation,
    manuDate,
  ]);

  const addProductRecord = useCallback(
    async ({ productImage } = {}) => {
      const normalizedDescription = description.trim();
      const latValue = Number(manuLatitude);
      const lonValue = Number(manuLongitude);

      const metadataPayload = {
        manufacturerDisplayName: manuName || auth?.user || null,
        manufacturingTimestampUnix: manuDate,
        manufacturingLocation: manuLocation || null,
      };
      if (Number.isFinite(latValue) || Number.isFinite(lonValue)) {
        metadataPayload.coordinates = {
          latitude: Number.isFinite(latValue) ? latValue : null,
          longitude: Number.isFinite(lonValue) ? lonValue : null,
        };
      }

      const payload = {
        serialNumber,
        name,
        brand,
        description: normalizedDescription,
        username: auth?.username || auth?.user || null,
        contractAddress: CONTRACT_ADDRESS,
        productImage: productImage || null,
        location: manuLocation || null,
        metadata: metadataPayload,
      };

      try {
        await axios.post(`${apiBaseUrl}/addproduct`, JSON.stringify(payload), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error?.response?.status === 409) {
          toast.error("This serial number is already registered.");
        } else {
          console.error("Failed to persist product record", error);
          toast.error(
            error?.response?.data?.message || "Failed to persist product record"
          );
        }
        try {
          error.__handled = true;
        } catch (assignError) {
          // ignore if property assignment fails
        }
        throw error;
      }
    },
    [
      CONTRACT_ADDRESS,
      apiBaseUrl,
      auth?.user,
      auth?.username,
      brand,
      description,
      manuDate,
      manuLatitude,
      manuLocation,
      manuLongitude,
      manuName,
      name,
      serialNumber,
    ]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const missingFields = [];
    if (!serialNumber.trim()) missingFields.push("Serial number");
    if (!name.trim()) missingFields.push("Product name");
    if (!brand.trim()) missingFields.push("Brand");
    if (!description.trim()) missingFields.push("Description");
    if (!image.file) missingFields.push("Product image");
    if (!walletAddress) missingFields.push("Connected wallet");

    if (missingFields.length) {
      toast.error(`Complete required fields: ${missingFields.join(", ")}`);
      return;
    }

    setSubmitting(true);
    setLoadingMessage("Validating serial uniqueness…");

    try {
      await getCurrentTimeLocation();
      const unique = await checkUnique();
      if (!unique) {
        return;
      }

      setLoadingMessage("Uploading product assets…");
      const uploaded = await uploadImage();
      if (!uploaded) {
        return;
      }
      if (!uploaded.fileName) {
        toast.error("Image upload response missing filename.");
        return;
      }

      setLoadingMessage("Awaiting wallet signature…");
      const txHash = await registerProductOnChain();
      console.log("Register product tx", txHash);

      setLoadingMessage("Persisting off-chain record…");
      await addProductRecord({ productImage: uploaded.fileName });

      generateQRCode(serialNumber);
      setLoadingMessage("");
      toast.success("Product registered successfully");
    } catch (error) {
      console.error("Product registration failed", error);
      if (error?.__handled) {
        // message already shown
      } else if (error?.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected in MetaMask.");
      } else {
        toast.error(error?.message || "Failed to register product");
      }
    } finally {
      setSubmitting(false);
      setLoadingMessage("");
    }
  };

  const metaSummary = useMemo(
    () => [
      {
        label: "Manufacturer",
        value: manuName || auth?.user || "Unknown",
        key: "manufacturer",
      },
      {
        label: "Wallet",
        value: walletAddress ? truncateAddress(walletAddress) : "Not connected",
        key: "wallet",
      },
      {
        label: "Contract",
        value: CONTRACT_ADDRESS ? truncateAddress(CONTRACT_ADDRESS) : "Unset",
        key: "contract",
      },
      {
        label: "Location",
        value: formatLocation(manuLocation),
        key: "location",
      },
    ],
    [CONTRACT_ADDRESS, walletAddress, manuLocation, manuName, auth?.user]
  );

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={connectWallet}
        className={glassButtonClass}
      >
        {walletAddress ? "Switch wallet" : "Connect wallet"}
      </button>
      {walletAddress ? (
        <button
          type="button"
          onClick={disconnectWallet}
          className={`${glassButtonClass} border-rose-300/40 bg-rose-500/10 hover:border-rose-200/60 hover:bg-rose-500/20`}
        >
          Disconnect
        </button>
      ) : null}
      <button
        type="button"
        onClick={getCurrentTimeLocation}
        className={glassButtonClass}
      >
        Refresh location
      </button>
      <Link to="/manufacturer" className={glassButtonClass}>
        Manufacturer dashboard
      </Link>
    </div>
  );

  const quickLinksToolbar = (
    <GlassCard className="w-full" padding="p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Connect MetaMask",
            complete: Boolean(walletAddress),
          },
          {
            title: "Prepare product metadata",
            complete: Boolean(serialNumber && name && brand),
          },
          {
            title: "Attach imagery",
            complete: Boolean(image.file),
          },
          {
            title: "Capture geolocation",
            complete: Boolean(manuLatitude && manuLongitude),
          },
        ].map((step) => (
          <div
            key={step.title}
            className={`rounded-2xl border px-4 py-3 text-sm transition ${
              step.complete
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-50"
                : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            {step.complete ? "✔" : "○"} {step.title}
          </div>
        ))}
      </div>
    </GlassCard>
  );

  return (
    <AdminShell
      title="Product Onboarding Studio"
      subtitle="Mint new items on-chain, anchor provenance, and distribute verifiable product QR codes from a single workspace."
      meta={metaSummary}
      actions={headerActions}
      toolbar={quickLinksToolbar}
      sidebarTitle="Manufacturer"
      sidebarLinks={sidebarLinks || undefined}
      forceSidebar={Boolean(sidebarLinks)}
      workspaceLabel="Manufacturer Hub"
      showHeaderNotifications={false}
    >
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[1350px] flex-col gap-10"
      >
        <GradientBorderCard className="relative overflow-hidden p-8">
          <span className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
          <span className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/60">
                Supply chain provenance
              </p>
              <h2 className="text-3xl font-semibold text-white">
                Register serialized inventory with confidence
              </h2>
              <p className="max-w-3xl text-sm text-white/70">
                Gather SKU metadata, capture manufacturing coordinates, and
                anchor the asset on-chain in a single guided flow. Once
                registered you can share the generated QR code across packaging,
                invoices, and partner portals.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
                  Local timestamp{" "}
                  {formatDateTime(dayjs.unix(manuDate).toDate())}
                </span>
                {loadingMessage ? (
                  <span className="rounded-full border border-sky-300/40 bg-sky-500/10 px-3 py-1 text-sky-100">
                    {loadingMessage}
                  </span>
                ) : null}
              </div>
            </div>
            <GlassCard className="w-full max-w-sm space-y-4 border border-white/15 bg-black/40 p-6 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                Progress
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Serial captured</span>
                  <span>{serialNumber ? "✔" : "○"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Wallet connected</span>
                  <span>{walletAddress ? "✔" : "○"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Image attached</span>
                  <span>{image.file ? "✔" : "○"}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </GradientBorderCard>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <GlassCard className="p-7">
              <SectionHeader
                eyebrow="Product metadata"
                title="Core details"
                description="Serial ensures uniqueness on-chain while descriptive fields keep downstream partners aligned."
              />
              <Divider className="my-6" />
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Serial number
                  </span>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(event) => {
                      setSerialNumber(event.target.value);
                      setIsUnique(true);
                    }}
                    className={`rounded-2xl border px-4 py-2.5 text-sm text-white/80 transition focus:border-white/50 focus:outline-none focus:ring-0 ${
                      isUnique
                        ? "border-white/12 bg-white/10"
                        : "border-rose-400/50 bg-rose-500/10"
                    }`}
                    placeholder="e.g. PG-2025-0001"
                  />
                  {!isUnique ? (
                    <span className="text-xs text-rose-200">
                      Serial already exists. Choose another identifier.
                    </span>
                  ) : null}
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Product name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80 transition focus:border-white/50 focus:outline-none focus:ring-0"
                    placeholder="e.g. Signature Handbag"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Brand
                  </span>
                  <input
                    type="text"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80 transition focus:border-white/50 focus:outline-none focus:ring-0"
                    placeholder="Brand name"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Description
                  </span>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm text-white/80 transition focus:border-white/50 focus:outline-none focus:ring-0"
                    placeholder="Material composition, unique identifiers, packaging notes…"
                  />
                </label>
              </div>
            </GlassCard>

            <GlassCard className="p-7">
              <SectionHeader
                eyebrow="Manufacturing context"
                title="Capture provenance"
                description="Coordinates and timestamps drive transparency analytics across the network."
              />
              <Divider className="my-6" />
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Timestamp (UTC)
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={dayjs
                      .unix(manuDate)
                      .utc()
                      .format("YYYY-MM-DD HH:mm:ss")}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80 transition focus:border-white/50 focus:outline-none focus:ring-0"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Location
                  </span>
                  <div className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80">
                    <div>{formatLocation(manuLocation)}</div>
                    {reverseGeocoding ? (
                      <div className="text-xs text-white/50">
                        Resolving precise address…
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Coordinates
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      readOnly
                      value={manuLatitude}
                      className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80 transition focus:border-white/50 focus:outline-none focus:ring-0"
                      placeholder="Latitude"
                    />
                    <input
                      type="text"
                      readOnly
                      value={manuLongitude}
                      className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80 transition focus:border-white/50 focus:outline-none focus:ring-0"
                      placeholder="Longitude"
                    />
                  </div>
                </label>
              </div>
            </GlassCard>

            <GlassCard className="p-7">
              <SectionHeader
                eyebrow="Product imagery"
                title="Visual assets"
                description="Showcase your product with high-quality images that represent its features and quality."
              />
              <Divider className="my-6" />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Attach image
                  </span>
                  <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 transition hover:border-white/20">
                    <span className="text-sm text-white/70">
                      {image.file
                        ? image.file.name
                        : "PNG, JPG, or GIF (max. 5MB)"}
                    </span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/gif"
                      onChange={handleImage}
                      className="hidden"
                    />
                  </label>
                </div>
                {image.preview ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                    <img
                      src={image.preview}
                      alt="Product preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/60"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : null}
                {image.file && !image.preview ? (
                  <div className="text-sm text-white/70">
                    Image is being uploaded, please wait...
                  </div>
                ) : null}
              </div>
            </GlassCard>

            {qrData ? (
              <GlassCard className="p-7" id="add-product-qr-section">
                <SectionHeader
                  eyebrow="Product QR code"
                  title="Verify and download"
                  description="Ensure the QR code is scannable and contains the correct product data."
                />
                <Divider className="my-6" />
                <div className="flex flex-col gap-4">
                  <div className="flex justify-center">
                    <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 text-center shadow-[0_40px_120px_-60px_rgba(15,18,54,0.85)]">
                      <QRCode
                        id="add-product-qr-canvas"
                        value={qrData}
                        size={256}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                        includeMargin
                      />
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                        Scan-ready
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadQR}
                    className={`${glassButtonClass} w-full`}
                  >
                    Download QR code
                  </button>
                </div>
              </GlassCard>
            ) : null}
          </div>

          <div className="sticky top-20 hidden h-fit max-w-sm flex-col gap-6 lg:flex">
            <GlassCard className="p-6">
              <SectionHeader
                eyebrow="Wallet & location"
                title="Current session"
                description="Connected wallet and geolocation data that will be used for product registration."
              />
              <Divider className="my-4" />
              <div className="flex flex-col gap-4 text-sm text-white/70">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Wallet address
                  </span>
                  <span>
                    {walletAddress
                      ? truncateAddress(walletAddress)
                      : "Not connected"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Location
                  </span>
                  <span>{formatLocation(manuLocation)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Timestamp
                  </span>
                  <span>{formatDateTime(dayjs.unix(manuDate).toDate())}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <SectionHeader
                eyebrow="Next steps"
                title="Ready to register?"
                description="Once all fields are complete and assets are uploaded, register the product to mint its on-chain identity."
              />
              <Divider className="my-4" />
              <div className="flex flex-col gap-4 text-sm text-white/70">
                <p>
                  After registering, you will receive a verifiable QR code that
                  links to the product's on-chain record.
                </p>
                <button type="submit" className={`${glassButtonClass} mt-4`}>
                  {submitting ? "Registering..." : "Register product"}
                </button>
              </div>
            </GlassCard>
          </div>
        </section>
      </form>
    </AdminShell>
  );
};

export default AddProduct;
