# Raqetzone — Agent Guide

> این فایل سند مرجع اصلی برای توسعه پروژه Raqetzone است.
> هر تصمیم، پیاده‌سازی، یا تغییر باید با این فایل هم‌راستا باشد.

---

## ۱. معرفی پروژه

**Raqetzone** یک پلتفرم اجتماعی-ورزشی است که به کاربران امکان می‌دهد:
- زمین‌های ورزشی (پدل، تنیس) را رزرو کنند
- با سایر بازیکنان مچ بازی برگزار کنند
- در تورنمنت‌ها شرکت کنند
- با مربی‌ها ارتباط بگیرند و جلسه خصوصی رزرو کنند
- رنکینگ ورزشی دریافت کنند
- از هوش مصنوعی در قالب چت‌بات استفاده کنند

---

## ۲. معماری کلی پروژه

### ساختار Monorepo

```
raqetzone/
├── server/          # Backend (Node.js + Express)
├── ui/              # Frontend کاربر (React + Vite)
├── admin/           # پنل ادمین (React + Vite)
└── gateway/         # درگاه پرداخت (Node.js + Express)
```

### Stack فنی

| لایه | تکنولوژی |
|------|-----------|
| Backend | Node.js, Express.js (ESM), Socket.IO |
| Database | PostgreSQL + Drizzle ORM |
| Cache / Queue | Redis (ioredis) + BullMQ |
| Frontend | React 18, React Router v7, Vite |
| State Management | Jotai (atomic state) |
| UI Components | Radix UI + Tailwind CSS v4 + shadcn/ui |
| Auth | JWT + OTP (SMS via Kavenegar / smsir) |
| File Storage | AWS S3 |
| AI | Anthropic Claude, OpenAI, Google Gemini, Groq |
| Notifications | Socket.IO (real-time) + SMS |
| Logging | Winston + Daily Rotate File |

---

## ۳. ساختار دقیق فایل‌ها

### Backend (`server/src/`)

```
server/src/
├── index.js                # Entry point: Express + Socket.IO setup
├── config/
│   └── env.js              # Environment variables
├── db/
│   ├── index.js            # Drizzle DB connection
│   ├── schema.js           # تمام جداول DB (single source of truth)
│   └── migrations/         # Migration فایل‌های SQL
├── routes/                 # Route registrations (فقط route، بدون logic)
├── controllers/            # Business logic handlers
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── adminAuth.js        # Admin guard
│   ├── clubOwnerAuth.js    # Club owner guard
│   ├── errorHandler.js     # Global error handler
│   └── requestLogger.js    # HTTP request logging
├── jobs/                   # Cron jobs (BullMQ / node-cron)
├── utils/
│   ├── stream/             # AI streaming (Anthropic, OpenAI, Google, Groq)
│   ├── credits/            # منطق اعتبار کاربر
│   ├── sms.js              # ارسال SMS
│   ├── sendNotification.js # ارسال نوتیفیکیشن real-time
│   ├── ranking.js          # محاسبه رنکینگ
│   ├── validation.js       # Zod validation schemas
│   ├── redis-cache.js      # Cache helpers
│   └── ...
├── lib/
│   └── redis.js            # Redis client instance
├── shared/                 # Shared constants/types
└── queues/                 # BullMQ queue definitions
```

### Frontend (`ui/src/`)

```
ui/src/
├── main.jsx                # Entry point
├── App.jsx                 # Root component + providers
├── routers/
│   └── index.jsx           # React Router routes
├── pages/                  # Page-level components (per route)
│   ├── ai/                 # صفحه چت‌بات
│   ├── booking/            # رزرو زمین
│   ├── clubs/              # لیست و جزئیات باشگاه
│   ├── coaches/            # مربی‌ها
│   ├── game/               # بازی Tennis Duel
│   ├── messages/           # پیام مستقیم
│   ├── mybooking/          # رزروهای من
│   ├── notifications/      # اعلان‌ها
│   ├── tournament/         # تورنمنت
│   └── user/               # پروفایل کاربر
├── features/               # Feature-based modules (هر feature مستقل)
│   ├── home/               # {components, hooks, services}
│   ├── booking/            # {components, hooks, services, store}
│   ├── clubs/              # {components, hooks, data}
│   ├── coaches/            # {services}
│   ├── profile/            # {components, hooks, services}
│   ├── tournaments/        # {components, services, store}
│   ├── notifications/      # {components, hooks, services, store}
│   ├── ranking/
│   └── wallet/
├── components/
│   ├── ui/                 # Base UI components (shadcn, Radix-based)
│   └── tournament/         # Shared tournament components
├── services/               # Global API call functions (apisauce)
├── store/                  # Global Jotai atoms
├── hooks/                  # Global custom hooks
├── auth/                   # Auth logic و guards
├── config/                 # Config constants (preferenceKeys, etc.)
├── lib/                    # Utility functions
└── assets/                 # Images, SVGs, Lottie files, Fonts
```

