import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../../api/axios";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const ResetPassword = () => {
  const q = useQuery();
  const token = q.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setStatus({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: "error", text: "Passwords don't match." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await axios.post("/auth/password/reset", { token, password });
      if (res.data.success) {
        setStatus({
          type: "success",
          text: "Password reset successful. Redirecting to login…",
        });
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      } else {
        setStatus({
          type: "error",
          text: res.data.message || "Failed to reset password",
        });
      }
    } catch (e) {
      setStatus({
        type: "error",
        text: e.response?.data?.message || "Failed to reset password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        <p className="text-gray-400 mb-4">
          Choose a new password for your account.
        </p>
        {status && (
          <div
            className={`mb-3 rounded p-3 ${
              status.type === "success"
                ? "bg-green-900/40 border border-green-700"
                : "bg-red-900/40 border border-red-700"
            }`}
          >
            {status.text}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            className="w-full rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <input
            type="password"
            className="w-full rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? "Saving…" : "Reset password"}
          </button>
        </form>
        <button
          className="mt-4 text-blue-400 underline"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
