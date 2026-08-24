import Link from 'next/link';
import { Ticket, Shield, LayoutDashboard } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0a0a0f] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f84464] to-[#c084fc] flex items-center justify-center">
                <Ticket className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-extrabold">Ticket<span className="text-[#f84464]">Book</span></span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your go-to platform for booking movies, concerts, and live events. Real-time seats, instant QR tickets.
            </p>
            <div className="flex gap-3 mt-5">
              <Link href="/admin/venues" title="Admin Portal" className="w-8 h-8 border border-white/10 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#f84464] hover:border-[#f84464]/30 transition-all bg-white/5">
                <Shield className="w-4 h-4" />
              </Link>
              <Link href="/organiser/events" title="Organiser Portal" className="w-8 h-8 border border-white/10 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#c084fc] hover:border-[#c084fc]/30 transition-all bg-white/5">
                <LayoutDashboard className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="flex gap-16">
            {[
              { title: 'Explore', links: [['Events', '/events'], ['Movies', '/events'], ['Concerts', '/events']] },
              { title: 'Account', links: [['Sign In', '/login'], ['Register', '/register'], ['My Bookings', '/bookings']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-white font-semibold text-sm mb-4">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-600 text-xs">© 2025 TicketBook. All rights reserved.</p>
          <p className="text-gray-600 text-xs">Built with Supabase · Next.js · Vercel</p>
        </div>
      </div>
    </footer>
  );
}
