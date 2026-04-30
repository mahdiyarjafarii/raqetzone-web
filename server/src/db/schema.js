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
  gptId: uuid("gpt_id").references(() => gpts.id, { onDelete: "set null" }),
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

export const gptCategories = pgTable("gpt_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gpts = pgTable("gpts", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => gptCategories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  image: varchar("image", { length: 500 }),
  systemPrompt: text("system_prompt").notNull(),
  questions: jsonb("questions").default([]),
  type: varchar("type", { length: 20 }),
  index: integer("index"),
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

export const models = pgTable("models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'chat' or 'image'
  price: integer("price").notNull().default(1),
  systemPrompt: text("system_prompt").default(""),
  description: text("description").default(""),
});

export const imageGenerations = pgTable("image_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  modelSlug: varchar("model_slug", { length: 255 }).notNull(),
  prompt: text("prompt").notNull(),
  config: jsonb("config").default({}), // { aspectRatio, style, generationCount }
  images: jsonb("images").default([]), // [{ url, downloadedPath, s3Key, s3Url }]
  errorMessage: text("error_message"), // Error message if generation fails
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoGenerations = pgTable("video_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  modelSlug: varchar("model_slug", { length: 255 }).notNull(),
  prompt: text("prompt").notNull(),
  config: jsonb("config").default({}), // { resolution, aspectRatio, duration }
  imageReference: text("image_reference"), // URL or path to reference image for video generation
  status: varchar("status", { length: 20 }).default("queued"), // queued | processing | completed | error
  progress: integer("progress").default(0), // 0-100
  errorMessage: text("error_message"), // Error message if status is error
  videoUrl: text("video_url"), // URL from provider
  videoPath: varchar("video_path", { length: 500 }), // Local path after download
  thumbnailPath: varchar("thumbnail_path", { length: 500 }), // Generated thumbnail
  videoS3Key: varchar("video_s3_key", { length: 500 }), // S3 key for video
  videoS3Url: text("video_s3_url"), // S3 public URL for video
  thumbnailS3Key: varchar("thumbnail_s3_key", { length: 500 }), // S3 key for thumbnail
  thumbnailS3Url: text("thumbnail_s3_url"), // S3 public URL for thumbnail
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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