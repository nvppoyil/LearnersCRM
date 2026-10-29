import { db } from '@/lib/db';
import { CALL_NAMES } from '@/lib/constants';
import { fmt, startOfTodayUtc, endOfTodayUtc } from '@/lib/time';
import { doneCall, snooze } from '../actions';

export const dynamic = 'force-dynamic';

function Row({ r, over }) {
  const l = r.leads;
  return (
    <div className="trow">
      <div className={`when ${over ? 'over' : ''}`}>{fmt(r.due_at)}</div>
      <div className="who">
        <b>{l.name || `+${l.phone}`}</b> <span className="muted">{l.child_name || ''}</span>
        {l.last_message && <div className="muted">&ldquo;{l.last_message.slice(0, 70)}&rdquo;</div>}
      </div>
      <span className="pill">{CALL_NAMES[r.call_no]}</span>
      <a className="btn pri small" href={`tel:+${l.phone}`}>Call</a>
      <a className="btn small" href={`https://wa.me/${l.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
      <form action={doneCall} className="row">
        <input type="hidden" name="lead_id" value={r.lead_id} />
        <input type="hidden" name="call_no" value={r.call_no} />
        <input name="outcome" aria-label="Call result" placeholder="Result (optional)" style={{ width: 150, minHeight: 36 }} />
        <button className="small">Done</button>
      </form>
      <form action={snooze} className="row">
        <input type="hidden" name="id" value={r.id} />
        <select name="hours" aria-label="Snooze for" style={{ minHeight: 36 }}>
          <option value="1">1 hour</option>
          <option value="3">3 hours</option>
          <option value="24">Tomorrow</option>
        </select>
        <button className="small">Snooze</button>
      </form>
    </div>
  );
}

export default async function Today() {
  const { data } = await db()
    .from('call_reminders')
    .select('*, leads(name, child_name, phone, last_message)')
    .eq('status', 'pending')
    .lt('due_at', endOfTodayUtc().toISOString())
    .order('due_at');
  const rows = (data || []).filter((r) => r.leads);
  const start = startOfTodayUtc();
  const overdue = rows.filter((r) => new Date(r.due_at) < start);
  const today = rows.filter((r) => new Date(r.due_at) >= start);
  return (
    <>
      <div className="head">
        <div>
          <h1>Today&rsquo;s callbacks</h1>
          <div className="sub">{rows.length} calls to make. Overdue calls show first.</div>
        </div>
      </div>
      {rows.length === 0 && <div className="empty">No calls due. Set a reminder from a lead to see it here.</div>}
      {overdue.length > 0 && <h2 style={{ color: 'var(--red)', margin: '8px 0' }}>Overdue</h2>}
      {overdue.map((r) => <Row key={r.id} r={r} over />)}
      {today.length > 0 && <h2 style={{ margin: '14px 0 8px' }}>Today</h2>}
      {today.map((r) => <Row key={r.id} r={r} />)}
    </>
  );
}
