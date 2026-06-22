require('dotenv').config();

const { Telegraf } = require('telegraf');
const config = require('./config');

if (!config.bot.token) {
  console.error('[ERROR] BOT_TOKEN .env faylida topilmadi!');
  process.exit(1);
}

if (!config.telegram.apiId || !config.telegram.apiHash) {
  console.error('[ERROR] API_ID va API_HASH .env faylida topilmadi!');
  process.exit(1);
}

const bot = new Telegraf(config.bot.token);
const { rateLimitMiddleware } = require('./utils/rateLimit');

const { handleStart, handleCheckSubscription } = require('./handlers/start');
const { handleInstallMenu, handleInstallAccept, handlePhoneContact, handleTextCancelInstall, handleCodeInput, handle2FAInput } = require('./handlers/install');
const {
  handleSettings, handleGeneralSettings, handleOnlineToggle, handleTimezoneMenu, handleTimezoneSelect,
  handleNickSettings, handleNickToggle, handleNickFont, handleFontSelect,
  handleBioSettings, handleBioToggle, handleBioType, handleBioTypeSelect, handleSettingsTariff,
} = require('./handlers/settings');
const { handleAccount, handleEnterBirthday, handleBirthdayInput } = require('./handlers/account');
const { handleTopup, handleTopupCard, handlePaymentCheck } = require('./handlers/topup');
const { handleTariffs, handleBuyTariff } = require('./handlers/tariffs');
const { handleFaq } = require('./handlers/faq');

const {
  isAdmin, handlePanel, handleBroadcast, handleBroadcastMessage,
  handleAddBalance, handleRemoveBalance, handleAddChannel, handleRemoveChannel,
  handleAddCard, handleCardTypeSelect, handleRemoveCard, handleBanUser, handleUnbanUser,
  handleEditTariffs, handleEditTariffSelect, handleViewUsers, handleStats,
  handleViewPayments, handleViewLogs, handleSystemStatus, handleExportUsers,
  handleRestartClock, handlePayConfirm, handlePayReject, handleAdminStateInput, handleAdminBack,
} = require('./admin/panel');

const { startClockService } = require('./services/clockService');
const { mainMenuKeyboard, removeKeyboard } = require('./utils/keyboards');
const { Users, Channels } = require('./database/db');

bot.use(rateLimitMiddleware());

bot.command('start', handleStart);

bot.command('panel', handlePanel);

bot.on('contact', handlePhoneContact);

bot.action('back_main', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  Users.save(userId, { state: null, stateData: {} });
  const firstName = ctx.from.first_name || 'Foydalanuvchi';
  const text =
    `Assalomu aleykum <b>${firstName}</b> ! 👋\n\n` +
    `📋 O'zingizga kerakli tugmani bosish orqali menuni chiqarishingiz mumkin.`;
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...mainMenuKeyboard() });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...mainMenuKeyboard() });
  }
});

bot.action('check_subscription', handleCheckSubscription);

bot.action('menu_install', handleInstallMenu);
bot.action('install_accept', handleInstallAccept);

bot.action('menu_settings', handleSettings);
bot.action('settings_general', handleGeneralSettings);
bot.action('general_online_status', (ctx) => ctx.answerCbQuery());
bot.action('general_online_toggle', handleOnlineToggle);
bot.action('general_timezone', handleTimezoneMenu);
bot.action(/^timezone_select_(.+)$/, (ctx) => {
  const tzKey = ctx.match[1];
  return handleTimezoneSelect(ctx, tzKey);
});
bot.action('settings_nick', handleNickSettings);
bot.action('nick_toggle', handleNickToggle);
bot.action('nick_font', handleNickFont);
bot.action('nick_status_info', (ctx) => ctx.answerCbQuery());
bot.action('settings_bio', handleBioSettings);
bot.action('bio_toggle', handleBioToggle);
bot.action('bio_type', handleBioType);
bot.action('bio_status_info', (ctx) => ctx.answerCbQuery());
bot.action('settings_tariff', handleSettingsTariff);

bot.action('menu_account', handleAccount);
bot.action('enter_birthday', handleEnterBirthday);

bot.action('menu_topup', handleTopup);
bot.action('topup_humo', (ctx) => handleTopupCard(ctx, 'humo'));
bot.action('topup_uzcard', (ctx) => handleTopupCard(ctx, 'uzcard'));

bot.action('menu_tariffs', handleTariffs);
bot.action('menu_faq', handleFaq);

bot.action(/^font_select_(.+)$/, (ctx) => {
  const fontKey = ctx.match[1];
  return handleFontSelect(ctx, fontKey);
});

bot.action(/^bio_type_(.+)$/, (ctx) => {
  const typeId = ctx.match[1];
  return handleBioTypeSelect(ctx, typeId);
});

