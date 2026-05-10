export const AMENITY_META = {
  parking: { icon: "🅿️", label: "پارکینگ" },
  locker: { icon: "🔒", label: "رختکن" },
  shower: { icon: "🚿", label: "دوش" },
  cafe: { icon: "☕", label: "کافه" },
  wifi: { icon: "📶", label: "وای‌فای" },
  lighting: { icon: "💡", label: "روشنایی شبانه" },
  shop: { icon: "🛒", label: "فروشگاه" },
  coaching: { icon: "🏅", label: "کوچینگ" },
  firstaid: { icon: "🩺", label: "کمک‌های اولیه" },
  ac: { icon: "❄️", label: "تهویه مطبوع" },
};

export const SPORT_META = {
  padel: { label: "پادل", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  tennis: { label: "تنیس", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  squash: { label: "اسکواش", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  badminton: { label: "بدمینتون", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
};

export const BADGE_META = {
  popular: { label: "محبوب", className: "bg-orange-500 text-white" },
  top_rated: { label: "برترین", className: "bg-primary text-white" },
  available_today: { label: "امروز موجود", className: "bg-emerald-500 text-white" },
  new: { label: "جدید", className: "bg-purple-500 text-white" },
};

export const MOCK_CLUBS = [
  {
    id: "club-padel-north",
    name: "پادل پارک شمال",
    sportTypes: ["padel", "tennis"],
    location: "تهران، الهیه",
    address: "تهران، الهیه، خیابان فرمانیه، پلاک ۱۲",
    rating: 4.9,
    reviewCount: 218,
    priceFrom: 180000,
    coverImage: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80",
    ],
    badges: ["top_rated", "available_today"],
    description:
      "پادل پارک شمال با ۶ زمین حرفه‌ای پادل و ۲ زمین تنیس در یکی از بهترین مناطق تهران واقع شده است. امکانات درجه یک، روشنایی مناسب برای بازی شبانه و کادر مجرب کوچینگ از ویژگی‌های این مجموعه است.",
    amenities: ["parking", "locker", "shower", "cafe", "wifi", "lighting", "coaching"],
    openTime: "07:00",
    closeTime: "23:00",
    courts: [
      { id: "mock-c1", name: "زمین پادل ۱", sportType: "padel", surfaceType: "artificial", pricePerHour: 180000, openTime: "07:00", closeTime: "23:00", location: "پادل پارک شمال" },
      { id: "mock-c2", name: "زمین پادل ۲", sportType: "padel", surfaceType: "artificial", pricePerHour: 180000, openTime: "07:00", closeTime: "23:00", location: "پادل پارک شمال" },
      { id: "mock-c3", name: "زمین تنیس ۱", sportType: "tennis", surfaceType: "hard", pricePerHour: 220000, openTime: "07:00", closeTime: "22:00", location: "پادل پارک شمال" },
    ],
  },
  {
    id: "club-tennis-academy",
    name: "آکادمی تنیس سپهر",
    sportTypes: ["tennis"],
    location: "تهران، سعادت‌آباد",
    address: "تهران، سعادت‌آباد، فلکه دوم، پلاک ۸",
    rating: 4.7,
    reviewCount: 156,
    priceFrom: 200000,
    coverImage: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
    ],
    badges: ["popular"],
    description:
      "آکادمی تنیس سپهر با ۴ زمین تنیس استاندارد و مربیان حرفه‌ای، بهترین انتخاب برای بازیکنان مبتدی و حرفه‌ای است. زمین‌های خاک رس و سخت در دسترس هستند.",
    amenities: ["parking", "locker", "shower", "cafe", "coaching", "firstaid"],
    openTime: "07:00",
    closeTime: "22:00",
    courts: [
      { id: "mock-c4", name: "زمین خاک رس ۱", sportType: "tennis", surfaceType: "clay", pricePerHour: 200000, openTime: "07:00", closeTime: "22:00", location: "آکادمی تنیس سپهر" },
      { id: "mock-c5", name: "زمین سخت ۱", sportType: "tennis", surfaceType: "hard", pricePerHour: 250000, openTime: "07:00", closeTime: "22:00", location: "آکادمی تنیس سپهر" },
    ],
  },
  {
    id: "club-sports-complex",
    name: "مجموعه ورزشی آزادی",
    sportTypes: ["padel", "squash", "badminton"],
    location: "تهران، آزادی",
    address: "تهران، خیابان آزادی، مجموعه ورزشی شهید شیرودی",
    rating: 4.6,
    reviewCount: 89,
    priceFrom: 120000,
    coverImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=900&q=80",
    ],
    badges: ["available_today", "new"],
    description:
      "مجموعه ورزشی آزادی با گسترده‌ترین انتخاب ورزش‌ها، شامل پادل، اسکواش و بدمینتون، گزینه‌ای ایده‌آل برای خانواده‌ها و گروه‌های دوستی است.",
    amenities: ["parking", "locker", "shower", "shop", "wifi", "lighting", "ac"],
    openTime: "08:00",
    closeTime: "22:00",
    courts: [
      { id: "mock-c6", name: "زمین اسکواش ۱", sportType: "squash", surfaceType: "hard", pricePerHour: 120000, openTime: "08:00", closeTime: "22:00", location: "مجموعه ورزشی آزادی" },
      { id: "mock-c7", name: "زمین بدمینتون ۱", sportType: "badminton", surfaceType: "hard", pricePerHour: 150000, openTime: "08:00", closeTime: "22:00", location: "مجموعه ورزشی آزادی" },
      { id: "mock-c8", name: "زمین پادل ۱", sportType: "padel", surfaceType: "artificial", pricePerHour: 160000, openTime: "08:00", closeTime: "22:00", location: "مجموعه ورزشی آزادی" },
    ],
  },
  {
    id: "club-padel-west",
    name: "پادل کلاب غرب",
    sportTypes: ["padel"],
    location: "تهران، پونک",
    address: "تهران، پونک، خیابان اشرفی اصفهانی، پلاک ۳۳",
    rating: 4.5,
    reviewCount: 67,
    priceFrom: 160000,
    coverImage: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
    ],
    badges: ["available_today"],
    description:
      "پادل کلاب غرب با ۳ زمین پادل سرپوشیده و امکانات مدرن، گزینه مناسبی برای بازی در هر آب‌وهوایی است.",
    amenities: ["parking", "locker", "shower", "wifi", "lighting", "ac"],
    openTime: "08:00",
    closeTime: "23:00",
    courts: [
      { id: "mock-c9", name: "زمین پادل A", sportType: "padel", surfaceType: "artificial", pricePerHour: 160000, openTime: "08:00", closeTime: "23:00", location: "پادل کلاب غرب" },
      { id: "mock-c10", name: "زمین پادل B", sportType: "padel", surfaceType: "artificial", pricePerHour: 160000, openTime: "08:00", closeTime: "23:00", location: "پادل کلاب غرب" },
    ],
  },
  {
    id: "club-racket-east",
    name: "رکت زون شرق",
    sportTypes: ["padel", "squash"],
    location: "تهران، نارمک",
    address: "تهران، نارمک، خیابان هنگام، پلاک ۵۵",
    rating: 4.4,
    reviewCount: 42,
    priceFrom: 130000,
    coverImage: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
    ],
    badges: [],
    description:
      "رکت زون شرق با قیمت‌های مناسب و دسترسی آسان، بهترین گزینه برای بازیکنان شرق تهران است.",
    amenities: ["parking", "locker", "lighting", "wifi"],
    openTime: "09:00",
    closeTime: "22:00",
    courts: [
      { id: "mock-c11", name: "زمین پادل ۱", sportType: "padel", surfaceType: "artificial", pricePerHour: 130000, openTime: "09:00", closeTime: "22:00", location: "رکت زون شرق" },
      { id: "mock-c12", name: "زمین اسکواش ۱", sportType: "squash", surfaceType: "hard", pricePerHour: 140000, openTime: "09:00", closeTime: "22:00", location: "رکت زون شرق" },
    ],
  },
];

export function getClubById(id) {
  return MOCK_CLUBS.find((c) => c.id === id) ?? null;
}
