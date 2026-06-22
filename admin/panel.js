const { Users, Payments, Cards, Tariffs, Channels, Logs } = require('../database/db');
const { adminPanelKeyboard, paymentConfirmKeyboard } = require('../utils/keyboards');
const { formatNumber, formatDate } = require('../utils/helpers');
const { getAllSessions, deleteSession } = require('../services/mtproto');
const { restartClockService } = require('../services/clockService');
const config = require('../config');
const { Markup } = require('telegraf');
const fs = require('fs');

function isAdmin(userId) {
  return config.admins.includes(Number(userId));
}

async function handlePanel(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;

  const text =
    `👑 <b>Admin Panel</b>\n\n` +
    `Foydalanuvchilar: <b>${Users.count()}</b>\n` +
    `Sessiyalar: <b>${getAllSessions().length}</b>`;

  await ctx.reply(text, { parse_mode: 'HTML', ...adminPanelKeyboard() });
}

async function handleBroadcast(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  Users.save(userId, { state: 'admin_broadcast', stateData: {} });

  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'admin_back')]]);
  const text = '📢 <b>Broadcast</b>\n\nXabar yuboring (matn, rasm, video, hujjat yoki havolali xabar):';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

async function handleBroadcastMessage(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return false;

  const user = Users.get(userId);
  if (!user || user.state !== 'admin_broadcast') return false;

  Users.save(userId, { state: null, stateData: {} });

  const allUsers = Users.getAll();
  const userIds = Object.keys(allUsers);

  let sent = 0, failed = 0;

  await ctx.reply(`📤 Broadcast boshlandi. Jami: ${userIds.length} foydalanuvchi...`);

  for (const uid of userIds) {
    try {
      await ctx.telegram.copyMessage(uid, ctx.chat.id, ctx.message.message_id);
      sent++;
      if (sent % 20 === 0) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      failed++;
    }
  }

  await ctx.reply(
    `✅ <b>Broadcast yakunlandi!</b>\n\nYuborildi: ${sent}\nXatolik: ${failed}`,
    { parse_mode: 'HTML', ...adminPanelKeyboard() }
  );
  return true;
}

async function handleAddBalance(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: 'admin_add_balance', stateData: {} });
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  const text = '💰 Foydalanuvchi ID yoki @username va summa kiriting:\nFormat: <code>ID/username summa</code>\nMasalan: <code>123456789 5000</code>';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

async function handleRemoveBalance(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: 'admin_remove_balance', stateData: {} });
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  const text = '💸 Foydalanuvchi ID yoki @username va summa kiriting:\nFormat: <code>ID/username summa</code>';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

async function handleAddChannel(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: 'admin_add_channel', stateData: {} });
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  const text = '📌 Kanal ID yoki @username kiriting:\n(Bot kanalda admin bo\'lishi kerak)\nMasalan: <code>@mychannel</code> yoki <code>-1001234567890</code>';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

async function handleRemoveChannel(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const channels = Channels.getAll();
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  if (channels.length === 0) {
    const text = '📭 Majburiy kanallar mavjud emas.';
    try { await ctx.editMessageText(text, { ...adminPanelKeyboard() }); } catch { await ctx.reply(text, adminPanelKeyboard()); }
    return;
  }

  const buttons = channels.map(ch => [
    Markup.button.callback(`🗑 ${ch.username || ch.id}`, `admin_rm_ch_${ch.id}`)
  ]);
  buttons.push([Markup.button.callback('❌ Bekor', 'admin_back')]);
  const text = '🗑 Qaysi kanalni o\'chirishni tanlang:';
  try {
    await ctx.editMessageText(text, Markup.inlineKeyboard(buttons));
  } catch {
    await ctx.reply(text, Markup.inlineKeyboard(buttons));
  }
}

async function handleAddCard(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: null, stateData: {} });
  const { cardTypeKeyboard } = require('../utils/keyboards');
  try {
    await ctx.editMessageText('💳 Karta turini tanlang:', cardTypeKeyboard());
  } catch {
    await ctx.reply('💳 Karta turini tanlang:', cardTypeKeyboard());
  }
}

async function handleCardTypeSelect(ctx, type) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: 'admin_add_card_number', stateData: { cardType: type } });
  const label = type === 'humo' ? '🟩 Humo' : '🟦 Uzcard';
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  const text = `${label} kartaning raqamini kiriting:\n\n📝 Masalan: <code>9860123456789012</code>`;
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