---

## ۴. مدل داده (موجودیت‌های اصلی)

| جدول | توضیح |
|------|-------|
| `users` | کاربران (شامل فیلدهای coach، subscription، xp، level) |
| `clubs` | باشگاه‌های ورزشی |
| `courts` | زمین‌های هر باشگاه |
| `bookings` | رزروهای زمین |
| `matches` | مچ‌های بازی |
| `tournaments` | تورنمنت‌ها |
| `chats` / `messages` | چت‌بات AI |
| `wallets` / `wallet_transactions` | کیف پول |
| `notifications` | نوتیفیکیشن‌ها |
| `rankings` | رنکینگ بازیکنان |
| `reviews` | نظرات |
| `discount_codes` | کدهای تخفیف |
| `otp_codes` | کدهای تأیید SMS |

---

## ۵. قوانین توسعه (Development Rules)

### ۵.۱ Naming Conventions

**Backend:**
- فایل‌ها: `camelCase.js` (مثال: `matchController.js`)
- توابع controller: `camelCase` (مثال: `createMatch`, `getMatchById`)
- جداول DB: `snake_case` در SQL، `camelCase` در Drizzle schema
- متغیرها: `camelCase`، ثابت‌ها: `UPPER_SNAKE_CASE`
- Route paths: `kebab-case` (مثال: `/api/matches/:id/join`)

**Frontend:**
- کامپوننت‌ها: `PascalCase.jsx` (مثال: `MatchCard.jsx`)
- هوک‌ها: `use` prefix + `camelCase` (مثال: `useMatchData.js`)
- Atom‌های Jotai: `camelCaseAtom` (مثال: `userAtom`)
- Service files: `camelCase.js` (مثال: `matchService.js`)
- CSS classes: Tailwind utilities، بدون CSS module سفارشی

### ۵.۲ ساختار یک Route کامل (Backend)

```
route file → controller function → db query (Drizzle) → response
```

- **Routes** فقط وظیفه تعریف endpoint و اتصال به middleware و controller را دارند
- **Controllers** همه business logic را handle می‌کنند
- اعتبارسنجی با **Zod** در ابتدای controller انجام می‌شود
- خطاها با `throw` به `errorHandler.js` ارسال می‌شوند

### ۵.۳ ساختار یک Feature کامل (Frontend)

هر feature در `features/` باید:
```
features/featureName/
├── components/   # UI components مخصوص این feature
├── hooks/        # Custom hooks (data fetching, logic)
├── services/     # API calls با apisauce
└── store/        # Jotai atoms مخصوص این feature (در صورت نیاز)
```

- **Pages** فقط layout هستند و از feature components استفاده می‌کنند
- Data fetching در **hooks** انجام می‌شود، نه مستقیم در component
- API calls فقط در **services** قرار می‌گیرند

---

## ۶. Workflow ایجنت

### مراحل تحلیل → طراحی → پیاده‌سازی → تست

**۱. تحلیل (Analyze)**
- فایل‌های مرتبط را شناسایی کن (route، controller، schema، UI page)
- جریان داده را از endpoint تا UI ترسیم کن
- تأثیر بر سایر ماژول‌ها را بسنج

**۲. طراحی (Design)**
- اگر نیاز به تغییر schema باشد: migration جدید بساز، هرگز schema.js را مستقیم تغییر نده بدون migration
- اگر endpoint جدید است: در route مناسب اضافه کن، controller جدید یا متد جدید در controller موجود
- اگر UI جدید است: تعیین کن page است یا feature component

**۳. پیاده‌سازی (Implement)**
- از کوچک‌ترین لایه شروع کن: DB schema → controller → route → UI
- هر تغییر را minimal نگه دار؛ فقط آنچه لازم است تغییر کند
- از pattern‌های موجود در کد پیروی کن، abstraction جدید نساز

**۴. تأیید (Verify)**
- تغییرات را با فایل‌های مجاور چک کن (آیا naming سازگار است؟)
- مطمئن شو که middleware‌های لازم اعمال شده‌اند
- Socket.IO events را در صورت نیاز به `sendNotification.js` اضافه کن

---

