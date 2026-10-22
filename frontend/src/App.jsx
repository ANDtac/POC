import { Route, Routes } from "react-router";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Landing from "./pages/Landing.jsx";
import { Login, Register } from "./pages/AuthPages.jsx";
import Runs from "./pages/Runs.jsx";
import NewRun from "./pages/NewRun.jsx";
import Tracker from "./pages/Tracker.jsx";
import Settings from "./pages/Settings.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        {/* Tracker handles its own access: owners edit, anyone can view a public run. */}
        <Route path="runs/:id" element={<Tracker />} />
        <Route element={<RequireAuth />}>
          <Route path="runs" element={<Runs />} />
          <Route path="runs/new" element={<NewRun />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