async function handleRemoveCard(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const allCards = Cards.getAll();
  const buttons = [];
  for (const [type, cards] of Object.entries(allCards)) {
    for (const card of cards) {
      buttons.push([Markup.button.callback(`🗑 ${type}: *${card.number?.slice(-4) || 'N/A'}`, `admin_rm_card_${type}_${card.id}`)]);
    }
  }
  if (buttons.length === 0) {
    const text = '📭 Kartalar mavjud emas.';
    try { await ctx.editMessageText(text, adminPanelKeyboard()); } catch { await ctx.reply(text, adminPanelKeyboard()); }
    return;
  }
  buttons.push([Markup.button.callback('❌ Bekor', 'admin_back')]);
  const rmText = '🗑 Qaysi kartani o\'chirishni tanlang:';
  try {
    await ctx.editMessageText(rmText, Markup.inlineKeyboard(buttons));
  } catch {
    await ctx.reply(rmText, Markup.inlineKeyboard(buttons));
  }
}

async function handleBanUser(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: 'admin_ban', stateData: {} });
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  const text = '🚫 Ban qilish uchun foydalanuvchi ID yoki @username kiriting:';
  try {
    await ctx.editMessageText(text, { ...kb });
  } catch {
    await ctx.reply(text, { ...kb });
  }
}

async function handleUnbanUser(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: 'admin_unban', stateData: {} });
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  const text = '✅ Unban qilish uchun foydalanuvchi ID yoki @username kiriting:';
  try {
    await ctx.editMessageText(text, { ...kb });
  } catch {
    await ctx.reply(text, { ...kb });
  }
}

async function handleEditTariffs(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const tariffs = Tariffs.getAll();
  const buttons = Object.values(tariffs).map(t => [
    Markup.button.callback(t.name, `admin_edit_tariff_${t.id}`)
  ]);
  buttons.push([Markup.button.callback('❌ Bekor', 'admin_back')]);
  const text = '💰 Qaysi tarifni tahrirlash:';
  try {
    await ctx.editMessageText(text, Markup.inlineKeyboard(buttons));
  } catch {
    await ctx.reply(text, Markup.inlineKeyboard(buttons));
  }
}

async function handleEditTariffSelect(ctx, tariffId) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const tariff = Tariffs.get(tariffId);
  if (!tariff) return ctx.reply('Tarif topilmadi');

  Users.save(userId, { state: 'admin_edit_tariff_price', stateData: { tariffId } });
  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  await ctx.reply(
    `📝 <b>${tariff.name}</b> tarifi\nHozirgi narx: <b>${formatNumber(tariff.price)} so'm</b>\n\nYangi narxni kiriting (so'mda):`,
    { parse_mode: 'HTML', ...kb }
  );
}

async function handleViewUsers(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const allUsers = Users.getAll();
  const list = Object.values(allUsers).slice(0, 30);

  let text = `👥 <b>Foydalanuvchilar (${Object.keys(allUsers).length} ta):</b>\n\n`;
  for (const u of list) {
    text += `• <a href="tg://user?id=${u.id}">${u.firstName || u.id}</a> | ${u.tariff} | ${u.balance || 0} so'm\n`;
  }
  if (Object.keys(allUsers).length > 30) text += `\n<i>...va yana ${Object.keys(allUsers).length - 30} ta</i>`;

  const kb = Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]);
  await ctx.reply(text, { parse_mode: 'HTML', ...kb });
}

async function handleStats(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const allUsers = Users.getAll();
  const userList = Object.values(allUsers);
  const payments = Payments.getAll();
  const sessions = getAllSessions();

  const totalBalance = userList.reduce((s, u) => s + (u.balance || 0), 0);
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalRevenue = confirmedPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const tariffCounts = {};
  for (const u of userList) {
    tariffCounts[u.tariff] = (tariffCounts[u.tariff] || 0) + 1;
  }

  const text =
    `📊 <b>Statistika</b>\n\n` +
    `👥 Jami foydalanuvchilar: <b>${userList.length}</b>\n` +
    `🔒 Aktiv sessiyalar: <b>${sessions.length}</b>\n` +
    `💰 Jami balansdagi pul: <b>${formatNumber(totalBalance)} so'm</b>\n` +
    `💸 Jami daromad: <b>${formatNumber(totalRevenue)} so'm</b>\n` +
    `📋 To'lovlar: <b>${payments.length}</b> (${confirmedPayments.length} tasdiqlangan)\n\n` +
    `<b>Tariflar bo'yicha:</b>\n` +
    Object.entries(tariffCounts).map(([k, v]) => `• ${k}: ${v} ta`).join('\n');

  const kb = Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]);
  await ctx.reply(text, { parse_mode: 'HTML', ...kb });
}

