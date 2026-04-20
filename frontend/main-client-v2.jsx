import { createRoot } from "react-dom/client";
import { createGlobalStyle, StyleSheetManager } from "styled-components";
import DiagnosisV2 from "./client/DiagnosisV2.jsx";
import PlanV2 from "./client/PlanV2.jsx";
import ScenariosV2 from "./client/ScenariosV2.jsx";
import ChannelDetailV2 from "./client/ChannelDetailV2.jsx";
import MarketContextV2 from "./client/MarketContextV2.jsx";
import LoginV2 from "./client/LoginV2.jsx";
import V2Sandbox from "./client/V2Sandbox.jsx";

/**
 * v2 client entry point.
 *
 * Mounted from index-client-v2.html. Parallel deployment per the 4-week
 * rebuild plan: the legacy client entry (main-client.jsx → DiagnosisApp)
 * stays live at index-client.html so v24 keeps working. This v2 entry
 * lives at index-client-v2.html and eventually becomes the default.
 *
 * Routing: ?screen=<key> query param, consistent with the v24 convention.
 * Current v2 coverage:
 *   ?screen=diagnosis   → DiagnosisV2 (default)
 *   ?screen=plan        → PlanV2
 *   ?screen=sandbox     → V2Sandbox (developer-facing component gallery)
 *   ?screen=scenarios   → (pending — Session 11)
 *   ?screen=channels    → (pending — Session 12)
 *   ?screen=market      → (pending — Session 13)
 */

// Global styles — ensure canvas background extends to body, avoid default
// browser margin, load system fonts as fallback while Libre Caslon loads.
const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  html, body, #root {
    margin: 0;
    padding: 0;
    background: #FBFAF7;
    min-height: 100vh;
    font-family: 'Source Sans Pro', 'Geist', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  button { font-family: inherit; }
`;

function getScreenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("screen") || "diagnosis";
}

function navigate(screen, params = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("screen", screen);
  // Clear any stale channel param if we're not navigating to a channel screen
  if (screen !== "channels" && screen !== "channel") {
    url.searchParams.delete("ch");
    url.searchParams.delete("channel");
  }
  // Apply new params (overwriting)
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  });
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const screen = getScreenFromUrl();

  // Listen for back/forward navigation
  // (minimal router - re-render on popstate)
  if (typeof window !== "undefined" && !window.__v2RouterInstalled) {
    window.addEventListener("popstate", () => {
      // Force re-render by replacing the root
      mount();
    });
    window.__v2RouterInstalled = true;
  }

  if (screen === "sandbox") return <V2Sandbox />;
  if (screen === "login") return <LoginV2 />;
  if (screen === "plan") return <PlanV2 onNavigate={navigate} />;
  if (screen === "scenarios") return <ScenariosV2 onNavigate={navigate} />;
  if (screen === "channels" || screen === "channel") {
    const params = new URLSearchParams(window.location.search);
    const ch = params.get("ch") || params.get("channel") || "paid_search";
    return <ChannelDetailV2 onNavigate={navigate} channel={ch} />;
  }
  if (screen === "market" || screen === "market-context") {
    return <MarketContextV2 onNavigate={navigate} />;
  }
  return <DiagnosisV2 onNavigate={navigate} />;
}

function mount() {
  const container = document.getElementById("root");
  if (!container) return;
  // Clear previous render so the new screen replaces it
  if (!container.__reactRoot) {
    container.__reactRoot = createRoot(container);
  }
  container.__reactRoot.render(
    <StyleSheetManager enableVendorPrefixes>
      <>
        <GlobalStyle />
        <App />
      </>
    </StyleSheetManager>
  );
}

mount();
