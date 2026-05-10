import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  jsonb,
  integer,
  index,
  boolean,
  smallint,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).unique(),
  name: varchar("name", { length: 255 }),
  image: varchar("image", { length: 500 }),
  credits: integer("credits").notNull().default(30),
  subscriptionType: varchar("subscription_type", { length: 256 }),
  subscriptionEndDate: timestamp("subscription_end_date"),
  lastResetCreditsDate: timestamp("last_reset_credits_date"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isClubOwner: boolean("is_club_owner").notNull().default(false),
  // ─── Sports profile fields ───────────────────────────────────────────────
  bio: text("bio"),
  skillLevel: varchar("skill_level", { length: 20 }).default("beginner"), // beginner | intermediate | advanced | pro
  favoriteSport: varchar("favorite_sport", { length: 50 }).default("padel"),
  xp: integer("xp").notNull().default(0),
  level: smallint("level").notNull().default(1),
  // ─────────────────────────────────────────────────────────────────────────
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_users_phone").on(table.phone),
  index("idx_users_subscription_type").on(table.subscriptionType),
  index("idx_users_last_reset_credits_date").on(table.lastResetCreditsDate),
  index("idx_users_subscription_end_date").on(table.subscriptionEndDate),
]);

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_otp_codes_phone").on(table.phone),
  index("idx_otp_codes_expires_at").on(table.expiresAt),
  index("idx_otp_codes_verified").on(table.verified),
  index("idx_otp_codes_created_at").on(table.createdAt),
]);

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  from: varchar("from", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  attachments: jsonb("attachments").default([]), // [{type: 'image'|'file', url: '', name: ''}]
  model: varchar("model", { length: 255 }).default("GPT-5"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const messageReactions = pgTable("message_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reaction: varchar("reaction", { length: 20 }).notNull(), // 'like' or 'dislike'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'basic' or 'premium' or 'pro'
  period: varchar("period", { length: 20 }).notNull(), // 'monthly' or 'quarterly' or 'halfYearly' or 'yearly'
  status: varchar("status", { length: 20 }).default('pending'), // 'pending' or 'completed' or 'failed'
  trackCode: varchar("track_code", { length: 255 }),
  callbackBody: jsonb("callback_body"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics table for tracking pricing modal interactions
export const pricingAnalytics = pgTable("pricing_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // nullable for anonymous users
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'modal_view', 'checkout_click', 'modal_close', 'period_change'
  modalType: varchar("modal_type", { length: 50 }).notNull(), // 'pricing_sheet', 'reach_limit_pricing_sheet'
  triggerSource: varchar("trigger_source", { length: 100 }), // where the modal was triggered from (e.g., 'home_page', 'chat_page', 'reach_limit')
  selectedPlan: varchar("selected_plan", { length: 50 }), // 'basic', 'premium', 'pro'
  selectedPeriod: varchar("selected_period", { length: 50 }), // 'monthly', 'quarterly', 'halfYearly', 'yearly'
  userAgent: text("user_agent"),
  deviceType: varchar("device_type", { length: 50 }), // 'mobile', 'tablet', 'desktop'
  platform: varchar("platform", { length: 50 }), // 'myket_app', 'web', 'pwa'
  sessionId: varchar("session_id", { length: 255 }), // to group events in a session
  metadata: jsonb("metadata").default({}), // additional context data
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_pricing_analytics_user_id").on(table.userId),
  index("idx_pricing_analytics_event_type").on(table.eventType),
  index("idx_pricing_analytics_modal_type").on(table.modalType),
  index("idx_pricing_analytics_created_at").on(table.createdAt),
  index("idx_pricing_analytics_trigger_source").on(table.triggerSource),
]);

// ─── Tournament / Matchmaking ────────────────────────────────────────────────

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  sportType: varchar("sport_type", { length: 50 }).notNull(), // 'padel' | 'tennis' | ...
  location: varchar("location", { length: 255 }).notNull(),
  courtName: varchar("court_name", { length: 255 }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  teamSize: smallint("team_size").notNull().default(2), // players per team
  status: varchar("status", { length: 20 }).notNull().default("open"), // open | full | cancelled | completed
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_matches_status").on(table.status),
  index("idx_matches_scheduled_at").on(table.scheduledAt),
  index("idx_matches_sport_type").on(table.sportType),
]);

export const matchParticipants = pgTable("match_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  team: varchar("team", { length: 1 }).notNull(), // 'A' | 'B'
  isWin: boolean("is_win"),                       // null = undecided
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  index("idx_match_participants_match_id").on(table.matchId),
  index("idx_match_participants_user_id").on(table.userId),
]);

// ─── Court Booking ────────────────────────────────────────────────────────────

// ─── Clubs ────────────────────────────────────────────────────────────────────

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: text("address").notNull().default(""),
  phone: varchar("phone", { length: 20 }),
  sportTypes: jsonb("sport_types").default([]),   // ["padel","tennis"]
  amenities: jsonb("amenities").default([]),      // ["parking","shower"]
  images: jsonb("images").default([]),            // array of image URLs
  openTime: varchar("open_time", { length: 5 }).notNull().default("07:00"),
  closeTime: varchar("close_time", { length: 5 }).notNull().default("23:00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_clubs_owner_id").on(table.ownerId),
  index("idx_clubs_is_active").on(table.isActive),
]);

