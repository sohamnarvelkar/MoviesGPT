import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, isConfigured } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock User for Demo Mode
const createMockUser = (email: string): User => ({
    uid: 'mock-user-' + Math.random().toString(36).substr(2, 9),
    email: email,
    displayName: email.split('@')[0],
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'mock',
    photoURL: null
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConfigured && auth) {
        // Real Firebase Listeners
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        return () => unsubscribe();
    } else {
        // Mock Session Recovery
        const storedUser = localStorage.getItem('moviesgpt_mock_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse mock user", e);
            }
        }
        setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    if (isConfigured && auth) {
        await signInWithEmailAndPassword(auth, email, pass);
    } else {
        // Mock Login
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
        if (email.includes('error')) throw { code: 'auth/invalid-credential' };
        
        const mockUser = createMockUser(email);
        setUser(mockUser);
        localStorage.setItem('moviesgpt_mock_user', JSON.stringify(mockUser));
    }
  };

  const signup = async (email: string, pass: string) => {
    if (isConfigured && auth) {
        await createUserWithEmailAndPassword(auth, email, pass);
    } else {
        // Mock Signup
        await new Promise(resolve => setTimeout(resolve, 800));
        if (email.includes('exist')) throw { code: 'auth/email-already-in-use' };

        const mockUser = createMockUser(email);
        setUser(mockUser);
        localStorage.setItem('moviesgpt_mock_user', JSON.stringify(mockUser));
    }
  };

  const signInWithGoogle = async () => {
    if (isConfigured && auth) {
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
        } catch (error) {
          console.error("Error signing in with Google", error);
          throw error;
        }
    } else {
        // Mock Google Login
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockUser = createMockUser('demo-google@gmail.com');
        mockUser.displayName = 'Demo Google User';
        setUser(mockUser);
        localStorage.setItem('moviesgpt_mock_user', JSON.stringify(mockUser));
    }
  };

  const logout = async () => {
    if (isConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (error) {
        console.error("Error signing out", error);
      }
    } else {
        setUser(null);
        localStorage.removeItem('moviesgpt_mock_user');
    }
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        signInWithGoogle, 
        login,
        signup,
        logout,
        isDemoMode: !isConfigured
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};