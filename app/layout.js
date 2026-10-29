import './globals.css';
import Nav from '@/components/Nav';
import { db } from '@/lib/db';
import { endOfTodayUtc } from '@/lib/time';

export const metadata = { title: 'LittleLearners CRM' };
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }) {
  let badge = 0;
  try {
    const { count } = await db()
      .from('call_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('due_at', endOfTodayUtc().toISOString());
    badge = count || 0;
  } catch (e) {}
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="shell">
          <Nav badge={badge} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
