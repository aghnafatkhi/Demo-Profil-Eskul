import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkMembershipAndNavigate = async (user: any) => {
    // Sync with 'users' collection for RBAC
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: 'user',
          displayName: user.displayName || '',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error syncing user document:", err);
    }

    try {
      // 1. Check if user is admin via Firestore 'users' collection or default email
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const isAdmin = (userSnap.exists() && userSnap.data().role === 'admin') || 
                      user.email === 'aghna1011@gmail.com';

      if (isAdmin) {
        // Ensure the user document reflects the admin role if it's the default admin
        if (user.email === 'aghna1011@gmail.com' && (!userSnap.exists() || userSnap.data().role !== 'admin')) {
          await setDoc(userRef, {
            email: user.email,
            role: 'admin',
            displayName: user.displayName || 'Super Admin',
            createdAt: userSnap.exists() ? userSnap.data().createdAt : new Date().toISOString()
          }, { merge: true });
        }
        navigate('/admin');
        return;
      }

      // 2. If not admin, check if user is registered as a member
      const q = query(collection(db, 'members'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // User is not registered as a member and not an admin
        await signOut(auth);
        setError('Email Anda belum terdaftar sebagai anggota. Silakan hubungi admin untuk mendaftar.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Error checking membership:", err);
      setError('Terjadi kesalahan saat memeriksa status keanggotaan.');
      await signOut(auth);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await checkMembershipAndNavigate(userCredential.user);
    } catch (err: any) {
      setError('Email atau password salah. Silakan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, provider);
      await checkMembershipAndNavigate(result.user);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show an error message
        return;
      }
      setError('Gagal login dengan Google.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex items-center justify-center px-6 pt-20 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[2.5rem] shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-accent p-3 rounded-2xl mb-6">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">Login Anggota</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">Masuk untuk mengelola portofolio Anda.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-600" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-600" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-accent/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Masuk
              </>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-grow" />
          <span className="text-zinc-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-widest">Atau</span>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-grow" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mt-8 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 text-zinc-900 dark:text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all border border-zinc-200 dark:border-zinc-800 shadow-lg"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Masuk dengan Google
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
