import React from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import router from "./routers";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: "system-ui", fontSize: 13 } }} />
    </>
  );
}
