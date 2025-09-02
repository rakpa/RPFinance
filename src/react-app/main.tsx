import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

// Load Inter font from Google Fonts
function FontLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
    link.rel = 'preconnect';
    document.head.appendChild(link);

    const preconnect = document.createElement('link');
    preconnect.href = 'https://fonts.gstatic.com';
    preconnect.rel = 'preconnect';
    preconnect.crossOrigin = 'anonymous';
    document.head.insertBefore(preconnect, link);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(preconnect);
    };
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FontLoader />
    <App />
  </StrictMode>
);
