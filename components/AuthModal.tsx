'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { X, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  forceRole?: 'guest' | 'host';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signin', forceRole }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();
  const didRedirect = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll to avoid layout shift/flicker when modal opens
  useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, mounted]);

  const redirectAfterAuth = async () => {
    if (didRedirect.current) return;
    didRedirect.current = true;
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email || '';
    const metaRole = (data.user?.user_metadata?.role as 'guest' | 'host' | 'admin' | undefined) || undefined;
    // If caller forces a role, prefer it
    const effectiveRole = forceRole ?? (metaRole ?? (email === 'bkanuel@gmail.com' ? 'admin' : 'guest'));
    const target = effectiveRole === 'host' || effectiveRole === 'admin' ? '/portal/host' : '/portal/guest';
    window.location.replace(target);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || didRedirect.current) return;
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      onClose();
      await redirectAfterAuth();
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'guest' } },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Account created! Please check your email to verify your account.');
      // Try to sign in immediately
      setTimeout(async () => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (!signInError) {
          onClose();
          await redirectAfterAuth();
        }
      }, 1000);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setShowPassword(false);
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    resetForm();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-[99998]"
        onClick={loading ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 z-[99999]">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-[100000]">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/logo/BR%20Logo.png"
                alt="Belle Rouge Properties logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'signin' ? 'Welcome back' : 'Join Belle Rouge Properties'}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {mode === 'signin' 
                ? 'Sign in to complete your reservation' 
                : 'Create an account to get started'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {/* Error/Success Message */}
            {message && (
              <div className={`text-sm p-3 rounded-lg ${
                message.includes('created') || message.includes('check your email')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-4 w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : 'Sign in with Google'}
          </button>

          {/* Mode Switch */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body);
}
