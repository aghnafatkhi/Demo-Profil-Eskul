import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, Menu, X, Film, Users, Image as ImageIcon, Home, User, Sun, Moon, Trophy, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = [
    { name: 'Beranda', path: '/', icon: <Home className="w-4 h-4" /> },
    { name: 'Galeri', path: '/gallery', icon: <ImageIcon className="w-4 h-4" /> },
    { name: 'Anggota', path: '/members', icon: <Users className="w-4 h-4" /> },
    { name: 'Video', path: '/projects', icon: <Film className="w-4 h-4" /> },
    { name: 'Feed Foto', path: '/leaderboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { name: 'Presensi', path: '/attendance', icon: <Camera className="w-4 h-4" /> },
  ];

  if (isAdmin) {
    navLinks.push({ name: 'Admin', path: '/admin', icon: <User className="w-4 h-4 text-accent" /> });
  }

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800 py-3'
          : 'bg-transparent border-transparent py-4'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform p-1">
            <Camera className="w-6 h-6 text-white dark:text-black" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">Nama Organisasi</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 font-medium">
              Slogan atau Lokasi
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4 lg:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'flex items-center gap-2 text-xs lg:text-sm font-medium transition-colors hover:text-accent',
                location.pathname === link.path 
                  ? 'text-accent' 
                  : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          
          <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-accent dark:hover:text-accent transition-all border border-zinc-200 dark:border-zinc-800"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <Link
              to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'}
              className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-accent dark:hover:bg-accent hover:text-white dark:hover:text-white px-4 lg:px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-zinc-800 dark:border-zinc-200 flex-shrink-0"
            >
              <User className="w-4 h-4" />
              {user ? (isAdmin ? 'Admin Panel' : 'Dashboard') : 'Login Anggota'}
            </Link>
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-accent transition-colors"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-white transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-4 text-lg font-medium transition-colors',
                      location.pathname === link.path 
                        ? 'text-accent' 
                        : 'text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: navLinks.length * 0.05 }}
              >
                <Link
                  to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'}
                  onClick={() => setIsOpen(false)}
                  className="bg-accent text-white px-6 py-4 rounded-2xl text-lg font-bold flex items-center gap-4 transition-all"
                >
                  <User className="w-5 h-5" />
                  {user ? (isAdmin ? 'Admin Panel' : 'Dashboard') : 'Login Anggota'}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
