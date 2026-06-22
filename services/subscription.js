const { Channels } = require('../database/db');

async function checkSubscriptions(ctx) {
  const channels = Channels.getAll();
  if (channels.length === 0) return { ok: true };

  const userId = ctx.from.id;
  const notSubscribed = [];

  for (const channel of channels) {
    try {
      const member = await ctx.telegram.getChatMember(channel.id, userId);
      const status = member.status;
      if (!['member', 'administrator', 'creator'].includes(status)) {
        notSubscribed.push(channel);
      }
    } catch (e) {
      notSubscribed.push(channel);
    }
  }

  return { ok: notSubscribed.length === 0, channels: notSubscribed };
}

module.exports = { checkSubscriptions };
