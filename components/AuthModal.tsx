import React, { useState } from 'react';
import { X, Mail, Lock, AlertCircle, Info, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { Language } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, language }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, signup, signInWithGoogle, isDemoMode } = useAuth();
  const t = translations[language];

  if (!isOpen) return null;

  const getErrorMessage = (err: any): string => {
    const code = err.code || '';
    switch (code) {
      case 'auth/email-already-in-use': return t.errorEmailInUse;
      case 'auth/invalid-email': return t.errorInvalidEmail;
      case 'auth/weak-password': return t.errorWeakPassword;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials': return t.errorInvalidCreds;
      case 'auth/too-many-requests': return t.errorTooManyRequests;
      case 'auth/network-request-failed': return t.errorNetwork;
      case 'auth/popup-closed-by-user': return t.errorGoogleCancelled;
      default: return t.authError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) await login(email, password);
      else await signup(email, password);
      onClose();
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') setError(getErrorMessage(err));
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surfaceHighlight bg-surface/50">
        <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h2 className="font-bold text-sm uppercase tracking-widest">{isLogin ? t.login : t.signup}</h2>
        </div>
        <button onClick={onClose} className="p-2 text-textMuted hover:text-white hover:bg-white/5 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col justify-center">
        <div className="w-full space-y-6">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <Lock size={24} className="text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-white">{isLogin ? "Welcome Back" : "Join MoviesGPT"}</h3>
                <p className="text-xs text-textMuted">Enter your details below to continue.</p>
            </div>

            {isDemoMode && (
                <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-blue-200 text-xs">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span><strong>{t.demoMode}:</strong> {t.demoMessage}</span>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-900/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] text-textMuted uppercase font-bold tracking-wider ml-1">{t.email}</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={14} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-surfaceHighlight border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-textMuted uppercase font-bold tracking-wider ml-1">{t.password}</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={14} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-surfaceHighlight border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-900/10 disabled:opacity-50 text-sm flex items-center justify-center"
                >
                    {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isLogin ? t.login : t.signup)}
                </button>
            </form>

            <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-white/5 flex-1"></div>
                <span className="text-[10px] text-textMuted uppercase tracking-widest">{t.or}</span>
                <div className="h-px bg-white/5 flex-1"></div>
            </div>

            <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors text-sm"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t.googleLogin}
            </button>

            <p className="text-center text-xs text-textMuted">
                {isLogin ? t.noAccount : t.hasAccount}{" "}
                <button
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-white font-bold hover:underline"
                >
                    {isLogin ? t.signup : t.login}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};