## ۷. الگوهای کلیدی پروژه

### Auth Middleware

```js
// سه سطح دسترسی وجود دارد:
import { authenticate } from "../middleware/auth.js";          // کاربر عادی
import { authenticateAdmin } from "../middleware/adminAuth.js"; // ادمین
import { authenticateClubOwner } from "../middleware/clubOwnerAuth.js"; // صاحب باشگاه
```

### Real-time Notification

```js
import { sendNotification } from "../utils/sendNotification.js";
// برای ارسال نوتیفیکیشن به کاربر خاص
await sendNotification(userId, { type, title, body, data });
```

### SMS

```js
import { sendSms } from "../utils/sms.js";
await sendSms(phone, templateId, params);
```

### Cache

```js
import { getCache, setCache, deleteCache } from "../utils/redis-cache.js";
```

### AI Streaming

همه AI providers در `utils/stream/` هستند. استفاده از `utils/stream/index.js` به عنوان entry point.

### Validation (Zod)

```js
import { z } from "zod";
const schema = z.object({ ... });
const result = schema.safeParse(req.body);
if (!result.success) return res.status(400).json({ error: result.error });
```

---

## ۸. Best Practices

### کدنویسی
- توابع کوچک و تک‌مسئولیتی بنویس
- از `async/await` استفاده کن، هرگز `.then().catch()` زنجیره‌ای نساز
- `try/catch` در controller‌ها را به `errorHandler.js` واگذار کن (با `next(error)`)
- متغیرهای محیطی را فقط از `config/env.js` بخوان، هرگز مستقیم از `process.env`

### Database
- همه query‌ها با Drizzle ORM نوشته می‌شوند، SQL خام فقط در migration‌ها
- Index‌های لازم را در schema.js تعریف کن
- برای تغییر schema: `db:gen` → بررسی migration → `db:push`

### Frontend
- هرگز state global را بی‌دلیل اضافه نکن؛ اول local state را امتحان کن
- API calls را cache-aware بنویس (از loading/error state استفاده کن)
- از Lottie animations موجود در `assets/lottie/` استفاده کن
- Font پروژه Vazirmatn است؛ font دیگری اضافه نکن

### Performance
- از Redis cache برای data پرتکرار استفاده کن
- تصاویر را قبل از ذخیره با sharp فشرده کن (upload controller)
- Socket.IO events را فقط برای data واقعاً real-time استفاده کن

---

## ۹. محدودیت‌ها و ممنوعیت‌ها

### ممنوع است:
- **تغییر مستقیم schema.js بدون migration** — همیشه migration جدید بساز
- **ذخیره secrets در کد** — همه از `.env` خوانده می‌شوند
- **استفاده از `console.log` در production code** — از `logger.js` استفاده کن
- **Raw SQL در کد** — فقط Drizzle ORM
- **نصب پکیج بدون بررسی** — بررسی کن آیا functionality موجود نیست

### نیاز به تأیید قبل از اجرا:
- تغییر schema پایگاه داده (migrations)
- تغییر در `middleware/auth.js` یا سایر middlewares امنیتی
- تغییر در منطق wallet و payment
- force push به branch اصلی
- حذف فایل یا دایرکتوری

---

## ۱۰. محیط‌های اجرا

| سرویس | Command | Port |
|--------|---------|------|
| Backend | `cd server && npm run dev` | 3001 |
| Frontend (UI) | `cd ui && npm run dev` | 5173 |
| Admin Panel | `cd admin && npm run dev` | 5174 |
| Payment Gateway | `cd gateway && node server.js` | 3000 |
| DB Studio | `cd server && npm run db:studio` | — |

---

## ۱۱. راهنمای استفاده برای تسک‌های جدید

### قبل از شروع هر تسک:
1. این فایل را مرور کن
2. فایل‌های مرتبط با تسک را شناسایی کن
3. الگوی موجود مشابه در کد را پیدا کن و از آن پیروی کن

### چک‌لیست قبل از تحویل تغییر:
- [ ] Naming conventions رعایت شده
- [ ] Migration اگر schema تغییر کرده
- [ ] Middleware‌های لازم اعمال شده
- [ ] پکیج جدیدی نصب نشده مگر ضروری
- [ ] console.log باقی نمانده
- [ ] Sensitive data در کد نیست

### وقتی الگوی مشابه پیدا نشد:
1. ساده‌ترین راه‌حل را انتخاب کن
2. از abstraction جدید پرهیز کن
3. اگر تصمیم معماری مهمی است، قبل از پیاده‌سازی تأیید بگیر
