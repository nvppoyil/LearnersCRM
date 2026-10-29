import crypto from 'crypto';
import { db } from '@/lib/db';

// Meta calls GET once, to check the verify token when you save the webhook.
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get('hub.challenge'), { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

function validSignature(raw, header) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // fine for local testing; set the secret before going live
  if (!header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const textOf = (m) => m?.text?.body || (m?.type ? `[${m.type}]` : '');

async function numberFor(sb, phoneNumberId, display) {
  const { data } = await sb.from('wa_numbers').select('*').eq('phone_number_id', phoneNumberId).maybeSingle();
  if (data) return data;
  const { data: created } = await sb
    .from('wa_numbers')
    .insert({ label: 'WhatsApp number', phone: display || null, phone_number_id: phoneNumberId })
    .select()
    .single();
  return created;
}

async function leadFor(sb, num, phone, name, extra = {}) {
  const { data: found } = await sb.from('leads').select('*').eq('phone', phone).eq('wa_number_id', num.id).maybeSingle();
  if (found) {
    if (name && !found.name) await sb.from('leads').update({ name }).eq('id', found.id);
    return found;
  }
  const { data: lead } = await sb
    .from('leads')
    .insert({ phone, name: name || null, wa_number_id: num.id, ...extra })
    .select()
    .single();
  // new lead: remind to make the 1st call in 1 hour
  if (lead) {
    await sb.from('call_reminders').insert({
      lead_id: lead.id,
      call_no: 1,
      due_at: new Date(Date.now() + 3600000).toISOString(),
    });
  }
  return lead;
}

export async function POST(req) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('Bad signature', { status: 401 });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return new Response('ok', { status: 200 }); }
  const sb = db();

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        const pnid = v.metadata?.phone_number_id;
        if (!pnid) continue;
        const num = await numberFor(sb, pnid, v.metadata?.display_phone_number);
        if (!num) continue;

        // Customer messages
        for (const m of v.messages || []) {
          const name = (v.contacts || []).find((c) => c.wa_id === m.from)?.profile?.name;
          const ref = m.referral; // present when the chat started from a Meta (click-to-WhatsApp) ad
          const lead = await leadFor(sb, num, m.from, name, ref ? { source: 'Meta ad', campaign: ref.headline || ref.source_id || null } : {});
          if (!lead) continue;
          const text = textOf(m);
          await sb.from('messages').insert({ lead_id: lead.id, direction: 'in', body: text });
          await sb.from('leads').update({ last_message: text, last_message_at: new Date().toISOString() }).eq('id', lead.id);
        }

        // Messages you typed in the WhatsApp Business app (Coexistence). Check the field name in Meta's docs when you connect.
        if (change.field === 'smb_message_echoes') {
          for (const m of v.message_echoes || []) {
            const lead = await leadFor(sb, num, m.to, null);
            if (!lead) continue;
            const text = textOf(m);
            await sb.from('messages').insert({ lead_id: lead.id, direction: 'out', body: text });
            await sb.from('leads').update({ last_message: text, last_message_at: new Date().toISOString() }).eq('id', lead.id);
          }
        }
      }
    }
  } catch (e) {
    console.error('webhook error', e);
  }
  return new Response('ok', { status: 200 });
}
