import React, { useState } from 'react';
import { X, Mail, Lock, AlertCircle, Info } from 'lucide-react';
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
  
  // Use abstract methods from context instead of direct firebase calls
  const { login, signup, signInWithGoogle, isDemoMode } = useAuth();
  const t = translations[language];

  if (!isOpen) return null;

  // Helper to parse Firebase Error Codes
  const getErrorMessage = (err: any): string => {
    const code = err.code || '';
    
    switch (code) {
      case 'auth/email-already-in-use':
        return t.errorEmailInUse;
      case 'auth/invalid-email':
        return t.errorInvalidEmail;
      case 'auth/weak-password':
        return t.errorWeakPassword;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return t.errorInvalidCreds;
      case 'auth/too-many-requests':
        return t.errorTooManyRequests;
      case 'auth/network-request-failed':
        return t.errorNetwork;
      case 'auth/popup-closed-by-user':
        return t.errorGoogleCancelled;
      default:
        if (err.message?.includes('network')) return t.errorNetwork;
        return t.authError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      onClose();
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error("Auth Error:", err);
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
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
          return;
      }
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-surface/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col">
        
        <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="p-2 text-textMuted hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-full max-w-sm space-y-6">
                <h2 className="text-3xl font-bold text-white text-center">
                {isLogin ? t.login : t.signup}
                </h2>

                {/* Demo Mode Notice */}
                {isDemoMode && (
                    <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg flex items-start gap-3 text-blue-200 text-sm">
                        <Info size={18} className="shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-semibold mb-1">{t.demoMode}</strong>
                            <span>{t.demoMessage}</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-200 text-sm animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm text-textMuted ml-1">{t.email}</label>
                    <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-surfaceHighlight border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary/50"
                        placeholder="name@example.com"
                    />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-textMuted ml-1">{t.password}</label>
                    <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-surfaceHighlight border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary/50"
                        placeholder="••••••••"
                        minLength={6}
                    />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing...</span>
                        </div>
                    ) : (
                        isLogin ? t.login : t.signup
                    )}
                </button>
                </form>

                <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-xs text-textMuted uppercase">{t.or}</span>
                <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white text-black font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors transform hover:scale-[1.01] active:scale-[0.99]"
                >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                    />
                    <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                    />
                    <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                    />
                    <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                    />
                </svg>
                {t.googleLogin}
                </button>

                <p className="mt-6 text-center text-sm text-textMuted">
                {isLogin ? t.noAccount : t.hasAccount}{" "}
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                    className="text-white font-medium hover:underline underline-offset-4"
                >
                    {isLogin ? t.signup : t.login}
                </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};