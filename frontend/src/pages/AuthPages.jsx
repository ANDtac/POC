import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Already signed in on arrival; while submitting, onSubmit owns the redirect.
  if (user && !pending) return <Navigate to="/runs" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setPending(true);
    setError("");
    try {
      const data = await api(isRegister ? "/api/auth/register" : "/api/auth/login", { method: "POST", body: form });
      signIn(data);
      navigate(location.state?.from || (isRegister ? "/runs/new" : "/runs"), { replace: true });
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  };

  return (
    <div className="narrow">
      <h1>{isRegister ? "Create an account" : "Log in"}</h1>
      <form className="form" onSubmit={onSubmit}>
        {isRegister && (
          <label>
            Username
            <input name="username" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_\-]+" />
            <span className="hint">3–20 characters: letters, numbers, _ or -</span>
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 8 : undefined}
          />
          {isRegister && <span className="hint">At least 8 characters, one uppercase letter and one number</span>}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" disabled={pending}>
          {pending ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="muted">
        {isRegister ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}
      </p>
    </div>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
