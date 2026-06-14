import React, { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import Layout from "@/components/Layout";
import SuspensedView from "@/components/SuspensedView";
import ErrorFallback from "@/components/ErrorFallback";

import ChatPage from "@/pages/ai/ChatPage";
import NewChatPage from "@/pages/ai/NewChatPage";

const JoinMatchPage = lazy(() => import("@/pages/JoinMatchPage"));
const TournamentInvitePage = lazy(() => import("@/pages/tournament/TournamentInvitePage"));
const AiPage = lazy(() => import("@/pages/ai/AiPage"));
const NotFoundPage = lazy(() => import("@/pages/404Page"));
const ProfilePage = lazy(() => import("@/pages/user/ProfilePage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const TournamentPage = lazy(() => import("@/pages/tournament/tournamentPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));
const ClubsPage = lazy(() => import("@/pages/clubs/ClubsPage"));
const ClubDetailPage = lazy(() => import("@/pages/clubs/ClubDetailPage"));
const MyBookingPage = lazy(() => import("@/pages/mybooking/MyBookingPage"));
const BookingTrackPage = lazy(() => import("@/pages/booking/BookingTrackPage"));
const ConversationsPage = lazy(() => import("@/pages/messages/ConversationsPage"));
const DirectChatPage = lazy(() => import("@/pages/messages/DirectChatPage"));
const TennisDuelPage = lazy(() => import("@/pages/game/TennisDuelPage"));

const s = (Page) => <SuspensedView><Page /></SuspensedView>;

const router = createBrowserRouter([
  {
    path: "/join/:token",
    element: s(JoinMatchPage),
  },
  {
    path: "/tournament/invite/:id",
    element: s(TournamentInvitePage),
  },
  {
    path: "/",
    element: <Layout />,
    errorElement: (
      <ErrorFallback
        error={{ message: "خطایی در بارگذاری صفحه رخ داد" }}
        resetErrorBoundary={() => (window.location.href = "/")}
      />
    ),
    children: [
      { index: true, element: s(HomePage) },
      { path: "ai", element: s(AiPage) },
      { path: "tournament", element: s(TournamentPage) },
      { path: "leaderboard", element: s(LeaderboardPage) },
      { path: "clubs", element: s(ClubsPage) },
      { path: "clubs/:clubId", element: s(ClubDetailPage) },
      { path: "mybooking", element: s(MyBookingPage) },
      { path: "booking/track/:code", element: s(BookingTrackPage) },
      { path: "notifications", element: s(NotificationsPage) },
      { path: "profile", element: s(ProfilePage) },
      { path: "chat/new", element: <NewChatPage /> },
      { path: "chat/:id", element: <ChatPage /> },
      { path: "messages", element: s(ConversationsPage) },
      { path: "messages/:conversationId", element: s(DirectChatPage) },
      { path: "game/tennis-duel", element: s(TennisDuelPage) },
      { path: "*", element: s(NotFoundPage) },
    ],
  },
]);

export default router;
