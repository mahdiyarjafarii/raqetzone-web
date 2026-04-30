import React, { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import {
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";

import Layout from "@/components/Layout";
import SuspensedView from "@/components/SuspensedView";
import ErrorFallback from "@/components/ErrorFallback";

import ChatPage from "@/pages/ai/ChatPage";
import NewChatPage from "@/pages/ai/NewChatPage";

const AiPage = lazy(() => import("@/pages/ai/AiPage"));
const NotFoundPage = lazy(() => import("@/pages/404Page"));
const ProfilePage = lazy(() => import("@/pages/user/ProfilePage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const TournamentPage = lazy(() => import("@/pages/tournament/tournamentPage"));

const getSuspensedElement = (Page) => (
  <SuspensedView>
    <Page />
  </SuspensedView>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      path="/"
      element={<Layout />}
      errorElement={
        <ErrorFallback
          error={{ message: "خطایی در بارگذاری صفحه رخ داد" }}
          resetErrorBoundary={() => (window.location.href = "/")}
        />
      }
    >
      <Route index element={getSuspensedElement(HomePage)} />
      <Route path="ai" element={getSuspensedElement(AiPage)} />
      <Route path="tournament" element={getSuspensedElement(TournamentPage)} />
      <Route path="profile" element={getSuspensedElement(ProfilePage)} />
      <Route path="chat/new" element={getSuspensedElement(NewChatPage)} />
      <Route path="chat/:id" element={getSuspensedElement(ChatPage)} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
);

export default router;
