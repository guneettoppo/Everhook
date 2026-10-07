import { useCallback, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { useToast } from "./hooks/useToast";
import Dashboard from "./pages/Dashboard";
import DeadLetters from "./pages/DeadLetters";
import Deliveries from "./pages/Deliveries";
import Demo from "./pages/Demo";
import Events from "./pages/Events";
import Subscribers from "./pages/Subscribers";

export function App() {
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { toasts, show } = useToast();

  const handleRefresh = useCallback(() => {
    setLastRefreshed(new Date());
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        padding: "12px",
        gap: "12px",
        display: "flex",
        background: "transparent",
      }}
    >
      <Sidebar />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-elevated)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <Header lastRefreshed={lastRefreshed} onRefresh={handleRefresh} />
        <main style={{ flex: 1, minHeight: 0, overflow: "auto", position: "relative" }}>
          <div style={{ padding: "28px", maxWidth: 1320, margin: "0 auto" }}>
            <Routes>
              <Route path="/" element={<Dashboard notify={show} onRefresh={handleRefresh} />} />
              <Route path="/demo" element={<Demo notify={show} />} />
              <Route path="/events" element={<Events notify={show} />} />
              <Route path="/subscribers" element={<Subscribers notify={show} />} />
              <Route path="/deliveries" element={<Deliveries notify={show} />} />
              <Route path="/dead-letters" element={<DeadLetters notify={show} />} />
            </Routes>
          </div>
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
