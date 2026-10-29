import Link from 'next/link';
import { db } from '@/lib/db';
import { STATUSES, SOURCES, CALL_NAMES } from '@/lib/constants';
import { fmt } from '@/lib/time';
import { updateStatus, addLead } from './actions';

export const dynamic = 'force-dynamic';

const qs = (o) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v));
  const s = p.toString();
  return s ? `/?${s}` : '/';
};

export default async function Leads({ searchParams }) {
  const sb = db();
  const [{ data: leads }, { data: nums }, { data: rems }] = await Promise.all([
    sb.from('leads').select('*, wa_numbers(label)').order('last_message_at', { ascending: false }),
    sb.from('wa_numbers').select('id,label').order('created_at'),
    sb.from('call_reminders').select('lead_id,call_no,due_at').eq('status', 'pending').order('due_at'),
  ]);
  const src = searchParams.source || '';
  const num = searchParams.number || '';
  const next = {};
  (rems || []).forEach((r) => { if (!next[r.lead_id]) next[r.lead_id] = r; });

  const list = (leads || []).filter((l) => (!src || l.source === src) && (!num || l.wa_number_id === num));
  const active = list.filter((l) => l.status !== 'lost').length;

  return (
    <>
      <div className="head">
        <div>
          <h1>Leads</h1>
          <div className="sub">{active} active leads. New WhatsApp chats are added automatically.</div>
        </div>
        <details className="add">
          <summary className="btn pri">Add lead manually</summary>
          <form action={addLead}>
            <div><label htmlFor="al-phone">Phone (with country code)</label><input id="al-phone" name="phone" placeholder="919876543210" required /></div>
            <div><label htmlFor="al-name">Parent name</label><input id="al-name" name="name" /></div>
            <div><label htmlFor="al-child">Child name</label><input id="al-child" name="child_name" /></div>
            <div><label htmlFor="al-src">Source</label><select id="al-src" name="source">{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label htmlFor="al-num">WhatsApp number</label><select id="al-num" name="wa_number_id"><option value="">None</option>{(nums || []).map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select></div>
            <button className="pri">Save lead</button>
          </form>
        </details>
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <Link className={`chip ${!src ? 'on' : ''}`} href={qs({ number: num })}>All sources</Link>
        {SOURCES.slice(0, 3).map((s) => (
          <Link key={s} className={`chip ${src === s ? 'on' : ''}`} href={qs({ source: s, number: num })}>{s}</Link>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <span className="muted"><b>WhatsApp number:</b></span>
        <Link className={`chip ${!num ? 'on' : ''}`} href={qs({ source: src })}>All numbers</Link>
        {(nums || []).map((n) => (
          <Link key={n.id} className={`chip ${num === n.id ? 'on' : ''}`} href={qs({ source: src, number: n.id })}>{n.label}</Link>
        ))}
      </div>

      <div className="board">
        {STATUSES.map(([key, label]) => {
          const items = list.filter((l) => l.status === key);
          return (
            <section className="col" key={key}>
              <h2><span>{label}</span><span className="muted">{items.length}</span></h2>
              {items.length === 0 && <div className="empty">No leads here</div>}
              {items.map((l) => {
                const r = next[l.id];
                const over = r && new Date(r.due_at) < new Date();
                return (
                  <div className="card" key={l.id}>
                    <div className="top">
                      <Link className="cname" href={`/leads/${l.id}`}>{l.name || `+${l.phone}`}</Link>
                      <span className={`tag t-${(l.source || 'Direct').split(' ')[0]}`}>{l.source}</span>
                    </div>
                    <div className="muted">
                      {[l.child_name, l.child_age && `${l.child_age} yrs`].filter(Boolean).join(', ') || 'Child details not added'}
                      {l.wa_numbers?.label ? ` · via ${l.wa_numbers.label}` : ''}
                    </div>
                    {l.last_message && <div className="msg">&ldquo;{l.last_message.slice(0, 80)}&rdquo;</div>}
                    {r ? (
                      <div className={`due ${over ? 'over' : ''}`}>{CALL_NAMES[r.call_no]}: {over ? 'overdue, ' : ''}{fmt(r.due_at)}</div>
                    ) : (
                      <div className="muted">No callback set</div>
                    )}
                    <form action={updateStatus} className="mv">
                      <input type="hidden" name="id" value={l.id} />
                      <select name="status" defaultValue={l.status} aria-label="Change status">
                        {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button className="small">Move</button>
                    </form>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