// ─── Courts ───────────────────────────────────────────────────────────────────

export const courts = pgTable("courts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").references(() => clubs.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  address: text("address"),
  surfaceType: varchar("surface_type", { length: 50 }), // grass | clay | hard | artificial
  sportType: varchar("sport_type", { length: 50 }).notNull().default("padel"),
  pricePerHour: integer("price_per_hour").notNull(), // in Tomans
  description: text("description"),
  image: varchar("image", { length: 500 }),
  managerPhone: varchar("manager_phone", { length: 20 }),
  openTime: varchar("open_time", { length: 5 }).notNull().default("07:00"),  // HH:mm
  closeTime: varchar("close_time", { length: 5 }).notNull().default("23:00"), // HH:mm
  slotDuration: smallint("slot_duration").notNull().default(60), // minutes
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_courts_sport_type").on(table.sportType),
  index("idx_courts_is_active").on(table.isActive),
]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courtId: uuid("court_id").notNull().references(() => courts.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),       // YYYY-MM-DD
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:mm
  endTime: varchar("end_time", { length: 5 }).notNull(),     // HH:mm
  durationHours: integer("duration_hours").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected | cancelled
  notes: text("notes"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bookings_user_id").on(table.userId),
  index("idx_bookings_court_id").on(table.courtId),
  index("idx_bookings_date").on(table.date),
  index("idx_bookings_status").on(table.status),
]);

// ─── Slot Overrides ───────────────────────────────────────────────────────────
// status: "available" (default) | "blocked" | "booked"

export const slotOverrides = pgTable("slot_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  courtId: uuid("court_id").notNull().references(() => courts.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),           // YYYY-MM-DD
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:mm
  endTime: varchar("end_time", { length: 5 }).notNull(),     // HH:mm
  status: varchar("status", { length: 20 }).notNull().default("available"), // available | blocked | booked
  price: integer("price"),           // override price in Tomans, null = use court default
  discountPercent: smallint("discount_percent").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_slot_overrides_court_date").on(table.courtId, table.date),
]);

// ─── Home Feed ────────────────────────────────────────────────────────────────

export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: text("subtitle"),
  badgeText: varchar("badge_text", { length: 60 }),
  ctaText: varchar("cta_text", { length: 80 }).notNull().default("مشاهده"),
  ctaHref: varchar("cta_href", { length: 255 }).notNull().default("/mybooking"),
  gradientFrom: varchar("gradient_from", { length: 30 }).notNull().default("#2B0FD9"),
  gradientTo: varchar("gradient_to", { length: 30 }).notNull().default("#7C3AED"),
  emoji: varchar("emoji", { length: 10 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: smallint("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_promotions_is_active").on(table.isActive),
  index("idx_promotions_sort_order").on(table.sortOrder),
]);

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  courtId: uuid("court_id").notNull().references(() => courts.id, { onDelete: "cascade" }),
  slotDate: varchar("slot_date", { length: 10 }).notNull(),    // YYYY-MM-DD
  slotStart: varchar("slot_start", { length: 5 }).notNull(),   // HH:mm
  slotEnd: varchar("slot_end", { length: 5 }).notNull(),       // HH:mm
  discountPercent: smallint("discount_percent").notNull(),     // 10-90
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_deals_court_id").on(table.courtId),
  index("idx_deals_valid_until").on(table.validUntil),
  index("idx_deals_is_active").on(table.isActive),
]);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 20 }).notNull().default("SYSTEM"),
  // SYSTEM | PROMOTION | MATCH | BOOKING | ADMIN
  isRead: boolean("is_read").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  metadata: jsonb("metadata").default({}),
  // { discountCode, bookingId, matchId, ctaHref, ctaLabel }
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_is_read").on(table.isRead),
  index("idx_notifications_type").on(table.type),
  index("idx_notifications_created_at").on(table.createdAt),
]);
// ─── Club Reviews ─────────────────────────────────────────────────────────────

export const clubReviews = pgTable("club_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: smallint("rating").notNull(),         // 1-5
  comment: text("comment"),
  ownerReply: text("owner_reply"),
  ownerRepliedAt: timestamp("owner_replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_club_reviews_club_id").on(table.clubId),
  index("idx_club_reviews_user_id").on(table.userId),
]);
