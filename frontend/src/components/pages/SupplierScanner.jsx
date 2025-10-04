import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { toast } from "react-hot-toast";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  SectionHeader,
  Divider,
  glassButtonClass,
} from "../admin/ui";
import QrScanner from "../QrScanner";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";
import { useConfig } from "../../context/ConfigContext";
import axios from "../../api/axios";
import Geocode from "react-geocode";
import { buildDescriptiveLocation } from "../../utils/location";

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
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(result?.data || null);
      };
      image.onerror = () => reject(new Error("Unable to decode image"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
};

const defaultCopy = {
  roleLabel: "Supplier",
  workspaceLabel: "Supplier Hub",
  shellTitle: "Supplier Scanner",
  shellSubtitle:
    "Verify shipments, capture QR evidence, and step through product updates in one flow.",
};

const SupplierScanner = ({
  workspaceHook = useSupplierWorkspace,
  copy: copyOverrides = {},
} = {}) => {
  const resolvedHook = workspaceHook || useSupplierWorkspace;
  const workspace = resolvedHook();
  const {
    auth,
    sidebarLinks,
    isSupplier = false,
    isRetailer = false,
    isCurrentRole = false,
  } = workspace || {};

  const capitalizedAuthRole = auth?.role
    ? auth.role.charAt(0).toUpperCase() + auth.role.slice(1)
    : null;
  const roleLabel =
    copyOverrides.roleLabel || capitalizedAuthRole || defaultCopy.roleLabel;
  const copy = useMemo(
    () => ({
      ...defaultCopy,
      ...copyOverrides,
      roleLabel,
    }),
    [copyOverrides, roleLabel]
  );
  const roleLower = roleLabel.toLowerCase();
  const applyRole = useCallback(
    (value) => {
      if (typeof value !== "string") return value;
      return value
        .replace(/Supplier/g, roleLabel)
        .replace(/supplier/g, roleLower);
    },
    [roleLabel, roleLower]
  );

  const forceSidebar =
    typeof isCurrentRole === "boolean"
      ? isCurrentRole
      : Boolean(isSupplier || isRetailer);
  const workspaceLabel = applyRole(copy.workspaceLabel || `${roleLabel} Hub`);
  const { contractAddress, googleMapsApiKey } = useConfig();
  const navigate = useNavigate();

  const [qrData, setQrData] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [nextStep, setNextStep] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [locationSource, setLocationSource] = useState("pending");
  const [resolvedLocation, setResolvedLocation] = useState("");
  const [geoCountry, setGeoCountry] = useState("");
  const [geoCity, setGeoCity] = useState("");
  const [geoError, setGeoError] = useState("");
  const [capturingLocation, setCapturingLocation] = useState(false);

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

  const username = auth?.user || auth?.username || "anonymous";
  const role = (auth?.role || roleLower || "supplier").toLowerCase();

  const handleCameraScan = useCallback((data) => {
    if (!data) return;
    setQrData(data);
  }, []);

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const decoded = await decodeQrFromFile(file);
      if (decoded) {
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

  const handleVerificationOutcome = useCallback(
    (payload, outcome, route, locationContext = {}) => {
      const record = {
        raw: payload,
        serial: parseSerialFromQr(payload),
        isAuthentic: outcome.isAuthentic,
        isSuspicious: outcome.isSuspicious,
        timestamp: new Date(),
        route,
        location: locationContext.locationString || null,
        locationDisplay: locationContext.locationDisplay || null,
        locationSource: locationContext.locationSource || null,
        geoCountry: locationContext.geoCountry || null,
        geoCity: locationContext.geoCity || null,
      };
      setLastScan(record);
      setScanHistory((prev) => [record, ...prev].slice(0, 5));
      setNextStep(route);
    },
    []
  );

  const verifyQr = useCallback(
    async (payload) => {
      if (!payload) return;
      setVerifying(true);
      setVerifyError(null);
      setNextStep(null);
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
        let route;
        if (outcome.isAuthentic) {
          if (role === "supplier" || role === "retailer") {
            route = {
              path: "/update-product",
              state: { qrData: payload, isSuspicious: outcome.isSuspicious },
              label: "Update product",
            };
          } else {
            route = {
              path: "/authentic-product",
              state: { qrData: payload, isSuspicious: outcome.isSuspicious },
              label: "View authenticity",
            };
          }
        } else {
          route = {
            path: "/fake-product",
            state: { qrData: payload, isSuspicious: outcome.isSuspicious },
            label: "Review alert",
          };
        }
        handleVerificationOutcome(payload, outcome, route, locationContext);
      } catch (err) {
        console.error("Verification request failed", err);
        const fallbackContract = parseContractFromQr(payload);
        const outcome = { isAuthentic: false, isSuspicious: false };
        if (fallbackContract && fallbackContract === contractAddress) {
          outcome.isAuthentic = true;
          const route = {
            path:
              role === "supplier" || role === "retailer"
                ? "/update-product"
                : "/authentic-product",
            state: { qrData: payload, isSuspicious: false },
            label:
              role === "supplier" || role === "retailer"
                ? "Update product"
                : "View authenticity",
          };
          handleVerificationOutcome(payload, outcome, route, locationContext);
          toast.error(
            "Live verification unavailable. Using contract match fallback."
          );
        } else {
          const route = {
            path: "/fake-product",
            state: { qrData: payload, isSuspicious: false },
            label: "Review alert",
          };
          handleVerificationOutcome(payload, outcome, route, locationContext);
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
      handleVerificationOutcome,
      locationSource,
      resolvedLocation,
      role,
      updateLocationSnapshot,
      username,
    ]
  );

  useEffect(() => {
    if (qrData) {
      verifyQr(qrData);
    }
  }, [qrData, verifyQr]);

  const locationStatusText = useMemo(() => {
    if (capturingLocation) return "Capturing location…";
    if (resolvedLocation) return resolvedLocation;
    if (geoError) return geoError;
    if (locationSource === "denied") return "Location permission denied";
    if (locationSource === "unsupported") return "Geolocation unsupported";
    if (locationSource === "pending") return "Awaiting permission";
    return "Location not captured";
  }, [capturingLocation, geoError, resolvedLocation, locationSource]);

  const metaSummary = useMemo(() => {
    return [
      {
        label: "Last serial",
        value: lastScan?.serial || "—",
        key: "serial",
      },
      {
        label: "Status",
        value: lastScan
          ? lastScan.isAuthentic
            ? "Authentic"
            : "Flagged"
          : verifying
          ? "Verifying"
          : "Idle",
        key: "status",
      },
      {
        label: "Scans logged",
        value: scanHistory.length.toString(),
        key: "count",
      },
      {
        label: "Location",
        value: locationStatusText,
        key: "location",
      },
    ];
  }, [lastScan, locationStatusText, scanHistory.length, verifying]);

  const recentEntries = useMemo(() => scanHistory.slice(0, 5), [scanHistory]);

  const handleContinue = () => {
    if (!nextStep) return;
    navigate(nextStep.path, { state: nextStep.state });
  };

  return (
    <AdminShell
      title={applyRole(copy.shellTitle)}
      subtitle={applyRole(copy.shellSubtitle)}
      meta={metaSummary}
      forceSidebar={forceSidebar}
      sidebarLinks={sidebarLinks}
      workspaceLabel={forceSidebar ? workspaceLabel : undefined}
      showHeaderNotifications={false}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        <GradientBorderCard>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-6">
              <SectionHeader
                eyebrow="Live capture"
                title="Point camera at product QR"
                description="We’ll verify authenticity, log the scan, and tee up the update workflow when the code is valid."
              />
              <div className="rounded-3xl border border-white/12 bg-white/5 p-4 text-sm text-white/70">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold text-white/80">
                    Location logging
                  </span>
                  <button
                    type="button"
                    onClick={captureLocation}
                    className={`${glassButtonClass} px-4 py-1 text-xs`}
                    disabled={capturingLocation}
                  >
                    {capturingLocation ? "Capturing…" : "Refresh"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  {locationStatusText}
                </p>
                {geoCity || geoCountry ? (
                  <p className="mt-2 text-xs text-white/50">
                    {[geoCity, geoCountry].filter(Boolean).join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="rounded-3xl border border-white/12 bg-black/60 p-4">
                <QrScanner passData={handleCameraScan} />
                <p className="mt-4 text-sm text-white/60">
                  Keep the QR within the frame and ensure lighting is even so
                  the scanner can read the code quickly.
                </p>
              </div>
            </div>
            <GlassCard className="p-6 space-y-4">
              <SectionHeader
                eyebrow="Upload option"
                title="Scan from an image"
                description="Drop a QR screenshot or photo if you’re off the loading dock."
              />
              <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/60 transition hover:border-white/40 hover:bg-white/10">
                <span className="font-semibold text-white">
                  Upload QR image
                </span>
                <span className="mt-2 text-xs text-white/50">
                  Supports JPG, PNG, WebP up to 10 MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {verifyError ? (
                <p className="text-sm text-rose-200/80">{verifyError}</p>
              ) : null}
              {verifying ? (
                <p className="text-sm text-white/70">Verifying scan…</p>
              ) : null}
            </GlassCard>
          </div>
        </GradientBorderCard>

        <GlassCard className="p-6 space-y-4">
          <SectionHeader
            eyebrow="Next step"
            title={nextStep ? "Review and continue" : "Awaiting scan"}
            description={
              nextStep
                ? "We verified your code. Continue into the update workflow or rescan if you want to double-check."
                : "Scan a product QR code to begin updating its custody or metadata."
            }
          />
          <Divider />
          {nextStep ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleContinue}
                className={`${glassButtonClass} px-6`}
              >
                {nextStep.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNextStep(null);
                  setVerifyError(null);
                }}
                className={`${glassButtonClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`}
              >
                Scan again
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/60">
              Once a scan is verified, you’ll see the quick action to jump
              straight into updating the product record.
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <SectionHeader
            eyebrow="Recent scans"
            title="Last five verifications"
            description="Reference the latest QR codes processed from this device during your session."
          />
          <Divider />
          {recentEntries.length ? (
            <div className="space-y-3">
              {recentEntries.map((entry, index) => (
                <div
                  key={`${entry.raw}-${index}`}
                  className="flex flex-col rounded-2xl border border-white/12 bg-white/5 p-4 text-sm text-white/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">
                      {entry.serial || "Unknown serial"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                        entry.isAuthentic
                          ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                          : "border-rose-300/40 bg-rose-500/15 text-rose-200"
                      }`}
                    >
                      {entry.isAuthentic ? "Authentic" : "Flagged"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-white/60 break-all">
                    {entry.raw}
                  </div>
                  {entry.locationDisplay ? (
                    <div className="mt-2 text-xs text-white/60">
                      Location: {entry.locationDisplay}
                    </div>
                  ) : null}
                  {entry.geoCity || entry.geoCountry ? (
                    <div className="text-xs text-white/50">
                      {[entry.geoCity, entry.geoCountry]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs text-white/50">
                    {entry.timestamp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">No scans yet this session.</p>
          )}
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default SupplierScanner;
