import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, animate } from 'motion/react';
import { Play, Camera, Users, Image as ImageIcon, ArrowRight, Calendar, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface Event {
  id: string;
  title: string;
  date: string;
  coverImage: string;
  description?: string;
}

function Counter({ value, suffix = "" }: { value: number | string, suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  
  // Extract number from string if needed (e.g., "12k" -> 12)
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value;
  const isK = typeof value === 'string' && value.toLowerCase().includes('k');

  useEffect(() => {
    if (inView && ref.current) {
      const controls = animate(0, numericValue, {
        duration: 2,
        ease: "easeOut",
        onUpdate(latest) {
          if (ref.current) {
            const formatted = isK ? latest.toFixed(1) + 'k' : Math.floor(latest).toString();
            ref.current.textContent = formatted + suffix;
          }
        },
      });
      return () => controls.stop();
    }
  }, [inView, numericValue, isK, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

export default function Home() {
  const [latestEvent, setLatestEvent] = useState<Event | null>(null);
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestEvent({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Event);
      }
    }, (error) => console.error("Error fetching latest event:", error));
    return () => unsubscribe();
  }, []);

  const features = [
    {
      title: 'Dokumentasi Acara',
      description: 'Dokumentasi lengkap setiap momen berharga organisasi kami.',
      icon: <ImageIcon className="w-8 h-8 text-accent" />,
      link: '/gallery',
      bg: 'bg-zinc-50 dark:bg-zinc-900/50'
    },
    {
      title: 'Portofolio Anggota',
      description: 'Kenali tim kreatif kami dan lihat hasil karya terbaik mereka.',
      icon: <Users className="w-8 h-8 text-accent" />,
      link: '/members',
      bg: 'bg-zinc-50 dark:bg-zinc-900/50'
    },
    {
      title: 'Video Kreatif',
      description: 'Tonton video profil, dokumentasi, dan film pendek karya kami.',
      icon: <Play className="w-8 h-8 text-accent" />,
      link: '/projects',
      bg: 'bg-zinc-50 dark:bg-zinc-900/50'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen transition-colors duration-300"
    >
      {/* Hero Section */}
      <section ref={targetRef} className="relative min-h-screen flex flex-col overflow-hidden pt-32 pb-12">
        {/* Background Image with Overlay */}
        <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
          <img
            src="https://picsum.photos/seed/cinema/1920/1080"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-20 dark:opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-white/40 dark:via-zinc-950/40 to-transparent" />
        </motion.div>

        <div className="relative z-10 flex-grow flex items-center justify-center max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center gap-4 md:gap-6"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-accent/10 border border-accent/20 px-4 py-1 rounded-full text-accent text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 flex items-center gap-2"
            >
              Bidang Organisasi
            </motion.div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none mb-2 md:mb-4 uppercase text-zinc-900 dark:text-white">
              Headline Utama <br />
              Organisasi <span className="text-accent">Anda!</span>
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-4 md:mb-8 leading-relaxed">
              Selamat datang di website resmi organisasi Anda. Tempat kami berbagi visi, misi, dan kreativitas bersama.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/gallery"
                className="bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-accent/20"
              >
                <ImageIcon className="w-5 h-5" />
                Dokumentasi Acara
              </Link>
              <Link
                to="/projects"
                className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all hover:scale-105 active:scale-95 border border-zinc-200 dark:border-zinc-800 shadow-lg"
              >
                <Play className="w-5 h-5 fill-current" />
                Karya Kreatif
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-400 dark:text-zinc-600"
        >
          <div className="w-6 h-10 border-2 border-zinc-200 dark:border-zinc-800 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-accent rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Latest Event Highlight */}
      {latestEvent && (
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row items-center gap-12 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] p-8 md:p-12 overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="w-full md:w-1/2 aspect-video rounded-2xl overflow-hidden relative shadow-2xl">
              <img 
                src={latestEvent.coverImage} 
                alt={latestEvent.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 bg-accent text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Terbaru
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-6">
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500 text-sm font-bold">
                <Calendar className="w-4 h-4 text-accent" />
                {new Date(latestEvent.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white">
                {latestEvent.title}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed line-clamp-3">
                {latestEvent.description || "Lihat dokumentasi lengkap dari kegiatan terbaru kami."}
              </p>
              <Link
                to="/gallery"
                className="inline-flex items-center gap-3 text-accent font-black text-lg group/btn"
              >
                Lihat Dokumentasi <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "p-10 rounded-3xl border border-zinc-100 dark:border-zinc-900 hover:border-accent/30 transition-all group shadow-sm hover:shadow-xl",
                feature.bg
              )}
            >
              <div className="mb-8 p-4 bg-white dark:bg-zinc-950 rounded-2xl w-fit group-hover:scale-110 transition-transform shadow-md">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">{feature.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-500 mb-8 leading-relaxed">
                {feature.description}
              </p>
              <Link
                to={feature.link}
                className="flex items-center gap-2 text-accent font-bold group-hover:gap-4 transition-all"
              >
                Selengkapnya <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 bg-zinc-50 dark:bg-zinc-900/30 border-y border-zinc-100 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-5xl font-black text-zinc-900 dark:text-white mb-2">
              <Counter value={40} suffix="+" />
            </div>
            <div className="text-zinc-500 text-sm uppercase tracking-widest">Anggota Aktif</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-5xl font-black text-zinc-900 dark:text-white mb-2">
              <Counter value={25} suffix="+" />
            </div>
            <div className="text-zinc-500 text-sm uppercase tracking-widest">Project Video</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-5xl font-black text-zinc-900 dark:text-white mb-2">
              <Counter value={5} suffix="+" />
            </div>
            <div className="text-zinc-500 text-sm uppercase tracking-widest">Penghargaan</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-5xl font-black text-zinc-900 dark:text-white mb-2">
              <Counter value="12k" suffix="+" />
            </div>
            <div className="text-zinc-500 text-sm uppercase tracking-widest">Foto (174GB)</div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto bg-gradient-to-br from-accent to-accent/60 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-accent/20"
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <Camera className="w-96 h-96 -rotate-12 -translate-x-20 -translate-y-20 text-white" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black mb-8 relative z-10 text-white uppercase">SIAP UNTUK BERGABUNG?</h2>
          <p className="text-white/80 text-lg md:text-xl mb-12 max-w-2xl mx-auto relative z-10">
            Jangan lewatkan kesempatan untuk menjadi bagian dari perubahan positif. Daftar sekarang juga!
          </p>
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-accent px-10 py-5 rounded-2xl font-black text-lg hover:bg-zinc-100 transition-all inline-block relative z-10 shadow-xl"
          >
            Daftar Sekarang
          </motion.a>
        </motion.div>
      </section>

    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
