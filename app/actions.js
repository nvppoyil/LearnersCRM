'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { toUtc } from '@/lib/time';

const clean = (v) => (typeof v === 'string' ? v.trim() : '') || null;
const digits = (v) => (v || '').replace(/\D/g, '');

export async function updateStatus(fd) {
  await db().from('leads').update({ status: fd.get('status') }).eq('id', fd.get('id'));
  revalidatePath('/');
  revalidatePath(`/leads/${fd.get('id')}`);
}

export async function saveLead(fd) {
  const id = fd.get('id');
  await db()
    .from('leads')
    .update({
      name: clean(fd.get('name')),
      child_name: clean(fd.get('child_name')),
      child_age: clean(fd.get('child_age')),
      source: fd.get('source'),
      notes: clean(fd.get('notes')),
    })
    .eq('id', id);
  revalidatePath(`/leads/${id}`);
  revalidatePath('/');
}

export async function setReminder(fd) {
  const lead_id = fd.get('lead_id');
  const due = fd.get('due');
  if (!due) return;
  await db()
    .from('call_reminders')
    .upsert(
      { lead_id, call_no: Number(fd.get('call_no')), due_at: toUtc(due), status: 'pending', outcome: null, done_at: null },
      { onConflict: 'lead_id,call_no' }
    );
  revalidatePath(`/leads/${lead_id}`);
  revalidatePath('/today');
  revalidatePath('/');
}

export async function doneCall(fd) {
  const lead_id = fd.get('lead_id');
  const n = Number(fd.get('call_no'));
  const sb = db();
  await sb
    .from('call_reminders')
    .update({ status: 'done', done_at: new Date().toISOString(), outcome: clean(fd.get('outcome')) })
    .eq('lead_id', lead_id)
    .eq('call_no', n);
  // move the lead forward, but never backwards
  const { data: lead } = await sb.from('leads').select('status').eq('id', lead_id).single();
  const order = ['new', 'call1', 'call2', 'call3'];
  if (lead && order.includes(lead.status) && order.indexOf(lead.status) < n) {
    await sb.from('leads').update({ status: `call${n}` }).eq('id', lead_id);
  }
  revalidatePath(`/leads/${lead_id}`);
  revalidatePath('/today');
  revalidatePath('/');
}

export async function snooze(fd) {
  const hours = Number(fd.get('hours') || 1);
  const sb = db();
  const { data: r } = await sb.from('call_reminders').select('due_at').eq('id', fd.get('id')).single();
  if (!r) return;
  const base = Math.max(Date.now(), new Date(r.due_at).getTime());
  await sb.from('call_reminders').update({ due_at: new Date(base + hours * 3600000).toISOString() }).eq('id', fd.get('id'));
  revalidatePath('/today');
}

export async function addLead(fd) {
  const phone = digits(fd.get('phone'));
  if (!phone) return;
  const { data } = await db()
    .from('leads')
    .insert({
      phone,
      name: clean(fd.get('name')),
      child_name: clean(fd.get('child_name')),
      source: fd.get('source') || 'Direct',
      wa_number_id: clean(fd.get('wa_number_id')),
    })
    .select('id')
    .single();
  revalidatePath('/');
  if (data) redirect(`/leads/${data.id}`);
}

export async function addNumber(fd) {
  await db().from('wa_numbers').insert({
    label: clean(fd.get('label')) || 'WhatsApp number',
    phone: clean(fd.get('phone')),
    phone_number_id: clean(fd.get('phone_number_id')),
  });
  revalidatePath('/settings');
}

export async function sendReply(fd) {
  const id = fd.get('lead_id');
  const body = clean(fd.get('body'));
  if (!body) return;
  const sb = db();
  const { data: lead } = await sb.from('leads').select('phone, wa_numbers(phone_number_id)').eq('id', id).single();
  const pnid = lead?.wa_numbers?.phone_number_id;
  if (!pnid || !process.env.WHATSAPP_TOKEN) {
    redirect(`/leads/${id}?err=whatsapp-not-connected`);
  }
  const res = await fetch(`https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v21.0'}/${pnid}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: lead.phone, type: 'text', text: { body } }),
  });
  if (!res.ok) redirect(`/leads/${id}?err=send-failed`);
  await sb.from('messages').insert({ lead_id: id, direction: 'out', body });
  await sb.from('leads').update({ last_message: body, last_message_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/leads/${id}`);
}
