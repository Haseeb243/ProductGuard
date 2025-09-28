import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

const ForgotPassword = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const payload = emailOrUsername.includes("@")
        ? { email: emailOrUsername }
        : { username: emailOrUsername };
      const res = await axios.post("/auth/password/forgot", payload);
      setStatus({
        type: "success",
        text:
          res.data.message ||
          "If an account exists, a reset link has been sent",
      });
    } catch (e) {
      setStatus({
        type: "error",
        text: "Failed to send reset link. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
        <p className="text-gray-400 mb-4">
          Enter your email or username and we'll send you a password reset link.
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
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
            placeholder="Email or username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <button
          className="mt-4 text-blue-400 underline"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
