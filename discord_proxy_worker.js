// PresaleDrop — Discord DM Proxy
// Deploy this to Cloudflare Workers (free tier)
// It forwards Discord bot API calls server-side, bypassing browser CORS restrictions.

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    try {
      const { token, userId, message } = await request.json();
      if (!token || !userId || !message) {
        return json({ ok: false, error: 'Missing token, userId, or message' }, cors);
      }

      // Step 1: Open DM channel
      const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: userId })
      });
      if (!dmRes.ok) {
        const err = await dmRes.json().catch(() => ({}));
        return json({ ok: false, error: err.message || `DM open failed (${dmRes.status})` }, cors);
      }
      const dmChan = await dmRes.json();

      // Step 2: Send message
      const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmChan.id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message })
      });
      if (!msgRes.ok) {
        const err = await msgRes.json().catch(() => ({}));
        return json({ ok: false, error: err.message || `Send failed (${msgRes.status})` }, cors);
      }

      return json({ ok: true }, cors);
    } catch (e) {
      return json({ ok: false, error: e.message }, cors);
    }
  }
};

function json(data, headers) {
  return new Response(JSON.stringify(data), {
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}