async function handleViewPayments(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const payments = Payments.getAll().slice(-20).reverse();
  if (payments.length === 0) {
    return ctx.reply('📭 To\'lovlar mavjud emas.', adminPanelKeyboard());
  }

  let text = `💳 <b>So'ngi to'lovlar:</b>\n\n`;
  for (const p of payments) {
    const statusEmoji = p.status === 'confirmed' ? '✅' : p.status === 'rejected' ? '❌' : '⏳';
    text += `${statusEmoji} ID: <code>${p.id}</code> | User: ${p.userId} | ${p.amount || '?'} so'm\n`;
  }

  const kb = Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]);
  await ctx.reply(text, { parse_mode: 'HTML', ...kb });
}

async function handleViewLogs(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const logs = Logs.getRecent(30);
  if (logs.length === 0) {
    return ctx.reply('📭 Loglar mavjud emas.', adminPanelKeyboard());
  }

  let text = `📋 <b>So'ngi loglar:</b>\n\n`;
  for (const l of logs) {
    text += `[${l.time?.slice(11, 19) || '?'}] ${l.type} ${l.userId ? `| user:${l.userId}` : ''}\n`;
  }

  const kb = Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]);
  await ctx.reply(text, { parse_mode: 'HTML', ...kb });
}

async function handleSystemStatus(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const uptime = process.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}s ${Math.floor((uptime % 3600) / 60)}d ${Math.floor(uptime % 60)}s`;
  const mem = process.memoryUsage();

  const text =
    `⚙️ <b>Tizim holati</b>\n\n` +
    `🕒 Uptime: <b>${uptimeStr}</b>\n` +
    `💾 RAM: <b>${Math.round(mem.heapUsed / 1024 / 1024)} MB</b>\n` +
    `📦 Node.js: <b>${process.version}</b>\n` +
    `👥 Foydalanuvchilar: <b>${Users.count()}</b>\n` +
    `🔒 Sessiyalar: <b>${getAllSessions().length}</b>`;

  const kb = Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'admin_back')]]);
  await ctx.reply(text, { parse_mode: 'HTML', ...kb });
}

async function handleExportUsers(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();

  const allUsers = Users.getAll();
  const fileName = `/tmp/users_export_${Date.now()}.json`;
  fs.writeFileSync(fileName, JSON.stringify(allUsers, null, 2));

  try {
    await ctx.replyWithDocument({ source: fileName, filename: 'users.json' }, { caption: '📤 Foydalanuvchilar eksporti' });
  } catch (e) {
    await ctx.reply('❌ Export xatosi: ' + e.message);
  }
  try { fs.unlinkSync(fileName); } catch (e) {}
}

async function handleRestartClock(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  restartClockService();
  await ctx.reply('✅ Clock tizimi qayta ishga tushirildi.', adminPanelKeyboard());
}

async function handlePayConfirm(ctx, paymentId) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');

  const payment = Payments.getAll().find(p => p.id === paymentId);
  if (!payment) return ctx.answerCbQuery('❌ To\'lov topilmadi');
  if (payment.status !== 'pending') return ctx.answerCbQuery('❌ Bu to\'lov allaqachon ko\'rib chiqilgan');

  Users.save(userId, { state: 'admin_confirm_payment', stateData: { paymentId } });
  await ctx.answerCbQuery();

  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  await ctx.reply(
    `💰 To'lov ID: <code>${paymentId}</code>\n\nFoydalanuvchiga qo'shilgan summani kiriting (so'mda):`,
    { parse_mode: 'HTML', ...kb }
  );
}

async function handlePayReject(ctx, paymentId) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');

  const payment = Payments.getAll().find(p => p.id === paymentId);
  if (!payment) return ctx.answerCbQuery('❌ To\'lov topilmadi');
  if (payment.status !== 'pending') return ctx.answerCbQuery('❌ Bu to\'lov allaqachon ko\'rib chiqilgan');

  Users.save(userId, { state: 'admin_reject_payment', stateData: { paymentId } });
  await ctx.answerCbQuery();

  const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
  await ctx.reply('❌ Rad etish sababini kiriting:', { ...kb });
}

