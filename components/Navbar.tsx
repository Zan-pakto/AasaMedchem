'use client';

import { useState } from 'react';
import { logoutAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { LogOut, User, Shield, ShoppingBag, Loader2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  user: {
    name: string;
    email: string;
    role: 'admin' | 'seller' | 'buyer';
  };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      setLoading(true);
      const res = await logoutAction();
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        alert(res.error || 'Failed to logout');
        setLoading(false);
      }
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                InvFlow
              </span>
              <span className="ml-1.5 text-xs text-zinc-500">v1.0</span>
            </div>
          </div>

          {/* User Details & Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-sm font-medium text-zinc-200">{user.name}</span>
              <span className="text-xs text-zinc-400">{user.email}</span>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-inner transition-colors duration-200 bg-zinc-900 border border-zinc-800">
              {user.role === 'admin' ? (
                <>
                  <Shield className="h-3 w-3 text-red-400" />
                  <span className="text-red-400">Admin</span>
                </>
              ) : user.role === 'buyer' ? (
                <>
                  <ShoppingBag className="h-3 w-3 text-sky-400" />
                  <span className="text-sky-400">Buyer</span>
                </>
              ) : (
                <>
                  <User className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Seller</span>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <LogOut className="h-4 w-4 text-zinc-400 group-hover:text-white" />
              )}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
