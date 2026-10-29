'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/dashboard', 'Dashboard'],
  ['/', 'Leads'],
  ['/today', "Today's callbacks"],
  ['/chats', 'WhatsApp chats'],
  ['/admissions', 'Admissions'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
];

export default function Nav({ badge }) {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="brand">LittleLearners CRM</div>
      {ITEMS.map(([href, label]) => {
        const active = href === '/' ? path === '/' || path.startsWith('/leads') : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? 'navlink active' : 'navlink'}>
            <span>{label}</span>
            {href === '/today' && badge > 0 ? <span className="badge">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
