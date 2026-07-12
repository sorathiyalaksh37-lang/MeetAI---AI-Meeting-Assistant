import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5001/api/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-indigo-500/25">
            🧠
          </div>
          <h1 className="text-3xl font-bold gradient-text mt-4">MeetAI</h1>
          <p className="text-gray-400 mt-1">AI Meeting Assistant</p>
        </div>

        <form onSubmit={handleRegister} className="glass-card p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400 mb-6">Start using AI meetings today</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Full Name</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-4 py-3 pl-12 rounded-xl bg-[#0a0e1a] border border-[#1a2340] text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">📧</span>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 pl-12 rounded-xl bg-[#0a0e1a] border border-[#1a2340] text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                className="w-full px-4 py-3 pl-12 rounded-xl bg-[#0a0e1a] border border-[#1a2340] text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔒</span>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 pl-12 rounded-xl bg-[#0a0e1a] border border-[#1a2340] text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showConfirm ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 rounded-xl font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="text-gray-400 text-sm mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}