async function handleAdminStateInput(ctx, text) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return false;

  const adminUser = Users.get(userId);
  if (!adminUser || !adminUser.state || !adminUser.state.startsWith('admin_')) return false;

  const state = adminUser.state;
  const stateData = adminUser.stateData || {};

  if (state === 'admin_add_balance' || state === 'admin_remove_balance') {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply('❌ Noto\'g\'ri format. Masalan: <code>123456789 5000</code>', { parse_mode: 'HTML' });
      return true;
    }
    const [target, amountStr] = parts;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Noto\'g\'ri summa');
      return true;
    }

    const targetUser = findUser(target);
    if (!targetUser) {
      await ctx.reply('❌ Foydalanuvchi topilmadi');
      Users.save(userId, { state: null, stateData: {} });
      return true;
    }

    const current = targetUser.balance || 0;
    const newBalance = state === 'admin_add_balance' ? current + amount : Math.max(0, current - amount);
    Users.save(targetUser.id, { balance: newBalance });
    Users.save(userId, { state: null, stateData: {} });

    const action = state === 'admin_add_balance' ? 'qo\'shildi' : 'ayirildi';
    await ctx.reply(`✅ ${formatNumber(amount)} so'm ${action}. Yangi balans: ${formatNumber(newBalance)} so'm`, adminPanelKeyboard());

    try {
      const msg = state === 'admin_add_balance'
        ? `✅ Hisobingizga <b>${formatNumber(amount)} so'm</b> mablag' tushdi.`
        : `ℹ️ Hisobingizdan <b>${formatNumber(amount)} so'm</b> ayirildi.`;
      await ctx.telegram.sendMessage(targetUser.id, msg, { parse_mode: 'HTML' });
    } catch (e) {}
    return true;
  }

  if (state === 'admin_add_channel') {
    try {
      const chatInfo = await ctx.telegram.getChat(text.trim());
      Channels.add({
        id: chatInfo.id,
        username: chatInfo.username ? '@' + chatInfo.username : null,
        title: chatInfo.title || chatInfo.username,
        inviteLink: chatInfo.invite_link || null,
      });
      Users.save(userId, { state: null, stateData: {} });
      await ctx.reply(`✅ Kanal qo'shildi: ${chatInfo.title || text}`, adminPanelKeyboard());
    } catch (e) {
      await ctx.reply(`❌ Kanal topilmadi yoki bot admin emas: ${e.message}`);
    }
    return true;
  }

  if (state === 'admin_add_card_number') {
    const cardNumber = text.trim().replace(/\s/g, '');
    if (!/^\d{16}$/.test(cardNumber)) {
      await ctx.reply(
        '❌ Karta raqami 16 ta raqamdan iborat bo\'lishi kerak.\n\nMasalan: <code>9860123456789012</code>',
        { parse_mode: 'HTML' }
      );
      return true;
    }
    Users.save(userId, { state: 'admin_add_card_owner', stateData: { ...stateData, cardNumber } });
    const kb = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor', 'admin_back')]]);
    await ctx.reply(
      '👤 Karta egasining to\'liq ismini kiriting:\n\n📝 Masalan: <code>Abdullayev Ali</code>',
      { parse_mode: 'HTML', ...kb }
    );
    return true;
  }

  if (state === 'admin_add_card_owner') {
    const owner = text.trim();
    if (!owner) {
      await ctx.reply('❌ Egasi ismini kiriting');
      return true;
    }
    const { cardType, cardNumber } = stateData;
    Cards.add(cardType, { number: cardNumber, owner });
    Users.save(userId, { state: null, stateData: {} });
    const label = cardType === 'humo' ? '🟩 Humo' : '🟦 Uzcard';
    await ctx.reply(
      `✅ <b>Karta muvaffaqiyatli qo'shildi!</b>\n\nTuri: ${label}\nRaqam: <code>${cardNumber}</code>\nEgasi: <b>${owner}</b>`,
      { parse_mode: 'HTML', ...adminPanelKeyboard() }
    );
    return true;
  }

  if (state === 'admin_ban') {
    const targetUser = findUser(text.trim());
    if (!targetUser) {
      await ctx.reply('❌ Foydalanuvchi topilmadi');
      Users.save(userId, { state: null, stateData: {} });
      return true;
    }
    Users.save(targetUser.id, { banned: true });
    Users.save(userId, { state: null, stateData: {} });
    await ctx.reply(`✅ Foydalanuvchi ban qilindi: ${targetUser.id}`, adminPanelKeyboard());
    try { await ctx.telegram.sendMessage(targetUser.id, '🚫 Siz botdan foydalanish huquqidan mahrum etildingiz.'); } catch (e) {}
    return true;
  }

  if (state === 'admin_unban') {
    const targetUser = findUser(text.trim());
    if (!targetUser) {
      await ctx.reply('❌ Foydalanuvchi topilmadi');
      Users.save(userId, { state: null, stateData: {} });
      return true;
    }
    Users.save(targetUser.id, { banned: false });
    Users.save(userId, { state: null, stateData: {} });
    await ctx.reply(`✅ Foydalanuvchi unban qilindi: ${targetUser.id}`, adminPanelKeyboard());
    try { await ctx.telegram.sendMessage(targetUser.id, '✅ Blokirovkangiz olib tashlandi.'); } catch (e) {}
    return true;
  }

  if (state === 'admin_edit_tariff_price') {
    const price = parseInt(text.trim());
    if (isNaN(price) || price < 0) {
      await ctx.reply('❌ Noto\'g\'ri narx');
      return true;
    }
    const tariffId = stateData.tariffId;
    Tariffs.update(tariffId, { price });
    Users.save(userId, { state: null, stateData: {} });
    await ctx.reply(`✅ Tarif narxi yangilandi: ${formatNumber(price)} so'm`, adminPanelKeyboard());
    return true;
  }

  if (state === 'admin_confirm_payment') {
    const amount = parseInt(text.trim());
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Noto\'g\'ri summa');
      return true;
    }
    const paymentId = stateData.paymentId;
    const payment = Payments.update(paymentId, { status: 'confirmed', amount, confirmedBy: userId, confirmedAt: new Date().toISOString() });
    if (payment) {
      const targetUser = Users.get(payment.userId);
      if (targetUser) {
        Users.save(payment.userId, { balance: (targetUser.balance || 0) + amount, pendingPayment: null });
        try {
          await ctx.telegram.sendMessage(payment.userId,
            `✅ <b>To'lovingiz tasdiqlandi!</b>\n\nHisobingizga <b>${formatNumber(amount)} so'm</b> tushdi.\nJami balansingiz: <b>${formatNumber((targetUser.balance || 0) + amount)} so'm</b>`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {}
      }
    }
    Users.save(userId, { state: null, stateData: {} });
    await ctx.reply(`✅ To'lov tasdiqlandi: ${formatNumber(amount)} so'm`, adminPanelKeyboard());
    return true;
  }

  if (state === 'admin_reject_payment') {
    const paymentId = stateData.paymentId;
    const reason = text.trim();
    const payment = Payments.update(paymentId, { status: 'rejected', rejectReason: reason, rejectedBy: userId });
    if (payment) {
      try {
        await ctx.telegram.sendMessage(payment.userId,
          `❌ <b>To'lovingiz rad etildi.</b>\n\nSababi: <i>${reason}</i>`,
          { parse_mode: 'HTML' }
        );
      } catch (e) {}
    }
    Users.save(userId, { state: null, stateData: {} });
    await ctx.reply('✅ To\'lov rad etildi.', adminPanelKeyboard());
    return true;
  }

  return false;
}

