import Link from 'next/link';
import { db } from '@/lib/db';
import { fmt } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function Chats() {
  const { data } = await db().from('leads').select('id,name,phone,source,last_message,last_message_at,wa_numbers(label)').order('last_message_at', { ascending: false });
  const chats = data || [];
  return (
    <>
      <div className="head"><div><h1>WhatsApp chats</h1><div className="sub">Recent conversations from your WhatsApp leads.</div></div><span className="pill">{chats.length} chats</span></div>
      {chats.length === 0 ? <div className="panel empty">No chats yet. New WhatsApp messages will appear here.</div> : <div className="panel chat-list">
        {chats.map((lead) => <Link className="chat-list-row" href={`/leads/${lead.id}`} key={lead.id}>
          <span className="chat-avatar">{(lead.name || lead.phone || '?').slice(0, 1).toUpperCase()}</span>
          <span className="chat-summary"><b>{lead.name || `+${lead.phone}`}</b><small>{lead.last_message || 'No message preview'}</small></span>
          <span className="chat-meta"><small>{fmt(lead.last_message_at)}</small><small>{lead.wa_numbers?.label || lead.source || 'Direct'}</small></span>
        </Link>)}
      </div>}
    </>
  );
}
