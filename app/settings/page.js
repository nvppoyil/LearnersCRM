import { db } from '@/lib/db';
import { addNumber } from '../actions';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const sb = db();
  const [{ data: nums }, { data: leads }] = await Promise.all([
    sb.from('wa_numbers').select('*').order('created_at'),
    sb.from('leads').select('wa_number_id'),
  ]);
  const count = (id) => (leads || []).filter((l) => l.wa_number_id === id).length;
  return (
    <>
      <div className="head">
        <div>
          <h1>Settings</h1>
          <div className="muted">WhatsApp numbers</div>
          <div className="sub">Your numbers stay in the WhatsApp Business app on your phone. The CRM receives the same chats.</div>
        </div>
      </div>
      {(nums || []).length === 0 && <div className="empty">No numbers yet. They appear here automatically when the first message arrives, or add one below.</div>}
      {(nums || []).map((n) => (
        <div className="trow" key={n.id}>
          <div className="who"><b>{n.label}</b> <span className="muted">{n.phone ? `+${n.phone.replace(/\D/g, '')}` : ''}</span>
            <div className="muted">Number ID: {n.phone_number_id || 'not set'}</div></div>
          <span className="ok">{n.phone_number_id ? 'Connected' : 'Not linked'}</span>
          <span className="muted">{count(n.id)} leads</span>
        </div>
      ))}
      <h2 style={{ margin: '18px 0 8px' }}>Add a WhatsApp number</h2>
      <form action={addNumber} className="panel" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}>
        <div><label htmlFor="n-label">Name (example: Maths line)</label><input id="n-label" name="label" required /></div>
        <div><label htmlFor="n-phone">Phone number</label><input id="n-phone" name="phone" placeholder="919876543210" /></div>
        <div><label htmlFor="n-id">Number ID from Meta</label><input id="n-id" name="phone_number_id" /></div>
        <button className="pri">Add number</button>
      </form>
      <div className="note">
        Webhook link for Meta: <b>https://YOUR-SITE.vercel.app/api/whatsapp/webhook</b><br />
        Open the WhatsApp Business app on your phone regularly so the CRM link stays active.
      </div>
    </>
  );
}
