import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import bgImg from "../../img/bg.png";

const FakeProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const qrData = location.state?.qrData;
  const isSuspicious = Boolean(location.state?.isSuspicious);
  const scanLocation = location.state?.scanLocation;

  useEffect(() => {
    // Scan already logged server-side
  }, [qrData]);

  const handleBack = () => {
    navigate("/scanner");
  };

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
    : "Not available";

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,20,0.92), rgba(10,10,20,0.97)), url(${bgImg})`,
      }}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-white md:px-8">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">
            Authenticity result
          </p>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Possible counterfeit detected
          </h1>
          <p className="mt-3 text-sm text-white/70 md:text-base">
            We couldn’t validate this QR code against our authenticity ledger.
            Review the guidance below before taking any action.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-rose-200/80">
                What this means
              </p>
              <div className="mt-4 space-y-4 text-sm text-white/80">
                <p>
                  The QR code you scanned doesn’t match the authenticity data
                  stored on-chain. This often indicates a cloned or tampered
                  product identifier.
                </p>
                <p>
                  Avoid using the product until it’s verified by the original
                  manufacturer or an authorized retailer.
                </p>
                <p>
                  Use the recommended next steps to report this issue and
                  request official guidance.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                Suggested next steps
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                <li className="rounded-2xl border border-white/12 bg-white/10 p-4">
                  <span className="font-semibold text-white">
                    1. Contact the seller
                  </span>
                  <p className="mt-2 text-white/70">
                    Share the scan details and request proof of authenticity or
                    a replacement.
                  </p>
                </li>
                <li className="rounded-2xl border border-white/12 bg-white/10 p-4">
                  <span className="font-semibold text-white">
                    2. Notify the brand
                  </span>
                  <p className="mt-2 text-white/70">
                    Use the manufacturer’s support channels to report the
                    counterfeit attempt.
                  </p>
                </li>
                <li className="rounded-2xl border border-white/12 bg-white/10 p-4">
                  <span className="font-semibold text-white">
                    3. Keep a record
                  </span>
                  <p className="mt-2 text-white/70">
                    Save receipts, photos, and the suspected product for any
                    follow-up investigation.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/15 bg-black/50 p-6 backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                Scan metadata
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/80">
                <div className="rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Location</span>
                  <p className="mt-1 font-semibold text-white">
                    {scanLocationDisplay}
                  </p>
                  {scanRegion && <p className="text-white/60">{scanRegion}</p>}
                  {scanCoordinates && (
                    <p className="text-white/50">
                      Coordinates: {scanCoordinates}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Scanned at</span>
                  <span className="font-semibold text-white">
                    {scanTimestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                  <span className="text-white/60">Suspicious signals</span>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${
                      isSuspicious
                        ? "border-yellow-300/40 bg-yellow-500/20 text-yellow-100"
                        : "border-rose-300/40 bg-rose-500/20 text-rose-100"
                    }`}
                  >
                    {isSuspicious ? "Pattern flagged" : "Contract mismatch"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-200/80">
                Need extra help?
              </p>
              <p className="mt-4 text-sm text-white/80">
                Reach out to our support team with the scan summary above and
                we’ll coordinate with the brand’s trust & safety experts.
              </p>
              <button
                type="button"
                onClick={() =>
                  (window.location.href = "mailto:support@productguard.com")
                }
                className="mt-4 w-full rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
              >
                Contact support
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 text-sm text-white/70">
          <p>
            Want to double-check another product? Start a fresh scan and be sure
            to capture the QR in a well-lit area.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-3xl bg-primary-500 px-6 py-3 font-semibold text-white transition hover:bg-primary-600"
          >
            Scan again
          </button>
        </div>
      </div>
    </div>
  );
};

export default FakeProduct;
