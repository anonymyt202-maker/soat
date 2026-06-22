const { Markup } = require('telegraf');
const { FONTS, FREE_FONTS, PLUS_FONTS, PREMIUM_FONTS, BIO_TYPES, TIMEZONES } = require('../config/constants');
const { Tariffs } = require('../database/db');

function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Soat O\'rnatish 🕒', 'menu_install'),
      Markup.button.callback('Soat Sozlamalari ⚙️', 'menu_settings'),
    ],
    [
      Markup.button.callback('Tariflar 🛍', 'menu_tariffs'),
      Markup.button.callback('Mening Hisobim 👤', 'menu_account'),
    ],
    [Markup.button.callback('Hisob To\'ldirish 💳', 'menu_topup')],
    [Markup.button.callback('Savollar (FAQ) ❓', 'menu_faq')],
  ]);
}

function installMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('O\'qib chiqdim ✅', 'install_accept')],
    [Markup.button.callback('🔙 Orqaga', 'back_main')],
  ]);
}

function requestPhoneKeyboard() {
  return Markup.keyboard([
    [Markup.button.contactRequest('📞 Telefon raqamni jo\'natish')],
    [Markup.button.text('❌ Bekor qilish')],
  ]).resize().oneTime();
}

function removeKeyboard() {
  return Markup.removeKeyboard();
}

function settingsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚙️ Umumiy sozlamalar', 'settings_general')],
    [Markup.button.callback('👤 Nickdagi soat sozlamalari', 'settings_nick')],
    [Markup.button.callback('📝 Biodagi soat sozlamalari', 'settings_bio')],
    [Markup.button.callback('📋 Tarifim', 'settings_tariff')],
    [Markup.button.callback('🔙 Orqaga', 'back_main')],
  ]);
}

function generalSettingsKeyboard(user) {
  const onlineLabel = user.onlineMode
    ? '🔴 Online rejimni o\'chirish'
    : '🟢 Online rejimni yoqish';
  const tzKey = user.timezone || 'uz';
  const tzLabel = TIMEZONES[tzKey]?.label || 'GMT+5';
  return Markup.inlineKeyboard([
    [Markup.button.callback(onlineLabel, 'general_online_toggle')],
    [Markup.button.callback(`🌍 Vaqt hududi: ${tzLabel} (o\'zgartirish)`, 'general_timezone')],
    [Markup.button.callback('🔙 Orqaga', 'menu_settings')],
  ]);
}

function timezoneKeyboard(currentTz) {
  const tzList = [
    { key: 'uz', label: 'Uzbekistan 🇺🇿 (GMT+5)' },
    { key: 'ru', label: 'Russia 🇷🇺 (GMT+3)' },
    { key: 'us', label: 'America 🇺🇸 (GMT+4)' },
    { key: 'ir', label: 'Iran 🇮🇷 (GMT+3.5)' },
    { key: 'kr', label: 'Korea 🇰🇷 (GMT+9)' },
  ];
  const buttons = tzList.map(tz => [
    Markup.button.callback(
      (tz.key === currentTz ? '✅ ' : '') + tz.label,
      `timezone_select_${tz.key}`
    ),
  ]);
  buttons.push([Markup.button.callback('🔙 Orqaga', 'settings_general')]);
  return Markup.inlineKeyboard(buttons);
}

function nickSettingsKeyboard(user) {
  const status = user.nickClockOn ? '🟢 Yoniq' : '🔴 O\'chiq';
  const toggleLabel = user.nickClockOn ? '🔴 O\'chirish' : '🟢 Yoqish';
  return Markup.inlineKeyboard([
    [Markup.button.callback(`📊 Holat: ${status}`, 'nick_status_info')],
    [Markup.button.callback(toggleLabel, 'nick_toggle')],
    [Markup.button.callback('🔤 Font tanlash', 'nick_font')],
    [Markup.button.callback('🔙 Orqaga', 'menu_settings')],
  ]);
}

function bioSettingsKeyboard(user) {
  const status = user.bioClockOn ? '🟢 Yoniq' : '🔴 O\'chiq';
  const toggleLabel = user.bioClockOn ? '🔴 O\'chirish' : '🟢 Yoqish';
  return Markup.inlineKeyboard([
    [Markup.button.callback(`📊 Holat: ${status}`, 'bio_status_info')],
    [Markup.button.callback(toggleLabel, 'bio_toggle')],
    [Markup.button.callback('🎨 Bio turini tanlash', 'bio_type')],
    [Markup.button.callback('🔙 Orqaga', 'menu_settings')],
  ]);
}

