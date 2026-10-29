import { db } from '@/lib/db';
import { SOURCES, STATUSES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function Reports() {
  const { data: leads } = await db().from('leads').select('status,source');
  const rows = leads || [];
  const count = (fn) => rows.filter(fn).length;
  return (
    <>
      <div className="head"><div><h1>Reports</h1><div className="sub">A simple summary of your lead pipeline.</div></div></div>
      <div className="report-summary"><div className="panel"><span className="muted">Total leads</span><strong>{rows.length}</strong></div><div className="panel"><span className="muted">Enrolled</span><strong>{count((lead) => lead.status === 'enrolled')}</strong></div><div className="panel"><span className="muted">Active leads</span><strong>{count((lead) => lead.status !== 'lost')}</strong></div></div>
      <div className="report-columns">
        <section className="panel report-box"><h2>Leads by status</h2>{STATUSES.map(([key, label]) => <div className="report-row" key={key}><span>{label}</span><b>{count((lead) => lead.status === key)}</b></div>)}</section>
        <section className="panel report-box"><h2>Leads by source</h2>{SOURCES.map((source) => <div className="report-row" key={source}><span>{source}</span><b>{count((lead) => lead.source === source)}</b></div>)}</section>
      </div>
    </>
  );
}
