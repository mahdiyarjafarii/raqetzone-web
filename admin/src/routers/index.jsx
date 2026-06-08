import React, { lazy, Suspense } from "react";
import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import Layout from "@/components/Layout";

const LoginPage       = lazy(() => import("@/pages/LoginPage"));
const DashboardPage   = lazy(() => import("@/pages/DashboardPage"));
const BookingsPage    = lazy(() => import("@/pages/BookingsPage"));
const CourtsPage      = lazy(() => import("@/pages/CourtsPage"));
const TournamentsPage = lazy(() => import("@/pages/TournamentsPage"));
const AnalyticsPage   = lazy(() => import("@/pages/AnalyticsPage"));
const UsersPage       = lazy(() => import("@/pages/UsersPage"));
const DiscountsPage   = lazy(() => import("@/pages/DiscountsPage"));
const MarketingPage   = lazy(() => import("@/pages/MarketingPage"));
const ClubsPage       = lazy(() => import("@/pages/ClubsPage"));
const ClubDetailPage  = lazy(() => import("@/pages/ClubDetailPage"));
const ReviewsPage        = lazy(() => import("@/pages/ReviewsPage"));
const VerifyBookingPage  = lazy(() => import("@/pages/VerifyBookingPage"));
const CustomersPage   = lazy(() => import("@/pages/CustomersPage"));

const S = (Page) => (
  <Suspense fallback={<div className="p-8 animate-pulse text-muted-foreground text-sm">بارگذاری...</div>}>
    <Page />
  </Suspense>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={S(LoginPage)} />
      <Route path="/" element={<Layout />}>
        <Route index            element={S(DashboardPage)} />
        <Route path="bookings"  element={S(BookingsPage)} />
        <Route path="clubs"     element={S(ClubsPage)} />
        <Route path="clubs/:clubId" element={S(ClubDetailPage)} />
        <Route path="reviews"      element={S(ReviewsPage)} />
        <Route path="verify"       element={S(VerifyBookingPage)} />
        <Route path="customers" element={S(CustomersPage)} />
        <Route path="courts"    element={S(CourtsPage)} />
        <Route path="discounts" element={S(DiscountsPage)} />
        <Route path="marketing" element={S(MarketingPage)} />
        <Route path="tournaments" element={S(TournamentsPage)} />
        <Route path="analytics" element={S(AnalyticsPage)} />
        <Route path="users"     element={S(UsersPage)} />
      </Route>
    </>
  )
);

export default router;
