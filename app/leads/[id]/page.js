import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { STATUSES, SOURCES, CALL_NAMES } from '@/lib/constants';
import { fmt } from '@/lib/time';
import { updateStatus, saveLead, setReminder, doneCall, sendReply } from '../../actions';

export const dynamic = 'force-dynamic';

const ERRORS = {
  'whatsapp-not-connected': 'WhatsApp is not connected yet. Add WHATSAPP_TOKEN and the number ID first.',
  'send-failed': 'WhatsApp did not accept the message. Free replies only work within 24 hours of the customer\u2019s last message.',
};

export default async function LeadPage({ params, searchParams }) {
  const sb = db();
  const { data: lead } = await sb.from('leads').select('*, wa_numbers(label)').eq('id', params.id).single();
  if (!lead) notFound();
  const [{ data: msgs }, { data: rems }] = await Promise.all([
    sb.from('messages').select('*').eq('lead_id', lead.id).order('created_at'),
    sb.from('call_reminders').select('*').eq('lead_id', lead.id),
  ]);

  return (
    <>
      <div className="head">
        <div>
          <Link href="/" className="muted">Back to leads</Link>
          <h1>{lead.name || `+${lead.phone}`}</h1>
        </div>
        <div className="row">
          <a className="btn" href={`tel:+${lead.phone}`}>Call</a>
          <a className="btn" href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer">Open in WhatsApp</a>
        </div>
      </div>
      {searchParams.err && <div className="note" role="alert">{ERRORS[searchParams.err] || 'Something went wrong.'}</div>}

      <div className="detail">
        <section className="chat">
          <header>
            <b>{lead.name || 'Unknown'}</b> <span className="muted">+{lead.phone}</span>
            {lead.wa_numbers?.label && <div className="muted">via {lead.wa_numbers.label}</div>}
          </header>
          <div className="bubbles">
            {(msgs || []).length === 0 && <div className="empty">No messages saved yet.</div>}
            {(msgs || []).map((m) => (
              <div key={m.id} className={`b ${m.direction === 'out' ? 'out' : ''}`}>{m.body}<small>{fmt(m.created_at)}</small></div>
            ))}
          </div>
          <form action={sendReply} className="reply">
            <input type="hidden" name="lead_id" value={lead.id} />
            <input name="body" aria-label="Reply" placeholder="Type a reply" />
            <button className="pri">Send</button>
          </form>
        </section>

        <section className="info">
          <form action={updateStatus} className="row">
            <input type="hidden" name="id" value={lead.id} />
            <div>
              <label htmlFor="st">Status</label>
              <select id="st" name="status" defaultValue={lead.status} style={{ width: 240, fontWeight: 700 }}>
                {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <button className="pri" style={{ alignSelf: 'flex-end' }}>Update status</button>
          </form>

          <h2>Call follow-ups</h2>
          {[1, 2, 3].map((n) => {
            const r = (rems || []).find((x) => x.call_no === n);
            const done = r?.status === 'done';
            return (
              <div key={n} className={`call ${done ? 'done' : ''}`}>
                <div>
                  <b>{CALL_NAMES[n]}</b>{' '}
                  {done ? <span className="ok">Done {fmt(r.done_at)}</span> : r ? <span className="pill">Reminder {fmt(r.due_at)}</span> : <span className="muted">Not set</span>}
                  {done && r.outcome && <div className="muted">{r.outcome}</div>}
                </div>
                {!done && (
                  <form action={setReminder}>
                    <input type="hidden" name="lead_id" value={lead.id} />
                    <input type="hidden" name="call_no" value={n} />
                    <input type="datetime-local" name="due" aria-label={`${CALL_NAMES[n]} reminder time`} required />
                    <button className="small">{r ? 'Change time' : 'Set reminder'}</button>
                  </form>
                )}
                {r && !done && (
                  <form action={doneCall}>
                    <input type="hidden" name="lead_id" value={lead.id} />
                    <input type="hidden" name="call_no" value={n} />
                    <input name="outcome" aria-label="What happened on the call" placeholder="What happened on the call?" style={{ flex: 1, minWidth: 180 }} />
                    <button className="pri small">Mark done</button>
                  </form>
                )}
              </div>
            );
          })}

          <form action={saveLead} className="info" style={{ padding: 0 }}>
            <input type="hidden" name="id" value={lead.id} />
            <div className="grid">
              <div><label htmlFor="f-name">Parent name</label><input id="f-name" name="name" defaultValue={lead.name || ''} style={{ width: '100%' }} /></div>
              <div><label htmlFor="f-child">Child name</label><input id="f-child" name="child_name" defaultValue={lead.child_name || ''} style={{ width: '100%' }} /></div>
              <div><label htmlFor="f-age">Child age</label><input id="f-age" name="child_age" defaultValue={lead.child_age || ''} style={{ width: '100%' }} /></div>
              <div><label htmlFor="f-src">Source</label><select id="f-src" name="source" defaultValue={lead.source} style={{ width: '100%' }}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            {lead.campaign && <div className="muted">Campaign: {lead.campaign}</div>}
            <div><label htmlFor="f-notes">Call notes</label><textarea id="f-notes" name="notes" rows={3} defaultValue={lead.notes || ''} /></div>
            <div><button className="pri">Save changes</button></div>
          </form>
        </section>
      </div>
    </>
  );
}
