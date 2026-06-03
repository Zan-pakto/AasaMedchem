'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction, registerAction } from './actions/auth';
import { ShoppingBag, Loader2, Shield, User, Lock, Mail, ChevronRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'seller',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData();
    data.append('email', formData.email);
    data.append('password', formData.password);

    let res;
    if (activeTab === 'signin') {
      res = await loginAction(data);
    } else {
      data.append('name', formData.name);
      data.append('role', formData.role);
      res = await registerAction(data);
    }

    if (res.success && res.redirectTo) {
      router.push(res.redirectTo);
      router.refresh();
    } else {
      setError(res.error || 'Something went wrong');
      setLoading(false);
    }
  };

  const autofill = (email: string, pass: string) => {
    setFormData({
      ...formData,
      email,
      password: pass,
    });
    setActiveTab('signin');
    setError(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100 relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Logo and header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20 mb-4 ring-1 ring-white/10">
            <ShoppingBag className="h-7 w-7 text-white" />
          </div>
          <h1 className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            InvFlow
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sleek Inventory & Order Management System
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
          {/* Tabs */}
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-900 mb-8">
            <button
              onClick={() => {
                setActiveTab('signin');
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-zinc-850 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-zinc-850 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-5">
            {activeTab === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {activeTab === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center justify-center gap-1 rounded-xl border p-2.5 cursor-pointer text-xs font-semibold transition-all ${
                      formData.role === 'seller'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-zinc-850 bg-zinc-950 text-zinc-400 hover:border-zinc-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="seller"
                      checked={formData.role === 'seller'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <User className="h-3.5 w-3.5" />
                    Seller
                  </label>
                  <label
                    className={`flex items-center justify-center gap-1 rounded-xl border p-2.5 cursor-pointer text-xs font-semibold transition-all ${
                      formData.role === 'buyer'
                        ? 'border-sky-500 bg-sky-500/10 text-white'
                        : 'border-zinc-850 bg-zinc-950 text-zinc-400 hover:border-zinc-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="buyer"
                      checked={formData.role === 'buyer'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Buyer
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo Logins */}
          {activeTab === 'signin' && (
            <div className="mt-8 border-t border-zinc-850 pt-6">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3 text-center">
                Predefined Admin Credentials
              </span>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => autofill('admin@gmail.com', 'admin@1234')}
                  className="flex flex-col items-center justify-center rounded-xl border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 py-3 px-6 transition-colors cursor-pointer text-center w-full max-w-xs group"
                >
                  <span className="text-sm font-bold text-zinc-300 group-hover:text-purple-400 flex items-center gap-1.5 justify-center">
                    <Shield className="h-4 w-4" /> Admin Login
                  </span>
                  <span className="text-xs text-indigo-400 mt-1.5 font-semibold">admin@gmail.com</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Password: admin@1234</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
