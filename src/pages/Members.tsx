import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';

const roleOrder: Record<string, number> = {
  'komisi': 1,
  'sekbid': 2,
  'ketua': 3,
  'wakil ketua': 4,
  'sekretaris': 5,
  'bendahara': 6,
  'div': 7,
  'anggota': 8
};

const getRolePriority = (role: string) => {
  const normalizedRole = role.toLowerCase();
  for (const [key, value] of Object.entries(roleOrder)) {
    if (normalizedRole.includes(key)) return value;
  }
  return 99; // Default for unknown roles
};

const ALL_SKILLS = [
  'Cinematography', 
  'Directing', 
  'Editing', 
  'Screenwriting', 
  'Lighting', 
  'Sound Design', 
  'Production Design', 
  'Color Grading'
];

interface PortfolioItem {
  title: string;
  link: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
  kelas?: string;
  photoUrl: string;
  email?: string;
  instagram?: string;
  phone?: string;
  skills?: string[];
  featuredPhotos?: string[];
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      
      // Sort by role priority first, then by name
      memberData.sort((a, b) => {
        const priorityA = getRolePriority(a.role);
        const priorityB = getRolePriority(b.role);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.name.localeCompare(b.name);
      });

      setMembers(memberData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching members:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.kelas && member.kelas.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSkill = !selectedSkill || (member.skills && member.skills.includes(selectedSkill));
    
    return matchesSearch && matchesSkill;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen pt-32 pb-20 px-6 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto">
        <header className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="bg-accent/10 border border-accent/20 px-4 py-1 rounded-full text-accent text-xs font-bold uppercase tracking-widest">
              Tim Kreatif Kami
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white">PORTOFOLIO <span className="text-accent">ANGGOTA</span></h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Kenali lebih dekat para talenta di balik layar organisasi kami.
            </p>
          </motion.div>
        </header>

        {/* Search & Filter Bar */}
        <div className="max-w-4xl mx-auto mb-16 space-y-8">
          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Cari nama, role, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full py-4 pl-14 pr-6 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all shadow-sm hover:shadow-md"
            />
            {searchTerm && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {filteredMembers.length} Hasil
              </div>
            )}
          </div>

          {/* Skills Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setSelectedSkill(null)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                selectedSkill === null 
                  ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" 
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-accent/50"
              )}
            >
              Semua Keahlian
            </button>
            {ALL_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                  selectedSkill === skill 
                    ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" 
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-accent/50"
                )}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-zinc-500 font-medium">Memuat data tim...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredMembers.map((member, index) => {
              const firstName = member.name.split(' ')[0];
              const nameParts = member.name.split(' ');

              return (
                <div
                  key={member.id}
                  onClick={() => navigate(`/member/${member.id}`)}
                  className="group cursor-pointer rounded-[2rem] overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-accent/50 hover:shadow-2xl transition-all relative flex flex-col h-[450px]"
                >
                  {/* Top Section (Orange + Black Bar + Photo) */}
                  <div className="relative h-[300px] w-full bg-[#F59E0B] overflow-hidden shrink-0">
                    {/* Black Bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-black z-10 flex items-center justify-center">
                      <div className="text-white font-black text-5xl tracking-tight -rotate-90 whitespace-nowrap capitalize max-w-[280px] truncate">
                        {firstName}
                      </div>
                    </div>
                    
                    {/* Transparent PNG Photo - Fixed sizing and position */}
                    <div className="absolute bottom-0 right-[-20px] h-[185%] w-[calc(100%-10px)] z-20">
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-full h-full object-contain object-bottom group-hover:scale-105 transition-transform duration-500 origin-bottom drop-shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Bottom Section (White with Text) */}
                  <div className="relative flex-grow bg-white dark:bg-zinc-900 p-6 z-30 flex flex-col justify-end overflow-hidden">
                    {/* Subtle Background Pattern (Large Circles) */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-[#F59E0B]/10 dark:bg-[#F59E0B]/5"></div>
                    <div className="absolute left-10 -top-10 w-32 h-32 rounded-full bg-[#F59E0B]/10 dark:bg-[#F59E0B]/5"></div>
                    
                    <div className="relative z-10 flex justify-between items-end h-full w-full overflow-hidden">
                      <div className="flex flex-col justify-end min-w-0 w-full">
                        <h3 className="text-2xl font-black leading-none text-black dark:text-white mb-2 capitalize truncate w-full" title={member.name}>
                          {member.name}
                        </h3>
                        <p className="text-[#F59E0B] font-bold text-sm mb-1 uppercase truncate">{member.role}</p>
                        {member.kelas && (
                          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm mb-2 truncate">{member.kelas}</p>
                        )}
                        {member.phone && (
                          <p className="text-black dark:text-white font-black text-lg truncate">{member.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-zinc-50 dark:bg-zinc-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Anggota tidak ditemukan</h3>
            <p className="text-zinc-500">Coba gunakan kata kunci pencarian lain.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