bot.action(/^buy_tariff_(.+)$/, (ctx) => {
  const tariffId = ctx.match[1];
  return handleBuyTariff(ctx, tariffId);
});

bot.action('admin_broadcast', handleBroadcast);
bot.action('admin_add_balance', handleAddBalance);
bot.action('admin_remove_balance', handleRemoveBalance);
bot.action('admin_add_channel', handleAddChannel);
bot.action('admin_remove_channel', handleRemoveChannel);
bot.action('admin_add_card', handleAddCard);
bot.action('admin_card_type_humo', (ctx) => handleCardTypeSelect(ctx, 'humo'));
bot.action('admin_card_type_uzcard', (ctx) => handleCardTypeSelect(ctx, 'uzcard'));
bot.action('admin_remove_card', handleRemoveCard);
bot.action('admin_ban', handleBanUser);
bot.action('admin_unban', handleUnbanUser);
bot.action('admin_edit_tariffs', handleEditTariffs);
bot.action('admin_users', handleViewUsers);
bot.action('admin_stats', handleStats);
bot.action('admin_payments', handleViewPayments);
bot.action('admin_logs', handleViewLogs);
bot.action('admin_system', handleSystemStatus);
bot.action('admin_export', handleExportUsers);
bot.action('admin_restart_clock', handleRestartClock);
bot.action('admin_back', handleAdminBack);

bot.action(/^admin_edit_tariff_(.+)$/, (ctx) => {
  const tariffId = ctx.match[1];
  return handleEditTariffSelect(ctx, tariffId);
});

bot.action(/^admin_rm_ch_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫');
  const channelId = ctx.match[1];
  Channels.remove(channelId);
  await ctx.answerCbQuery('✅ Kanal o\'chirildi');
  await handleAdminBack(ctx);
});

bot.action(/^admin_rm_card_(.+)_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫');
  const type = ctx.match[1];
  const cardId = ctx.match[2];
  const { Cards } = require('./database/db');
  Cards.remove(type, cardId);
  await ctx.answerCbQuery('✅ Karta o\'chirildi');
  await handleAdminBack(ctx);
});

bot.action(/^pay_confirm_(.+)$/, (ctx) => {
  const paymentId = ctx.match[1];
  return handlePayConfirm(ctx, paymentId);
});

bot.action(/^pay_reject_(.+)$/, (ctx) => {
  const paymentId = ctx.match[1];
  return handlePayReject(ctx, paymentId);
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (text === '❌ Bekor qilish') {
    return handleTextCancelInstall(ctx);
  }

  const user = Users.get(userId);
  if (!user) return;

  if (isAdmin(userId)) {
    const handled = await handleAdminStateInput(ctx, text);
    if (handled) return;
    
    const broadcastHandled = await handleBroadcastMessage(ctx);
    if (broadcastHandled) return;
  }

  if (user.state === 'awaiting_code') {
    const handled = await handleCodeInput(ctx, text);
    if (handled) return;
  }

  if (user.state === 'awaiting_2fa') {
    const handled = await handle2FAInput(ctx, text);
    if (handled) return;
  }

  if (user.state === 'awaiting_birthday') {
    const handled = await handleBirthdayInput(ctx, text);
    if (handled) return;
  }

  if (user.state === 'awaiting_payment_check') {
    await ctx.reply('📸 Iltimos, chek rasmini yuboring.', removeKeyboard());
    return;
  }
});

bot.on(['photo', 'document'], async (ctx) => {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return;

  if (user.state === 'awaiting_payment_check') {
    await handlePaymentCheck(ctx);
    return;
  }

  if (isAdmin(userId) && user.state === 'admin_broadcast') {
    await handleBroadcastMessage(ctx);
    return;
  }
});

bot.on(['video', 'animation', 'sticker', 'voice', 'audio'], async (ctx) => {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return;

  if (isAdmin(userId) && user.state === 'admin_broadcast') {
    await handleBroadcastMessage(ctx);
    return;
  }
});

bot.catch((err, ctx) => {
  console.error('[Bot Error]', err.message, ctx?.updateType);
});

async function main() {
  console.log('[soat.js] Bot ishga tushirilmoqda...');

  startClockService(bot);
  console.log('[soat.js] Clock tizimi ishga tushirildi');

  await bot.launch();
  console.log(`[soat.js] Bot muvaffaqiyatli ishga tushdi! @${config.bot.username}`);
}

process.once('SIGINT', () => {
  console.log('[soat.js] SIGINT - Bot to\'xtatilmoqda...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('[soat.js] SIGTERM - Bot to\'xtatilmoqda...');
  bot.stop('SIGTERM');
  process.exit(0);
});

main().catch((e) => {
  console.error('[soat.js] Ishga tushishda xatolik:', e);
  process.exit(1);
});
