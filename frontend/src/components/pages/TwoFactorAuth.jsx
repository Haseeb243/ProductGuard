import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";
import { toast } from "react-toastify";
import axios from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  glassButtonClass,
  Divider,
  SectionHeader,
} from "../admin/ui";
import useManufacturerWorkspace from "../../hooks/useManufacturerWorkspace";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";

const deriveOtpAuthUrl = (secret, username) => {
  if (!secret || !username) return null;
  const accountLabel = `${encodeURIComponent(
    "ProductGuard"
  )}%20(${encodeURIComponent(username)})`;
  return `otpauth://totp/${accountLabel}?secret=${encodeURIComponent(
    secret
  )}&issuer=${encodeURIComponent("ProductGuard")}`;
};

const formatTimestamp = (value) =>
  value ? new Date(value).toLocaleString() : "Not yet";

const TwoFactorAuth = () => {
  const { auth, setAuth } = useAuth();
  const { isManufacturer, sidebarLinks: manufacturerSidebar } =
    useManufacturerWorkspace();
  const { isSupplier, sidebarLinks: supplierSidebar } = useSupplierWorkspace();
  const navigate = useNavigate();

  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupQr, setSetupQr] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof auth?.is2FAEnabled === "boolean") {
      setIs2FAEnabled(auth.is2FAEnabled);
    }
  }, [auth?.is2FAEnabled]);

  const metaPills = useMemo(
    () => [
      {
        label: "Status",
        value: is2FAEnabled ? "Enabled" : "Disabled",
        key: "status",
      },
      {
        label: "Secret generated",
        value: setupSecret ? "Pending verification" : "—",
        key: "secret",
      },
      {
        label: "Account",
        value: auth?.user || "Unknown",
        key: "admin",
      },
      {
        label: "Updated",
        value: formatTimestamp(lastUpdated),
        key: "updated",
      },
    ],
    [auth?.user, is2FAEnabled, lastUpdated, setupSecret]
  );

  const handleGenerateSetupKit = async () => {
    setLoadingAction(true);
    try {
      const response = await axios.post("/auth/2fa/setup");
      const payload = response?.data || {};
      const qr = payload.qrCode || payload.qr || payload?.data?.qrCode;
      let secret = payload.secret || payload?.data?.secret || "";
      const url = payload.otpauthUrl || payload?.data?.otpauthUrl || "";

      if (!secret && typeof url === "string") {
        const match = url.match(/secret=([^&]+)/i);
        if (match && match[1]) {
          secret = decodeURIComponent(match[1]);
        }
      }

      if (!secret && !qr && !url) {
        throw new Error(
          payload.message || "Unexpected response while generating setup kit"
        );
      }

      setSetupSecret(secret || "");
      setSetupQr(qr || "");
      setSetupUrl(url || deriveOtpAuthUrl(secret, auth?.user));
      setVerificationCode("");
      toast.info("Authenticator setup generated. Scan and verify to enable.");
    } catch (error) {
      console.error("Failed to generate setup kit", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate setup kit"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setLoadingAction(true);
    try {
      const response = await axios.post("/auth/2fa/verify", {
        token: verificationCode,
      });
      if (response?.data?.success) {
        setIs2FAEnabled(true);
        setAuth((prev) => ({ ...prev, is2FAEnabled: true }));
        setSetupSecret("");
        setSetupQr("");
        setSetupUrl("");
        setVerificationCode("");
        setLastUpdated(Date.now());
        toast.success("Two-factor authentication enabled");
      } else {
        throw new Error(
          response?.data?.message || "Unable to verify authentication code"
        );
      }
    } catch (error) {
      console.error("Failed to verify 2FA", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Verification failed"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDisable = async () => {
    if (!password.trim() || disableCode.length !== 6) {
      toast.error("Provide your password and 6-digit code to disable");
      return;
    }
    setLoadingAction(true);
    try {
      const response = await axios.post("/auth/2fa/disable", {
        password: password.trim(),
        token: disableCode,
      });
      if (response?.data?.success) {
        setIs2FAEnabled(false);
        setAuth((prev) => ({ ...prev, is2FAEnabled: false }));
        setPassword("");
        setDisableCode("");
        setLastUpdated(Date.now());
        toast.success("Two-factor authentication disabled");
      } else {
        throw new Error(
          response?.data?.message || "Unable to disable two-factor auth"
        );
      }
    } catch (error) {
      console.error("Failed to disable 2FA", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to disable two-factor authentication"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCopySecret = async () => {
    if (!setupSecret) return;
    try {
      await navigator.clipboard.writeText(setupSecret);
      setCopied(true);
      toast.success("Secret copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Clipboard error", error);
      toast.error("Unable to copy secret. Copy manually instead.");
    }
  };

  const handleBack = () => navigate(-1);

  if (!auth?.user) {
    return <Navigate to="/login" replace />;
  }

  const forceSidebar = isManufacturer || isSupplier;
  const activeSidebar = isManufacturer
    ? manufacturerSidebar
    : isSupplier
    ? supplierSidebar
    : null;
  const workspaceLabel = isManufacturer
    ? "Manufacturer Workspace"
    : isSupplier
    ? "Supplier Hub"
    : undefined;

  return (
    <AdminShell
      title="Two-Factor Authentication"
      subtitle="Secure your ProductGuard account with time-based one-time passcodes."
      meta={metaPills}
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBack}
            className={glassButtonClass}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleGenerateSetupKit}
            className={`${glassButtonClass} border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-300/60 hover:bg-emerald-500/20 ${
              loadingAction ? "cursor-wait opacity-70" : ""
            }`}
            disabled={loadingAction || is2FAEnabled}
          >
            {loadingAction && !is2FAEnabled
              ? "Generating…"
              : "Generate setup kit"}
          </button>
        </div>
      }
      forceSidebar={forceSidebar}
      sidebarLinks={activeSidebar}
      workspaceLabel={workspaceLabel}
      showHeaderNotifications={forceSidebar ? false : undefined}
      showHeaderProfile={forceSidebar ? false : undefined}
    >
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        <GlassCard className="p-6">
          <SectionHeader
            title="Account security status"
            subtitle="Control whether sign-ins require a rotating authenticator code."
          />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                Current posture
              </p>
              <p className="text-2xl font-semibold text-white">
                {is2FAEnabled ? "2FA is enforced" : "2FA is disabled"}
              </p>
              <p className="text-sm text-white/60">
                {is2FAEnabled
                  ? "You'll need to supply a valid code from your authenticator when signing in."
                  : "Enable two-factor authentication to enforce rotating passcodes for this account."}
              </p>
              {is2FAEnabled ? (
                <button
                  type="button"
                  onClick={handleDisable}
                  className={`${glassButtonClass} border-rose-400/40 bg-rose-500/10 hover:border-rose-300/60 hover:bg-rose-500/20 ${
                    loadingAction ? "cursor-wait opacity-70" : ""
                  }`}
                  disabled={loadingAction}
                >
                  {loadingAction ? "Updating…" : "Disable 2FA"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateSetupKit}
                  className={`${glassButtonClass} border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-300/60 hover:bg-emerald-500/20 ${
                    loadingAction ? "cursor-wait opacity-70" : ""
                  }`}
                  disabled={loadingAction}
                >
                  {loadingAction ? "Generating…" : "Start setup"}
                </button>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                Guidance
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">
                <li>Install Authy, 1Password, or Google Authenticator.</li>
                <li>Scan the QR code or enter the secret key manually.</li>
                <li>Enter the 6-digit code to complete activation.</li>
                <li>Store backup codes in a vault for emergency access.</li>
              </ul>
            </div>
          </div>
        </GlassCard>

        {!is2FAEnabled ? (
          <GradientBorderCard>
            <div className="space-y-6">
              <SectionHeader
                title="Enable two-factor authentication"
                subtitle="Generate a shared secret and validate it with your authenticator application."
              />
              {setupSecret || setupQr || setupUrl ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                        Scan code
                      </p>
                      <div className="mt-4 flex items-center justify-center">
                        {setupQr ? (
                          <img
                            src={setupQr}
                            alt="2FA QR"
                            className="h-48 w-48 rounded-2xl border border-white/10 bg-white/5 p-2"
                          />
                        ) : setupUrl ? (
                          <QRCode value={setupUrl} size={200} includeMargin />
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                        Manual entry
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={setupSecret}
                          readOnly
                          className="flex-1 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm text-white/80"
                        />
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className={`${glassButtonClass} ${
                            copied
                              ? "border-emerald-400/60 text-emerald-200"
                              : ""
                          }`}
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                      Verification
                    </p>
                    <p className="mt-3 text-sm text-white/60">
                      Enter the 6-digit passcode shown in your authenticator to
                      confirm activation. Codes rotate every 30 seconds.
                    </p>
                    <div className="mt-4 flex flex-col gap-4">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(event) =>
                          setVerificationCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        placeholder="123456"
                        className="rounded-3xl border border-white/12 bg-white/10 px-4 py-3 text-center text-2xl tracking-[0.6em] text-white/80 focus:border-white/40 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerify}
                        className={`${glassButtonClass} border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-300/60 hover:bg-emerald-500/20 ${
                          loadingAction ? "cursor-wait opacity-70" : ""
                        }`}
                        disabled={loadingAction}
                      >
                        {loadingAction ? "Verifying…" : "Verify and enable"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/60">
                  Generate a setup kit to surface the QR code and shared secret
                  for your authenticator app.
                </div>
              )}
            </div>
          </GradientBorderCard>
        ) : (
          <GradientBorderCard>
            <div className="space-y-6">
              <SectionHeader
                title="Disable two-factor authentication"
                subtitle="Enter your password and a current authenticator code to relax enforcement."
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <label className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-3 w-full rounded-3xl border border-white/12 bg-white/10 px-4 py-3 text-sm text-white/80 focus:border-white/40 focus:outline-none"
                  />
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <label className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                    Authenticator code
                  </label>
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(event) =>
                      setDisableCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="123456"
                    className="mt-3 w-full rounded-3xl border border-white/12 bg-white/10 px-4 py-3 text-center text-2xl tracking-[0.6em] text-white/80 focus:border-white/40 focus:outline-none"
                  />
                </div>
              </div>
              <Divider />
              <button
                type="button"
                onClick={handleDisable}
                className={`${glassButtonClass} border-rose-400/40 bg-rose-500/10 hover:border-rose-300/60 hover:bg-rose-500/20 ${
                  loadingAction ? "cursor-wait opacity-70" : ""
                }`}
                disabled={loadingAction}
              >
                {loadingAction ? "Disabling…" : "Disable two-factor"}
              </button>
            </div>
          </GradientBorderCard>
        )}
      </div>
    </AdminShell>
  );
};

export default TwoFactorAuth;