function findUser(target) {
  const allUsers = Users.getAll();
  const clean = target.replace('@', '').toLowerCase();

  for (const [uid, u] of Object.entries(allUsers)) {
    if (uid === clean) return u;
    if (String(u.id) === clean) return u;
    if (u.username && u.username.toLowerCase() === clean) return u;
  }
  return null;
}

async function handleAdminBack(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return ctx.answerCbQuery('🚫');
  await ctx.answerCbQuery();
  Users.save(userId, { state: null, stateData: {} });
  await ctx.reply('👑 Admin Panel', adminPanelKeyboard());
}

module.exports = {
  isAdmin,
  handlePanel,
  handleBroadcast,
  handleBroadcastMessage,
  handleAddBalance,
  handleRemoveBalance,
  handleAddChannel,
  handleRemoveChannel,
  handleAddCard,
  handleCardTypeSelect,
  handleRemoveCard,
  handleBanUser,
  handleUnbanUser,
  handleEditTariffs,
  handleEditTariffSelect,
  handleViewUsers,
  handleStats,
  handleViewPayments,
  handleViewLogs,
  handleSystemStatus,
  handleExportUsers,
  handleRestartClock,
  handlePayConfirm,
  handlePayReject,
  handleAdminStateInput,
  handleAdminBack,
};
