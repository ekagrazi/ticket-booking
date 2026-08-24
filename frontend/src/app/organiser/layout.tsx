'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LayoutDashboard, CalendarPlus, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';

const navItems = [
  { href: '/organiser/events', label: 'My Events', icon: LayoutDashboard },
];

export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login?next=' + pathname); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile || !['organiser', 'admin'].includes(profile.role)) {
        router.push('/events');
        return;
      }
      setChecking(false);
    };
    check();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
          <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-500">
            <p className="text-white font-bold text-sm uppercase tracking-wider">Organiser</p>
          </div>
          <nav className="p-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
