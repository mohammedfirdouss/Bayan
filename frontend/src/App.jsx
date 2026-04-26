import { useState, useEffect } from "react";
import Nav from "./components/Nav.jsx";
import Home from "./views/Home.jsx";
import Search from "./views/Search.jsx";
import Verify from "./views/Verify.jsx";
import Outline from "./views/Outline.jsx";

function getViewFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (hash === "search") return "search";
  if (hash === "verify") return "verify";
  if (hash === "outline") return "outline";
  return "home";
}

export default function App() {
  const [view, setView] = useState(getViewFromHash);

  useEffect(() => {
    function onHashChange() {
      setView(getViewFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) window.location.hash = "#home";
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(v) {
    window.location.hash = "#" + v;
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav active={view} onNavigate={navigate} />
      {view === "home" && <Home onNavigate={navigate} />}
      {view === "search" && (
        <main style={{ paddingTop: 64 }}>
          <Search />
        </main>
      )}
      {view === "verify" && (
        <main style={{ paddingTop: 64 }}>
          <Verify />
        </main>
      )}
      {view === "outline" && (
        <main style={{ paddingTop: 64 }}>
          <Outline />
        </main>
      )}
    </div>
  );
}
