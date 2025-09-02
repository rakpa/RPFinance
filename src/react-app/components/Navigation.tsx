import { NavLink } from 'react-router';
import { Home, BarChart3, Settings } from 'lucide-react';

export default function Navigation() {
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/categories', label: 'Categories', icon: Settings },
  ];

  return (
    <nav className="flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-xl p-1 border border-white/50">
      {navItems.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isActive
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`
          }
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
