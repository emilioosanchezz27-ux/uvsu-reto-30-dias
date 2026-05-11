'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BarChart2, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Hoy', icon: Home },
  { href: '/historial', label: 'Historial', icon: Calendar },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/settings', label: 'Config', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto safe-bottom"
      style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors min-w-[60px]"
              style={{ color: active ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-xs font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
