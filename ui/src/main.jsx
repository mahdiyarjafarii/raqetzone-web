import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.jsx";

import "./assets/index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: true,
  enableLogs: true,
});

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);
