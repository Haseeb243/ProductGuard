import { useCallback, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  glassButtonClass,
  glassSelectClass,
  glassInputClass,
} from "../admin/ui";

const ROLE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "supplier", label: "Supplier" },
  { value: "retailer", label: "Retailer" },
];

const formatRoleLabel = (role) => {
  const entry = ROLE_OPTIONS.find((option) => option.value === role);
  return entry ? entry.label : "All roles";
};

const AddAccount = () => {
  const { apiBaseUrl } = useConfig();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const textFieldClass = `${glassInputClass} w-full px-4 py-2.5 text-sm`;
  const textAreaClass = `${glassInputClass} w-full px-4 py-3 text-sm min-h-[120px]`;

  const metaSummary = useMemo(
    () => [
      {
        label: "Target role",
        value: formatRoleLabel(role),
        key: "role",
      },
      {
        label: "Profile name",
        value: displayName || "Pending",
        key: "name",
      },
      {
        label: "Branding",
        value: imageFile ? "Image attached" : "No image",
        key: "image",
      },
      {
        label: "Status",
        value: submitting ? "Submitting" : "Draft",
        key: "status",
      },
    ],
    [displayName, imageFile, role, submitting]
  );

  const resetForm = useCallback(() => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setRole(ROLE_OPTIONS[0].value);
    setEmail("");
    setDisplayName("");
    setDescription("");
    setWebsite("");
    setLocation("");
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const uploadImage = useCallback(
    async (file) => {
      if (!file) return null;
      const data = new FormData();
      data.append("image", file);
      const response = await axios.post(`${apiBaseUrl}/upload/profile`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Image upload failed");
      }
      return response.data;
    },
    [apiBaseUrl]
  );

  const handleImageChange = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSubmitting(true);

    try {
      const profileImageName = imageFile ? imageFile.name : null;

      const accountPayload = {
        username: username.trim(),
        password,
        role,
        email: email.trim(),
      };

      const profilePayload = {
        username: username.trim(),
        name: displayName.trim(),
        description: description.trim(),
        website: website.trim(),
        location: location.trim(),
        image: profileImageName,
        role,
        email: email.trim(),
      };

      await axios.post(`${apiBaseUrl}/addaccount`, accountPayload, {
        headers: { "Content-Type": "application/json" },
      });

      await axios.post(`${apiBaseUrl}/addprofile`, profilePayload, {
        headers: { "Content-Type": "application/json" },
      });

      if (imageFile) {
        await uploadImage(imageFile);
      }

      toast.success("Account created successfully");
      const redirectRole = role ? `?role=${encodeURIComponent(role)}` : "";
      resetForm();
      navigate(`/manage-account${redirectRole}`);
    } catch (error) {
      console.error("Failed to create account", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create account";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3">
      <Link to="/manage-account" className={glassButtonClass}>
        ←<span>Back to directory</span>
      </Link>
      <button
        type="button"
        onClick={resetForm}
        className={`${glassButtonClass} text-sm`}
      >
        Reset form
      </button>
    </div>
  );

  return (
    <AdminShell
      title="Create Partner Account"
      subtitle="Provision manufacturer, supplier, or retailer identities with a unified onboarding workflow."
      meta={metaSummary}
      actions={headerActions}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        <GlassCard className="space-y-6 p-8">
          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-5">
              <header>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Account credentials
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Authentication setup
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  Create login credentials and role alignment for this partner.
                </p>
              </header>
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Username
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={textFieldClass}
                    placeholder="e.g. partner.ops"
                    required
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                      Password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={textFieldClass}
                      required
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                      Confirm password
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className={textFieldClass}
                      required
                    />
                  </label>
                </div>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={textFieldClass}
                    placeholder="name@partner.com"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Role
                  </span>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className={`${glassSelectClass} w-full rounded-2xl px-4 py-2.5 pr-10`}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                      ▼
                    </span>
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-5">
              <header>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Partner profile
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Identity & metadata
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  Capture the public details used across the transparency and
                  audit dashboards.
                </p>
              </header>
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Display name
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className={textFieldClass}
                    placeholder="Acme Manufacturing"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className={textAreaClass}
                    placeholder="Brief summary of the partner and their focus"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                      Website
                    </span>
                    <input
                      type="text"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                      className={textFieldClass}
                      placeholder="https://partner.com"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                      Location
                    </span>
                    <input
                      type="text"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className={textFieldClass}
                      placeholder="Singapore, SG"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                    Brand imagery
                  </span>
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 px-6 py-8 text-center transition hover:border-white/40 hover:bg-white/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="text-3xl">📁</span>
                    <p className="mt-2 text-sm font-medium text-white/80">
                      Upload profile image
                    </p>
                    <p className="text-xs text-white/50">PNG, JPG up to 5 MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                  {imagePreview ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <footer className="lg:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={glassButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${glassButtonClass} border-emerald-400/40 bg-emerald-500/20 px-6 py-2 text-sm font-semibold hover:border-emerald-300/60 hover:bg-emerald-500/30 ${
                  submitting ? "cursor-wait opacity-70" : ""
                }`}
                disabled={submitting}
              >
                {submitting ? "Creating…" : "Create account"}
              </button>
            </footer>
          </form>
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default AddAccount;
