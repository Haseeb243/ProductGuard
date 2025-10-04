import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Geocode from "react-geocode";
import QrScanner from "../QrScanner";
import useAuth from "../../hooks/useAuth";
import { useConfig } from "../../context/ConfigContext";
import axios from "../../api/axios";
import { buildDescriptiveLocation } from "../../utils/location";
import bgImg from "../../img/bg.png";

const parseSerialFromQr = (payload = "") => {
  const parts = payload.split(",");
  return (parts[1] || "").trim();
};

const parseContractFromQr = (payload = "") => {
  const parts = payload.split(",");
  return (parts[0] || "").trim();
};

const sanitizeName = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const inferCityCountryFromLocationString = (value) => {
  if (!value || typeof value !== "string") {
    return { city: null, country: null };
  }

  const tokens = value
    .split(",")
    .map((token) => sanitizeName(token))
    .filter((token) => token && !/^lat:/i.test(token) && !/^lon:/i.test(token));

  if (!tokens.length) {
    return { city: null, country: null };
  }

  const country = tokens[tokens.length - 1] || null;
  let city = null;

  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const candidate = tokens[index];
    if (candidate) {
      city = candidate;
      break;
    }
  }

  return { city, country };
};

const decodeQrFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        import("jsqr").then(({ default: jsQR }) => {
          const result = jsQR(
            imageData.data,
            imageData.width,
            imageData.height
          );
          resolve(result?.data || null);
        });
      };
      image.onerror = () => reject(new Error("Unable to decode image"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
};

const ScannerPage = () => {
  const { contractAddress, googleMapsApiKey } = useConfig();
  const { auth } = useAuth();
  const navigate = useNavigate();

  const [qrData, setQrData] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState("");
  const [geoCity, setGeoCity] = useState("");
  const [geoCountry, setGeoCountry] = useState("");
  const [geoError, setGeoError] = useState("");
  const [locationSource, setLocationSource] = useState("pending");
  const [coordinates, setCoordinates] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const locationSnapshotRef = useRef({
    coordinates: null,
    locationString: null,
    geoCountry: null,
    geoCity: null,
    locationSource: "pending",
  });

  const updateLocationSnapshot = useCallback((updates = {}) => {
    const normalized = { ...locationSnapshotRef.current };

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        normalized[key] = trimmed.length ? trimmed : null;
      } else {
        normalized[key] = value;
      }
    });

    locationSnapshotRef.current = normalized;
  }, []);

  const resolveLocationFromCoordinates = useCallback(
    async (lat, lon) => {
      if (typeof lat !== "number" || typeof lon !== "number") {
        return;
      }
      setGeoError("");
      updateLocationSnapshot({
        coordinates: { latitude: lat, longitude: lon },
      });

      if (googleMapsApiKey) {
        try {
          Geocode.setApiKey(googleMapsApiKey);
          const response = await Geocode.fromLatLng(lat, lon);
          const result = response?.results?.[0];
          const address = sanitizeName(result?.formatted_address);
          if (address) {
            const components = result?.address_components || [];
            const countryComponent = components.find((component) =>
              component.types?.includes("country")
            );
            const localityComponent =
              components.find((component) =>
                component.types?.includes("locality")
              ) ||
              components.find((component) =>
                component.types?.includes("administrative_area_level_1")
              ) ||
              components.find((component) =>
                component.types?.includes("administrative_area_level_2")
              );
            const derivedCountry = sanitizeName(countryComponent?.long_name);
            const derivedCity = sanitizeName(localityComponent?.long_name);

            setResolvedLocation(address);
            setGeoCountry(derivedCountry || "");
            setGeoCity(derivedCity || "");
            setLocationSource("google");
            updateLocationSnapshot({
              locationString: address,
              geoCountry: derivedCountry ?? null,
              geoCity: derivedCity ?? null,
              locationSource: "google",
            });
            return;
          }
        } catch (error) {
          console.warn("Google reverse geocoding failed:", error);
        }
      }

      try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
          lat
        )}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const rawCountry =
            sanitizeName(data.countryName) || sanitizeName(data.countryCode);
          const rawCity =
            sanitizeName(data.city) ||
            sanitizeName(data.locality) ||
            sanitizeName(data.principalSubdivision);
          let descriptive = buildDescriptiveLocation(data);
          if (!descriptive && (rawCity || rawCountry)) {
            descriptive = [rawCity, rawCountry].filter(Boolean).join(", ");
          }

          if (descriptive) {
            setResolvedLocation(descriptive);
          }
          if (rawCountry || descriptive) {
            setGeoCountry(rawCountry || "");
          }
          if (rawCity || descriptive) {
            setGeoCity(rawCity || "");
          }
          if (descriptive || rawCountry || rawCity) {
            setLocationSource("bigdatacloud");
            updateLocationSnapshot({
              locationString:
                descriptive || locationSnapshotRef.current.locationString,
              geoCountry: rawCountry ?? locationSnapshotRef.current.geoCountry,
              geoCity: rawCity ?? locationSnapshotRef.current.geoCity,
              locationSource: "bigdatacloud",
            });
            if (descriptive) {
              return;
            }
          }
        }
      } catch (error) {
        console.warn("BigDataCloud reverse geocoding failed:", error);
      }

      const fallbackLocation = `lat:${lat};lon:${lon}`;
      setResolvedLocation((current) => current || fallbackLocation);
      setLocationSource((current) =>
        current && current !== "pending" ? current : "coordinates"
      );
      if (!locationSnapshotRef.current.locationString) {
        updateLocationSnapshot({
          locationString: fallbackLocation,
        });
      }
      if (!locationSnapshotRef.current.locationSource) {
        updateLocationSnapshot({ locationSource: "coordinates" });
      }
      if (!locationSnapshotRef.current.geoCountry) {
        setGeoCountry("");
      }
      if (!locationSnapshotRef.current.geoCity) {
        setGeoCity("");
      }
    },
    [googleMapsApiKey, updateLocationSnapshot]
  );

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      setLocationSource("unsupported");
      updateLocationSnapshot({ locationSource: "unsupported" });
      return;
    }

    setGeoError("");
    setLocationSource("pending");
    updateLocationSnapshot({ locationSource: "pending" });
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });
        updateLocationSnapshot({
          coordinates: { latitude, longitude },
          locationSource: "gps",
        });
        setCapturingLocation(false);
        setLocationSource("gps");
        resolveLocationFromCoordinates(latitude, longitude);
      },
      (error) => {
        console.warn("Geolocation error:", error?.message || error);
        setCapturingLocation(false);
        setGeoError(
          error?.message ||
            "Unable to access device location. Enable permissions and retry."
        );
        setLocationSource("denied");
        updateLocationSnapshot({ locationSource: "denied" });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [resolveLocationFromCoordinates, updateLocationSnapshot]);

  useEffect(() => {
    captureLocation();
  }, [captureLocation]);

  const username = auth?.username || auth?.user || "anonymous";

  const locationStatusText = useMemo(() => {
    if (capturingLocation) return "Capturing location…";
    if (resolvedLocation) return resolvedLocation;
    if (geoError) return geoError;
    if (locationSource === "denied") return "Location permission denied";
    if (locationSource === "unsupported") return "Geolocation unsupported";
    if (locationSource === "pending") return "Awaiting permission";
    return "Location not captured";
  }, [capturingLocation, geoError, locationSource, resolvedLocation]);

  const handleCameraScan = useCallback((data) => {
    if (!data) return;
    setVerifyError(null);
    setQrData(data);
  }, []);

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const decoded = await decodeQrFromFile(file);
      if (decoded) {
        setVerifyError(null);
        setQrData(decoded);
      } else {
        toast.error("No QR code detected in the uploaded image.");
      }
    } catch (err) {
      console.error("Failed to decode QR from file", err);
      toast.error(err?.message || "Failed to read QR image");
    } finally {
      event.target.value = "";
    }
  }, []);

  const verifyQr = useCallback(
    async (payload) => {
      if (!payload) return;
      setVerifying(true);
      setVerifyError(null);

      const snapshot = locationSnapshotRef.current || {};
      const coordsSnapshot = coordinates
        ? {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          }
        : snapshot.coordinates
        ? {
            latitude: snapshot.coordinates.latitude,
            longitude: snapshot.coordinates.longitude,
          }
        : null;
      const primaryLocationString =
        sanitizeName(resolvedLocation) ||
        sanitizeName(snapshot.locationString) ||
        (coordsSnapshot
          ? `lat:${coordsSnapshot.latitude};lon:${coordsSnapshot.longitude}`
          : null);
      const locationDisplay =
        primaryLocationString ||
        (coordsSnapshot
          ? `lat:${coordsSnapshot.latitude.toFixed(
              4
            )}, lon:${coordsSnapshot.longitude.toFixed(4)}`
          : geoError || "");
      const fallbackCityCountry = inferCityCountryFromLocationString(
        primaryLocationString || snapshot.locationString || ""
      );
      const geoCountryValue =
        sanitizeName(geoCountry) ||
        sanitizeName(snapshot.geoCountry) ||
        fallbackCityCountry.country ||
        null;
      const geoCityValue =
        sanitizeName(geoCity) ||
        sanitizeName(snapshot.geoCity) ||
        fallbackCityCountry.city ||
        null;
      const effectiveLocationSource =
        locationSource && locationSource !== "pending"
          ? locationSource
          : snapshot.locationSource || null;

      updateLocationSnapshot({
        locationString: primaryLocationString ?? undefined,
        geoCountry: geoCountryValue ?? undefined,
        geoCity: geoCityValue ?? undefined,
        coordinates: coordsSnapshot ?? undefined,
        locationSource: effectiveLocationSource ?? undefined,
      });

      const locationContext = {
        locationString: primaryLocationString,
        locationDisplay,
        locationSource: effectiveLocationSource,
        geoCountry: geoCountryValue,
        geoCity: geoCityValue,
        coordinates: coordsSnapshot,
      };
      const scannedAt = new Date();

      const handleOutcome = (outcome, targetPath, stateOverrides = {}) => {
        const record = {
          raw: payload,
          serial: parseSerialFromQr(payload),
          isAuthentic: outcome.isAuthentic,
          isSuspicious: outcome.isSuspicious,
          timestamp: scannedAt,
          locationDisplay: locationContext.locationDisplay,
          geoCountry: locationContext.geoCountry,
          geoCity: locationContext.geoCity,
        };
        setScanHistory((prev) => [record, ...prev].slice(0, 5));
        navigate(targetPath, {
          state: {
            qrData: payload,
            isSuspicious: outcome.isSuspicious,
            scanLocation: {
              ...locationContext,
              scannedAt: scannedAt.toISOString(),
            },
            ...stateOverrides,
          },
        });
      };

      try {
        const response = await axios.post("/verification/scan", {
          qrData: payload,
          username,
          location: locationContext.locationString,
          coordinates: coordsSnapshot,
          geoCountry: locationContext.geoCountry,
          geoCity: locationContext.geoCity,
          locationSource: locationContext.locationSource,
        });
        const { isAuthentic, isSuspicious } = response.data || {};
        const outcome = {
          isAuthentic: Boolean(isAuthentic),
          isSuspicious: Boolean(isSuspicious),
        };
        if (outcome.isAuthentic) {
          handleOutcome(outcome, "/product");
        } else {
          handleOutcome(outcome, "/fake-product");
        }
      } catch (err) {
        console.error("Verification request failed", err);
        const fallbackContract = parseContractFromQr(payload);
        const outcome = { isAuthentic: false, isSuspicious: false };
        if (fallbackContract && fallbackContract === contractAddress) {
          outcome.isAuthentic = true;
          handleOutcome(outcome, "/product", { fallback: true });
          toast.error(
            "Live verification unavailable. Using contract match fallback."
          );
        } else {
          handleOutcome(outcome, "/fake-product", { fallback: true });
          toast.error("Verification failed. Flagging as suspicious.");
        }
        setVerifyError(err?.message || "Unable to reach verification service.");
      } finally {
        setVerifying(false);
      }
    },
    [
      contractAddress,
      coordinates,
      geoCity,
      geoCountry,
      geoError,
      locationSource,
      navigate,
      resolvedLocation,
      updateLocationSnapshot,
      username,
    ]
  );

  useEffect(() => {
    if (qrData) {
      verifyQr(qrData);
    }
  }, [qrData, verifyQr]);

  const recentEntries = useMemo(() => scanHistory.slice(0, 5), [scanHistory]);

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(12,12,18,0.9), rgba(12,12,18,0.95)), url(${bgImg})`,
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-16 md:px-8">
        <div className="text-center text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-primary-200/80">
            Consumer authenticity scan
          </p>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Verify your product in seconds
          </h1>
          <p className="mt-3 text-sm text-white/70 md:text-base">
            We capture your scan location, validate the QR on-chain, and guide
            you to the right next step.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary-200/70">
                  Location log
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {locationStatusText}
                </p>
                {(geoCity || geoCountry) && (
                  <p className="text-xs text-white/60">
                    {[geoCity, geoCountry].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={captureLocation}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/20 disabled:opacity-50"
                disabled={capturingLocation}
              >
                {capturingLocation ? "Capturing…" : "Refresh"}
              </button>
            </div>
            <div className="rounded-3xl border border-white/15 bg-black/50 p-4">
              <QrScanner passData={handleCameraScan} />
              <p className="mt-3 text-xs text-white/60">
                Align the QR inside the frame. We auto-redirect once the scan is
                verified.
              </p>
            </div>
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-sm text-white/60 transition hover:border-white/40 hover:bg-white/10">
              <span className="font-semibold text-white">Upload QR image</span>
              <span className="mt-1 text-xs text-white/50">
                Supports JPG, PNG, WebP up to 10 MB
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            {verifying && (
              <p className="text-sm text-white/70">Verifying your scan…</p>
            )}
            {verifyError && (
              <p className="text-sm text-rose-200/80">{verifyError}</p>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/70">
                Session snapshot
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Last serial</span>
                  <span className="font-semibold text-white">
                    {recentEntries[0]?.serial || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Last status</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                      !recentEntries.length
                        ? "border-white/20 bg-white/5 text-white/60"
                        : recentEntries[0].isAuthentic
                        ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                        : "border-rose-300/40 bg-rose-500/15 text-rose-200"
                    }`}
                  >
                    {recentEntries.length
                      ? recentEntries[0].isAuthentic
                        ? "Authentic"
                        : "Flagged"
                      : verifying
                      ? "Verifying"
                      : "Idle"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Scans this session</span>
                  <span className="font-semibold text-white">
                    {scanHistory.length}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/70">
                Recent scans
              </p>
              {recentEntries.length ? (
                <div className="mt-4 space-y-3">
                  {recentEntries.map((entry, index) => (
                    <div
                      key={`${entry.raw}-${index}`}
                      className="rounded-2xl border border-white/12 bg-black/40 p-4 text-xs text-white/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white text-sm">
                          {entry.serial || "Unknown serial"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${
                            entry.isAuthentic
                              ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                              : "border-rose-300/40 bg-rose-500/15 text-rose-200"
                          }`}
                        >
                          {entry.isAuthentic ? "Authentic" : "Flagged"}
                        </span>
                      </div>
                      <div className="mt-2 break-all text-white/60">
                        {entry.raw}
                      </div>
                      {entry.locationDisplay && (
                        <div className="mt-2 text-white/50">
                          {entry.locationDisplay}
                        </div>
                      )}
                      {(entry.geoCity || entry.geoCountry) && (
                        <div className="text-white/40">
                          {[entry.geoCity, entry.geoCountry]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                      <div className="mt-2 text-white/40">
                        {entry.timestamp.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-white/60">
                  Scans from this browser will appear here for quick reference.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;
