import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Film, X, Info, ExternalLink, Copy, Check } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  category?: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('title', sortBy === 'alphabetical' ? 'asc' : 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sortBy]);

  const categories = ['Semua', ...new Set(projects.map(p => p.category).filter(Boolean) as string[])];
  
  const filteredProjects = activeCategory === 'Semua' 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

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
              Video Kreatif
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase">KARYA <span className="text-accent">KREATIF</span></h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Kumpulan karya kolaborasi tim kreatif organisasi kami.
            </p>
          </motion.div>
        </header>

        {/* Category & Sort Filter */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-16">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2 rounded-full font-bold text-sm transition-all border",
                  activeCategory === cat 
                    ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" 
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 hover:border-accent hover:text-accent"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block" />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full py-2 px-6 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all cursor-pointer font-bold"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-zinc-500 font-medium">Memuat karya video...</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative bg-zinc-50 dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 hover:border-accent/50 transition-all shadow-xl hover:shadow-2xl"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={project.thumbnailUrl}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <button 
                      onClick={() => setSelectedProject(project)}
                      className="bg-accent p-4 rounded-full scale-90 group-hover:scale-100 transition-transform shadow-2xl"
                    >
                      <Play className="w-6 h-6 fill-current text-white" />
                    </button>
                  </div>
                  {project.category && (
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                      {project.category}
                    </div>
                  )}
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white group-hover:text-accent transition-colors">{project.title}</h3>
                  <p className="text-zinc-500 dark:text-zinc-500 text-sm mb-6 line-clamp-2 leading-relaxed">
                    {project.description || "Project karya tim kreatif organisasi kami."}
                  </p>
                  <button 
                    onClick={() => setSelectedProject(project)}
                    className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-accent dark:hover:text-accent text-sm font-bold transition-colors"
                  >
                    <Info className="w-4 h-4" /> Detail Project
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-zinc-50 dark:bg-zinc-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Film className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Belum ada karya</h3>
            <p className="text-zinc-500">Karya video akan segera hadir di sini.</p>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <div
            onClick={() => setSelectedProject(null)}
            className="absolute inset-0 bg-black/95 backdrop-blur-md"
          />
          <div
            className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl z-10"
          >
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-6 right-6 p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-accent rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5 text-zinc-900 dark:text-white" />
              </button>

              <div className="flex flex-col">
                <div className="aspect-video bg-black relative">
                  {/* Video Embed Logic (Simple iframe for YouTube/Drive) */}
                  <iframe
                    src={(() => {
                      let url = selectedProject.videoUrl;
                      if (url.includes('youtube.com/watch?v=')) {
                        return url.replace('watch?v=', 'embed/');
                      }
                      if (url.includes('youtu.be/')) {
                        return url.replace('youtu.be/', 'youtube.com/embed/');
                      }
                      if (url.includes('drive.google.com')) {
                        return url.replace('/view', '/preview');
                      }
                      return url;
                    })()}
                    title={selectedProject.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
                <div className="p-8 md:p-12">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                      <div className="text-accent font-bold text-xs uppercase tracking-widest mb-2">{selectedProject.category}</div>
                      <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">{selectedProject.title}</h2>
                    </div>
                    <a 
                      href={selectedProject.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-accent dark:hover:bg-accent hover:text-white dark:hover:text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" /> Buka di YouTube
                    </a>
                    <button 
                      onClick={() => handleCopyLink(selectedProject.videoUrl)}
                      className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Tersalin!' : 'Salin Link'}
                    </button>
                  </div>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mb-8" />
                  <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed">
                    {selectedProject.description || "Project ini merupakan hasil kolaborasi tim dalam mengeksplorasi kreativitas dan storytelling visual."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
