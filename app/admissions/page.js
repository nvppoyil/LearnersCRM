import Link from 'next/link';
import { db } from '@/lib/db';
import { fmt } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function Admissions() {
  const { data } = await db().from('leads').select('id,name,phone,child_name,source,created_at').eq('status', 'enrolled').order('created_at', { ascending: false });
  const admissions = data || [];
  return (
    <>
      <div className="head"><div><h1>Admissions</h1><div className="sub">Leads marked Enrolled are listed here.</div></div><span className="pill">{admissions.length} enrolled</span></div>
      {admissions.length === 0 ? <div className="panel empty">No enrolled leads yet. Change a lead’s status to Enrolled to see it here.</div> : (
        <div className="panel admissions-list">
          <div className="admission-row admission-header"><span>Parent</span><span>Child</span><span>Phone</span><span>Source</span><span>Added</span></div>
          {admissions.map((lead) => <Link className="admission-row" href={`/leads/${lead.id}`} key={lead.id}><b>{lead.name || 'Parent name not added'}</b><span>{lead.child_name || '—'}</span><span>{lead.phone}</span><span>{lead.source || 'Direct'}</span><span>{fmt(lead.created_at)}</span></Link>)}
        </div>
      )}
    </>
  );
}
