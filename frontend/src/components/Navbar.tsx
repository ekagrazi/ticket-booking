'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Ticket, LogOut, User as UserIcon, Loader2, LayoutDashboard, Shield, Search, Menu, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';

type Role = 'customer' | 'organiser' | 'admin' | null;

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchRole = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', uid).single();
    setRole((data?.role as Role) ?? 'customer');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id).finally(() => setLoading(false));
      else { setRole(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0f0f13]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50' : 'bg-[#0f0f13]/80 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link href="/events" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f84464] to-[#c084fc] flex items-center justify-center shadow-lg shadow-[#f84464]/30">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-extrabold text-lg tracking-tight">
                Ticket<span className="text-[#f84464]">Book</span>
              </span>
            </Link>

            {/* Center nav */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="/events" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Events
              </Link>
              {user && (
                <Link href="/bookings" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  My Bookings
                </Link>
              )}
              {(role === 'organiser' || role === 'admin') && (
                <Link href="/organiser/events" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Organiser
                </Link>
              )}
              {role === 'admin' && (
                <Link href="/admin/venues" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <Shield className="w-3.5 h-3.5" /> Admin
                </Link>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 border border-white/10 bg-white/5 text-gray-300 text-sm px-3 py-1.5 rounded-full max-w-[160px]">
                    <UserIcon className="w-3.5 h-3.5 shrink-0 text-[#f84464]" />
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="p-2 text-gray-500 hover:text-[#f84464] hover:bg-[#f84464]/10 rounded-lg transition-all"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block">
                    Sign In
                  </Link>
                  <Link href="/register" className="btn-brand px-5 py-2 text-sm rounded-lg">
                    Sign Up
                  </Link>
                </div>
              )}
              <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0f0f13]/98 px-4 py-4 space-y-1">
            {[
              { href: '/events', label: 'Events' },
              ...(user ? [{ href: '/bookings', label: 'My Bookings' }] : []),
              ...((role === 'organiser' || role === 'admin') ? [{ href: '/organiser/events', label: 'Organiser Portal' }] : []),
              ...(role === 'admin' ? [{ href: '/admin/venues', label: 'Admin Panel' }] : []),
            ].map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg text-sm font-medium transition-all">
                {label}
              </Link>
            ))}
            {!user && (
              <div className="pt-2 flex gap-2">
                <Link href="/login" className="flex-1 text-center py-2.5 border border-white/10 rounded-lg text-sm text-gray-300">Sign In</Link>
                <Link href="/register" className="flex-1 text-center btn-brand py-2.5 text-sm rounded-lg">Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
