const { Users, Tariffs } = require('../database/db');
const { accountKeyboard, cancelKeyboard, mainMenuKeyboard } = require('../utils/keyboards');
const { formatDate, formatNumber } = require('../utils/helpers');

async function handleAccount(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.banned) return ctx.answerCbQuery('🚫 Ruxsat yo\'q');
  await ctx.answerCbQuery();

  const tariff = Tariffs.get(user.tariff || 'free');

  const clockStatus = user.clockInstalled ? 'O\'rnatilgan ✅' : 'O\'rnatilmagan ❌';
  const nickStatus = user.nickClockOn ? 'Yoniq ✅' : 'O\'chiq ❌';
  const bioStatus = user.bioClockOn ? 'Yoniq ✅' : 'O\'chiq ❌';
  const onlineStatus = user.onlineMode ? 'Yoniq ✅' : 'O\'chiq ❌';
  const birthday = user.birthday || 'Kiritilmagan';
  const tariffExpires = user.tariffExpires ? formatDate(user.tariffExpires) : 'None';

  const text =
    `<b>Sizning hisobingiz 🪪</b>\n\n` +
    `ID: <code>${userId}</code>\n` +
    `Username: ${user.username ? '@' + user.username : 'Yo\'q'}\n` +
    `Ism: <b>${user.firstName || 'Kiritilmagan'}</b>\n` +
    `Hisobdagi mablag': <b>${formatNumber(user.balance || 0)} so'm</b>\n` +
    `Botga qo'shilgan sana: <b>${formatDate(user.joinDate)}</b>\n\n` +
    `Soat: <b>${clockStatus}</b>\n` +
    `Nickdagi soat holati: <b>${nickStatus}</b>\n` +
    `Biodagi soat holati: <b>${bioStatus}</b>\n` +
    `Online rejim holati: <b>${onlineStatus}</b>\n\n` +
    `Tug'ilgan kun: <b>${birthday}</b>\n\n` +
    `Tarif: <b>${tariff?.name || '🔰 Free'}</b>\n` +
    `Tarif oylik to'lovi: <b>${formatNumber(tariff?.price || 0)} so'm</b>\n` +
    `Tarif tugash sanasi: <b>${tariffExpires}</b>`;

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...accountKeyboard() });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...accountKeyboard() });
  }
}

async function handleEnterBirthday(ctx) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user) return ctx.answerCbQuery();
  await ctx.answerCbQuery();

  Users.save(userId, { state: 'awaiting_birthday', stateData: {} });

  const text =
    '🎂 <b>Tug\'ilgan kuningizni kiriting:</b>\n\n' +
    'Format: <code>DD.MM</code> yoki <code>DD.MM.YYYY</code>\n' +
    'Masalan: <code>15.03</code> yoki <code>15.03.1999</code>';

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...cancelKeyboard('menu_account') });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'HTML', ...cancelKeyboard('menu_account') });
  }
}

async function handleBirthdayInput(ctx, text) {
  const userId = ctx.from.id;
  const user = Users.get(userId);
  if (!user || user.state !== 'awaiting_birthday') return false;

  const patterns = [
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    /^(\d{1,2})\.(\d{1,2})$/,
  ];

  let matched = false;
  let birthdayStr = null;

  for (const p of patterns) {
    const m = text.trim().match(p);
    if (m) {
      const day = parseInt(m[1]);
      const month = parseInt(m[2]);
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        birthdayStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}${m[3] ? '.' + year : ''}`;
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    await ctx.reply(
      '❌ Noto\'g\'ri format! Qaytadan kiriting.\nFormat: <code>DD.MM</code> yoki <code>DD.MM.YYYY</code>',
      { parse_mode: 'HTML', ...cancelKeyboard('menu_account') }
    );
    return true;
  }

  Users.save(userId, { birthday: birthdayStr, state: null, stateData: {} });

  await ctx.reply(
    `✅ Tug'ilgan kun saqlandi: <b>${birthdayStr}</b>`,
    { parse_mode: 'HTML', ...mainMenuKeyboard() }
  );
  return true;
}

module.exports = { handleAccount, handleEnterBirthday, handleBirthdayInput };
