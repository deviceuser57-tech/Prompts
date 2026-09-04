import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

class Boot extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b1220", color: "#e9eef7", fontFamily: "monospace", padding: 24, direction: "rtl" }}>
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>حدث خطأ أثناء تشغيل التطبيق</p>
            <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16, direction: "ltr" }}>{String(this.state.err)}</p>
            <button
              onClick={() => { try { localStorage.clear(); } catch { /* ignore */ } location.reload(); }}
              style={{ background: "#f2a33c", color: "#0b1220", border: 0, borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              إعادة تشغيل نظيفة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Boot>
    <App />
  </Boot>
);
