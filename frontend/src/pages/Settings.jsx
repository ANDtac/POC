import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

function useSubmit(action) {
  const [state, setState] = useState({ pending: false, error: "", done: "" });
  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ pending: true, error: "", done: "" });
    try {
      const done = await action(Object.fromEntries(new FormData(form)), form);
      setState({ pending: false, error: "", done });
    } catch (err) {
      setState({ pending: false, error: err.message, done: "" });
    }
  };
  return [state, onSubmit];
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();

  const [profile, saveProfile] = useSubmit(async ({ username, email }) => {
    const data = await api("/api/user", { method: "PATCH", body: { username, email } });
    setUser(data.user);
    return "Profile saved.";
  });

  const [password, savePassword] = useSubmit(async ({ current_password, password: next }, form) => {
    await api("/api/user", { method: "PATCH", body: { current_password, password: next } });
    form.reset();
    return "Password changed.";
  });

  const deleteAccount = async () => {
    const typed = window.prompt(`This deletes your account and every run. Type your username (${user.username}) to confirm.`);
    if (typed !== user.username) return;
    try {
      await api("/api/user", { method: "DELETE" });
      logout();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div className="narrow">
      <h1>Settings</h1>

      <form className="form" onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label>
          Username
          <input name="username" defaultValue={user.username} required minLength={3} maxLength={20} pattern="[A-Za-z0-9_\-]+" autoComplete="username" />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={user.email} required autoComplete="email" />
        </label>
        {profile.error && <p className="error" role="alert">{profile.error}</p>}
        {profile.done && <p className="success" role="status">{profile.done}</p>}
        <button className="button" disabled={profile.pending}>Save profile</button>
      </form>

      <form className="form" onSubmit={savePassword}>
        <h2>Password</h2>
        <label>
          Current password
          <input name="current_password" type="password" required autoComplete="current-password" />
        </label>
        <label>
          New password
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          <span className="hint">At least 8 characters, one uppercase letter and one number</span>
        </label>
        {password.error && <p className="error" role="alert">{password.error}</p>}
        {password.done && <p className="success" role="status">{password.done}</p>}
        <button className="button" disabled={password.pending}>Change password</button>
      </form>

      <section className="form">
        <h2>Danger zone</h2>
        <button type="button" className="button button--danger" onClick={deleteAccount}>Delete account</button>
      </section>
    </div>
  );
}