function fontKeyboard(userTariff) {
  let availableFonts;
  if (userTariff === 'premium') availableFonts = PREMIUM_FONTS;
  else if (userTariff === 'plus') availableFonts = PLUS_FONTS;
  else availableFonts = FREE_FONTS;

  const buttons = availableFonts.map(key => [
    Markup.button.callback(FONTS[key].name, `font_select_${key}`)
  ]);
  buttons.push([Markup.button.callback('🔙 Orqaga', 'settings_nick')]);
  return Markup.inlineKeyboard(buttons);
}

function bioTypeKeyboard() {
  const buttons = Object.values(BIO_TYPES).map(t => [
    Markup.button.callback(t.name, `bio_type_${t.id}`)
  ]);
  buttons.push([Markup.button.callback('🔙 Orqaga', 'settings_bio')]);
  return Markup.inlineKeyboard(buttons);
}

function accountKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎂 Tug\'ilgan kunni kiritish', 'enter_birthday')],
    [Markup.button.callback('🔙 Orqaga', 'back_main')],
  ]);
}

function topupKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💳 Humo', 'topup_humo')],
    [Markup.button.callback('💳 Uzcard', 'topup_uzcard')],
    [Markup.button.callback('🔙 Orqaga', 'back_main')],
  ]);
}

function tariffsKeyboard() {
  const tariffs = Tariffs.getAll();
  const buttons = Object.values(tariffs).map(t => [
    Markup.button.callback(t.name, `buy_tariff_${t.id}`)
  ]);
  buttons.push([Markup.button.callback('🔙 Orqaga', 'back_main')]);
  return Markup.inlineKeyboard(buttons);
}

function cancelKeyboard(backAction = 'back_main') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('❌ Bekor qilish', backAction)],
  ]);
}

function adminPanelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
    [
      Markup.button.callback('➕ Pul qo\'shish', 'admin_add_balance'),
      Markup.button.callback('➖ Pul ayirish', 'admin_remove_balance'),
    ],
    [
      Markup.button.callback('📌 Kanal qo\'shish', 'admin_add_channel'),
      Markup.button.callback('🗑 Kanal o\'chirish', 'admin_remove_channel'),
    ],
    [
      Markup.button.callback('💳 Karta qo\'shish', 'admin_add_card'),
      Markup.button.callback('🗑 Karta o\'chirish', 'admin_remove_card'),
    ],
    [
      Markup.button.callback('🚫 Ban', 'admin_ban'),
      Markup.button.callback('✅ Unban', 'admin_unban'),
    ],
    [Markup.button.callback('💰 Tariflarni tahrirlash', 'admin_edit_tariffs')],
    [
      Markup.button.callback('👥 Foydalanuvchilar', 'admin_users'),
      Markup.button.callback('📊 Statistika', 'admin_stats'),
    ],
    [
      Markup.button.callback('💳 To\'lovlar', 'admin_payments'),
      Markup.button.callback('📋 Loglar', 'admin_logs'),
    ],
    [
      Markup.button.callback('⚙️ Tizim holati', 'admin_system'),
      Markup.button.callback('📤 Export JSON', 'admin_export'),
    ],
    [Markup.button.callback('🔄 Clock tizimini qayta ishga tushirish', 'admin_restart_clock')],
  ]);
}

function paymentConfirmKeyboard(paymentId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Tasdiqlash', `pay_confirm_${paymentId}`)],
    [Markup.button.callback('❌ Bekor qilish', `pay_reject_${paymentId}`)],
  ]);
}

function cardTypeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🟩 Humo', 'admin_card_type_humo')],
    [Markup.button.callback('🟦 Uzcard', 'admin_card_type_uzcard')],
    [Markup.button.callback('❌ Bekor', 'admin_back')],
  ]);
}

function subscribeChannelKeyboard(channels) {
  const buttons = channels.map(ch => [
    Markup.button.url(`📢 ${ch.title || ch.username || ch.id}`, ch.inviteLink || `https://t.me/${(ch.username || '').replace('@', '')}`)
  ]);
  buttons.push([Markup.button.callback('✅ Obuna bo\'ldim', 'check_subscription')]);
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  mainMenuKeyboard,
  installMenuKeyboard,
  requestPhoneKeyboard,
  removeKeyboard,
  settingsKeyboard,
  generalSettingsKeyboard,
  timezoneKeyboard,
  nickSettingsKeyboard,
  bioSettingsKeyboard,
  fontKeyboard,
  bioTypeKeyboard,
  accountKeyboard,
  topupKeyboard,
  tariffsKeyboard,
  cancelKeyboard,
  adminPanelKeyboard,
  paymentConfirmKeyboard,
  cardTypeKeyboard,
  subscribeChannelKeyboard,
};
