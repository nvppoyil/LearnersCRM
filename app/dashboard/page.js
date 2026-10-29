import Link from 'next/link';
import { db } from '@/lib/db';
import { SOURCES, STATUSES } from '@/lib/constants';
import { fmt } from '@/lib/time';

export const dynamic = 'force-dynamic';

const dateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

export default async function Dashboard({ searchParams }) {
  const sb = db();
  const [{ data: allLeads }, { data: reminders }] = await Promise.all([
    sb.from('leads').select('id,name,phone,source,status,created_at,last_message_at').order('last_message_at', { ascending: false }),
    sb.from('call_reminders').select('lead_id,status').eq('status', 'pending'),
  ]);
  const q = (searchParams.q || '').trim().toLowerCase();
  const source = searchParams.source || '';
  const from = searchParams.from || '';
  const to = searchParams.to || '';
  const leads = (allLeads || []).filter((lead) => {
    const date = (lead.created_at || '').slice(0, 10);
    const matchesQuery = !q || [lead.name, lead.phone, lead.source, lead.status].some((value) => (value || '').toLowerCase().includes(q));
    return matchesQuery && (!source || lead.source === source) && (!dateOnly(from) || date >= from) && (!dateOnly(to) || date <= to);
  });
  const contacted = leads.filter((lead) => ['call1', 'call2', 'call3'].includes(lead.status)).length;
  const followUpIds = new Set((reminders || []).map((reminder) => reminder.lead_id));
  const cards = [
    ['♙', 'Total Leads', leads.length, 'blue'],
    ['♧', 'New Leads', leads.filter((lead) => lead.status === 'new').length, 'green'],
    ['☎', 'Contacted', contacted, 'amber'],
    ['◷', 'Follow Up', leads.filter((lead) => followUpIds.has(lead.id)).length, 'purple'],
    ['♡', 'Interested', leads.filter((lead) => lead.status === 'demo').length, 'pink'],
    ['♧', 'Enrolled', leads.filter((lead) => lead.status === 'enrolled').length, 'mint'],
  ];

  return (
    <>
      <form className="dash-toolbar" action="/dashboard">
        <label className="dash-search"><span aria-hidden="true">⌕</span><input name="q" defaultValue={q} placeholder="Search by name, phone, source or status…" aria-label="Search leads" /></label>
        <div className="dash-filters">
          <label className="date-filter"><span>From</span><input type="date" name="from" defaultValue={from} aria-label="Start date" /></label>
          <label className="date-filter"><span>To</span><input type="date" name="to" defaultValue={to} aria-label="End date" /></label>
          <select name="source" defaultValue={source} aria-label="Filter by source">
            <option value="">All Sources</option>
            {SOURCES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button className="dash-filter-button" type="submit">Apply</button>
        </div>
      </form>
      <div className="dash-cards">
        {cards.map(([icon, label, value, color]) => (
          <section className={`dash-card ${color}`} key={label}>
            <span className="dash-icon" aria-hidden="true">{icon}</span>
            <div><div className="dash-label">{label}</div><strong>{value}</strong><div className="dash-caption">In selected period</div></div>
          </section>
        ))}
      </div>
      <div className="head dash-heading"><div><h1>Dashboard</h1><div className="sub">A quick view of your leads and admissions.</div></div><Link className="btn" href="/">Open leads</Link></div>
      <div className="panel dash-recent">
        <h2>Recent leads</h2>
        {leads.length === 0 ? <div className="empty">No leads match these filters.</div> : leads.slice(0, 8).map((lead) => (
          <Link className="dash-lead" href={`/leads/${lead.id}`} key={lead.id}>
            <span><b>{lead.name || `+${lead.phone}`}</b><small>{lead.phone}</small></span>
            <span className="tag t-Meta">{lead.source || 'Direct'}</span>
            <span className="dash-status">{STATUSES.find(([key]) => key === lead.status)?.[1] || lead.status}</span>
            <span className="muted">{fmt(lead.last_message_at || lead.created_at)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
