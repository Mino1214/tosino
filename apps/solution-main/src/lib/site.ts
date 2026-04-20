export const SITE_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) ||
  "https://tozinosolution.com";

export const SITE_NAME = "Tozino Solution";

export const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@tozinosolution.com";

export const telegramUrl =
  process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/tozinosolution";

export const whatsappUrl =
  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
  "https://wa.me/0000000000000?text=Hello%20Tozino%20Solution";
