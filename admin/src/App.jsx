import React from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import router from "./routers";

function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          fontFamily: "inherit",
          fontSize: "0.875rem",
          fontWeight: "500",
          padding: "12px 16px",
          borderRadius: "14px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.08)",
          maxWidth: "340px",
          lineHeight: "1.5",
        },
        success: {
          style: {
            background: "rgba(22, 163, 74, 0.92)",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#ffffff",
            secondary: "rgba(22, 163, 74, 0.92)",
          },
        },
        error: {
          style: {
            background: "rgba(220, 38, 38, 0.92)",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#ffffff",
            secondary: "rgba(220, 38, 38, 0.92)",
          },
        },
        loading: {
          style: {
            background: "rgba(30, 30, 40, 0.92)",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#2B0FD9",
            secondary: "rgba(30, 30, 40, 0.92)",
          },
        },
      }}
    />
  );
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <AppToaster />
    </>
  );
}
