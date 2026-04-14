import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Calendar, Search, Image as ImageIcon, Grid, List, Heart, MessageCircle, X, Send, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  coverImage: string;
  googleDriveLink?: string;
  category?: string;
}

export default function Gallery() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedYear, setSelectedYear] = useState<string>('Semua Tahun');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Kategori');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', sortBy === 'newest' ? 'desc' : 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(eventData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sortBy]);

  const years = ['Semua Tahun', ...new Set(events.map(event => new Date(event.date).getFullYear().toString()))].sort((a, b) => b.localeCompare(a));
  const categories = ['Semua Kategori', ...new Set(events.map(event => event.category || 'Kegiatan'))].sort();

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === 'Semua Tahun' || new Date(event.date).getFullYear().toString() === selectedYear;
    const matchesCategory = selectedCategory === 'Semua Kategori' || (event.category || 'Kegiatan') === selectedCategory;
    return matchesSearch && matchesYear && matchesCategory;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen pt-32 pb-20 px-6 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="bg-accent/10 border border-accent/20 px-4 py-1 rounded-full text-accent text-xs font-bold uppercase tracking-widest">
              Dokumentasi Visual
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white">GALERI <span className="text-accent">FOTO</span></h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Kumpulan momen berharga dari berbagai acara yang berhasil kami abadikan.
            </p>
          </motion.div>
        </header>

        {/* Search & Filter Bar */}
        <div className="max-w-6xl mx-auto mb-16 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-accent transition-colors" />
              <input
                type="text"
                placeholder="Cari nama acara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="flex-grow md:flex-grow-0 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 px-6 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all cursor-pointer font-bold"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>

              <div className="flex bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-accent text-white" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'list' ? "bg-accent text-white" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Year & Category Filters */}
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto custom-scrollbar-hide max-w-full">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    selectedYear === year 
                      ? "bg-accent text-white shadow-lg shadow-accent/20" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>

            <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto custom-scrollbar-hide max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    selectedCategory === cat 
                      ? "bg-accent text-white shadow-lg shadow-accent/20" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-zinc-500 font-medium">Memuat galeri...</p>
          </div>
        ) : (
          <div 
            className={cn(
              "grid gap-8",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}
          >
            {filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeOut"
                }}
                whileHover={{ y: -5 }}
                className={cn(
                  "group bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-accent/30 transition-all relative shadow-lg hover:shadow-2xl",
                  viewMode === 'grid' ? "aspect-[4/5]" : "flex flex-row h-auto md:h-64 items-center md:items-stretch"
                )}
              >
                {/* Image Section */}
                <div className={cn(
                  "relative overflow-hidden shrink-0",
                  viewMode === 'grid' ? "absolute inset-0" : "w-32 h-32 md:w-80 md:h-full m-4 md:m-0 rounded-2xl md:rounded-none"
                )}>
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  {/* Gradient Overlay - ONLY for Grid Mode */}
                  {viewMode === 'grid' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                  )}
                </div>
                
                {/* Content Section */}
                <div className={cn(
                  "relative h-full w-full min-w-0",
                  viewMode === 'grid' ? "absolute inset-0" : "flex-grow p-4 md:p-8 flex flex-col justify-center"
                )}>
                  {viewMode === 'grid' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-8 md:p-12 text-center overflow-hidden">
                      <div 
                        className="w-full relative z-10 transition-transform duration-500"
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="bg-accent/20 backdrop-blur-md border border-accent/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent">
                            {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        
                        <h3 className="text-2xl md:text-3xl font-black leading-tight text-white group-hover:text-accent transition-colors duration-500">
                          {event.title}
                        </h3>

                        <div 
                          className="overflow-hidden text-center transition-all duration-500 max-h-40 opacity-100 md:max-h-0 md:opacity-0 md:group-hover:max-h-40 md:group-hover:opacity-100"
                        >
                          <div className="pt-4">
                            <p className="text-zinc-300 text-sm mb-6 line-clamp-2 leading-relaxed">
                              {event.description || "Dokumentasi kegiatan oleh tim kreatif kami."}
                            </p>
                            
                            {event.googleDriveLink ? (
                              <a
                                href={`/halaman-transisi.html?url=${encodeURIComponent(event.googleDriveLink)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-accent hover:bg-white hover:text-accent text-white px-6 py-3 rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-accent/20"
                              >
                                Lihat Galeri <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <div className="inline-block text-zinc-500 text-xs font-bold uppercase tracking-widest bg-white/5 backdrop-blur-md py-2 px-4 rounded-lg border border-white/10">
                                Galeri Belum Tersedia
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* List Mode Content */
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <Calendar className="w-4 h-4 text-accent" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                          {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-3xl font-black mb-2 md:mb-4 leading-tight text-black dark:text-white group-hover:text-accent transition-colors duration-500 truncate md:whitespace-normal">
                        {event.title}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm mb-4 md:mb-6 line-clamp-2 md:line-clamp-2 leading-relaxed max-w-2xl hidden md:block">
                        {event.description || "Dokumentasi kegiatan oleh tim kreatif kami."}
                      </p>
                      
                      <div className="flex items-center gap-3">
                        {event.googleDriveLink ? (
                          <a
                            href={`/halaman-transisi.html?url=${encodeURIComponent(event.googleDriveLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-fit inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-accent dark:hover:bg-accent hover:text-white dark:hover:text-white px-4 md:px-8 py-2 md:py-3 rounded-xl text-xs md:text-sm font-black transition-all active:scale-95 shadow-lg"
                          >
                            <span className="hidden md:inline">Lihat Galeri</span>
                            <span className="md:hidden">Lihat</span> <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                          </a>
                        ) : (
                          <div className="w-fit text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 py-1 px-2 md:py-2 md:px-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            Belum Tersedia
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
      )}

      {!loading && filteredEvents.length === 0 && (
        <div className="text-center py-20">
          <div className="bg-zinc-50 dark:bg-zinc-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Tidak ada hasil</h3>
          <p className="text-zinc-500">Coba gunakan kata kunci pencarian yang lain.</p>
        </div>
      )}

      <section className="mt-32 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-accent to-accent/60 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl shadow-accent/20">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <Heart className="w-64 h-64 -rotate-12 -translate-x-10 -translate-y-10 text-white fill-current" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-6 relative z-10 text-white uppercase">DUKUNG KREATIVITAS KAMI</h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto relative z-10">
            Bantu kami terus berkarya dan mendokumentasikan setiap momen berharga dengan memberikan dukungan Anda.
          </p>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-accent px-10 py-5 rounded-2xl font-black text-lg hover:bg-zinc-100 transition-all inline-flex items-center gap-3 relative z-10 shadow-xl active:scale-95"
          >
            <Heart className="w-6 h-6 fill-current" />
            Support Kami
          </a>
        </div>
      </section>
    </div>
  </motion.div>
  );
}
