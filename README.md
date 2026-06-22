# Soat Bot 🕒

Foydalanuvchining Telegram profiliga avtomatik soat o'rnatuvchi professional bot.

## Imkoniyatlar

- **Profil soat** — Last Name ni har daqiqada joriy vaqt bilan yangilash
- **Bio soat** — Profil bio ni har daqiqada yangilash (Plus/Premium)
- **Soat fontlari** — Turli font uslublari
- **Online rejim** — 24/7 online ko'rinish (Premium)
- **To'lov tizimi** — Humo va Uzcard orqali to'lov
- **Tarif tizimi** — Free, Standard, Plus, Premium
- **Admin panel** — To'liq boshqaruv paneli

## O'rnatish

### 1. Talablar

- Node.js v20+
- Telegram Bot Token ([@BotFather](https://t.me/BotFather) dan)
- Telegram API ID va Hash ([my.telegram.org](https://my.telegram.org) dan)

### 2. Paketlarni o'rnatish

```bash
npm install
```

### 3. .env faylini sozlash

```bash
cp .env.example .env
```

`.env` faylini tahrirlang:

```env
BOT_TOKEN=7123456789:AAF...your_bot_token
BOT_USERNAME=your_bot_username
ADMIN_IDS=123456789
API_ID=12345678
API_HASH=abcdef1234567890abcdef1234567890
ENCRYPTION_KEY=your32charencryptionkeyhere1234
DEV_USERNAME=@your_dev_username
```

### 4. Botni ishga tushirish

```bash
# Oddiy ishga tushirish
npm start

# Development (nodemon bilan)
npm run dev
```

## Fayl tuzilmasi

```
soat.js              # Asosiy fayl
config/              # Konfiguratsiya
handlers/            # Callback va command handlerlar
admin/               # Admin panel
services/            # MTProto, Clock tizimi
database/            # JSON database
utils/               # Yordamchi funksiyalar
data/                # JSON ma'lumotlar
sessions/            # Foydalanuvchi sessiyalari (shifrlangan)
```

## Admin panel

Bot admin ID si `.env` faylida `ADMIN_IDS` ga yozing.

Admin panelini ochish: `/panel`

Admin buyruqlari:
- 📢 Broadcast yuborish
- 💰 Balans qo'shish/ayirish
- 📌 Majburiy kanallar boshqaruvi
- 💳 Kartalar boshqaruvi
- 🚫 Ban/Unban
- 💰 Tarif narxlarini o'zgartirish
- 📊 Statistika
- 📋 Loglar
- 📤 Export

## Xavfsizlik

- Sessiyalar AES-256-CBC bilan shifrlangan
- Kod va parollar log ga yozilmaydi
- Rate limiting — minutiga 30 ta so'rov
- Admin ID lar .env orqali boshqariladi

## Muhim eslatmalar

1. Bot kanallarning admini bo'lishi kerak (majburiy obuna uchun)
2. `API_ID` va `API_HASH` ni [my.telegram.org](https://my.telegram.org/apps) dan oling
3. `ENCRYPTION_KEY` ni albatta o'zgartiring (32 ta belgi)
4. Production da PM2 dan foydalaning: `npm run pm2`

## Tarif tizimi

| Tarif | Narx | Imkoniyatlar |
|-------|------|-------------|
| 🔰 Free | 0 so'm | Profil soat (reklamali) |
| ⏰ Standard | 2,000 so'm | Profil soat (reklamasiz) |
| ✨ Plus | 5,000 so'm | + Bio soat, Ba'zi fontlar |
| ⭐️ Premium | 10,000 so'm | + Online mode, Hamma fontlar |
