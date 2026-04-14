import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, Briefcase, Award, Instagram, Phone, Mail, Youtube, Video, Calendar, Camera, Heart } from 'lucide-react';
import Lightbox from '../components/Lightbox';
import { cn, getHash } from '../lib/utils';

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
  bio?: string;
  joinYear?: string;
  tiktok?: string;
  youtube?: string;
  favoriteGear?: string;
  featuredPhotos?: string[];
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [likedPhotos, setLikedPhotos] = useState<string[]>([]); // Stores photoHashes

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'members', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setMember({ id: docSnap.id, ...docSnap.data() } as Member);
        } else {
          console.log("No such member!");
        }
      } catch (error) {
        console.error("Error fetching member:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [id]);

  useEffect(() => {
    if (!auth.currentUser || !id) {
      setLikedPhotos([]);
      return;
    }

    console.log("Setting up likes listener for user:", auth.currentUser.uid, "and member:", id);

    // Query likes by userId
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter by memberId client-side
      const likes = snapshot.docs
        .filter(doc => doc.data().memberId === id)
        .map(doc => doc.data().photoHash || getHash(doc.data().photoUrl));
      
      console.log("Current liked photo hashes for this member:", likes);
      setLikedPhotos(likes);
    }, (error) => {
      console.error("Error listening to likes:", error);
    });

    return () => unsubscribe();
  }, [id, auth.currentUser]);

  const handleLike = async (photoUrl: string) => {
    if (!auth.currentUser) {
      alert("Silakan login terlebih dahulu untuk menyukai foto.");
      return;
    }
    
    const photoHash = getHash(photoUrl);
    const likeId = `${auth.currentUser.uid}_${photoHash}`;
    const likeRef = doc(db, 'likes', likeId);
    
    const isLiked = likedPhotos.includes(photoHash);
    
    console.log(`[handleLike] photoHash: ${photoHash}, isLiked: ${isLiked}, userId: ${auth.currentUser.uid}`);
    
    try {
      if (isLiked) {
        console.log(`[handleLike] Deleting like document: ${likeId}`);
        await deleteDoc(likeRef);
        console.log("[handleLike] Like removed from Firestore successfully");
      } else {
        console.log(`[handleLike] Creating like document: ${likeId}`);
        await setDoc(likeRef, { 
          photoUrl, 
          photoHash,
          userId: auth.currentUser.uid, 
          memberId: id,
          createdAt: new Date().toISOString()
        });
        console.log("[handleLike] Like added to Firestore successfully");
      }
    } catch (error) {
      console.error("[handleLike] Error toggling like:", error);
    }
  };

  useEffect(() => {
    console.log("[MemberDetail] Current likedPhotos state:", likedPhotos);
  }, [likedPhotos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Memuat profil anggota...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Anggota tidak ditemukan</h2>
        <button onClick={() => navigate('/members')} className="text-accent hover:underline">Kembali ke daftar anggota</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen pt-32 pb-20 px-6 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-zinc-500 hover:text-accent font-bold mb-10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Kembali
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Left Column - Profile Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-1"
          >
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[3rem] p-8 flex flex-col items-center text-center border border-zinc-200 dark:border-zinc-800 shadow-xl relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute top-0 left-0 w-full h-40 bg-[#F59E0B] opacity-20"></div>
              
              <div className="relative w-48 h-48 mb-6 z-10">
                <div className="absolute inset-0 bg-accent rounded-full blur-2xl opacity-20" />
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-full h-full object-cover rounded-full border-4 border-white dark:border-zinc-900 relative z-10 shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <h1 className="text-3xl font-black mb-2 text-zinc-900 dark:text-white relative z-10 capitalize break-words w-full px-2">{member.name}</h1>
              <p className="text-accent font-bold text-sm uppercase tracking-widest mb-2 relative z-10">{member.role}</p>
              {member.kelas && (
                <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm mb-8 relative z-10">{member.kelas}</p>
              )}
              {!member.kelas && <div className="mb-8"></div>}
              
              <div className="flex flex-col gap-3 w-full mb-8 relative z-10">
                {member.instagram && (
                  <a href={`https://instagram.com/${member.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-accent hover:text-white text-zinc-600 dark:text-zinc-300 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                    <Instagram className="w-5 h-5" /> @{member.instagram}
                  </a>
                )}
                {member.tiktok && (
                  <a href={`https://tiktok.com/@${member.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-black hover:text-white text-zinc-600 dark:text-zinc-300 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                    <Video className="w-5 h-5" /> @{member.tiktok}
                  </a>
                )}
                {member.youtube && (
                  <a href={member.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-600 dark:text-zinc-300 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                    <Youtube className="w-5 h-5" /> YouTube
                  </a>
                )}
                {member.phone && (
                  <a href={`https://wa.me/${member.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-green-500 hover:text-white text-zinc-600 dark:text-zinc-300 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                    <Phone className="w-5 h-5" /> {member.phone}
                  </a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-blue-500 hover:text-white text-zinc-600 dark:text-zinc-300 py-3 rounded-xl text-sm font-bold transition-all shadow-sm">
                    <Mail className="w-5 h-5" /> Email
                  </a>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2 relative z-10">
                {member.skills && member.skills.length > 0 ? (
                  member.skills.slice(0, 3).map((skill, i) => (
                    <span key={i} className="text-xs bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-4 py-2 rounded-full font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700 shadow-sm">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400 italic">Belum ada keahlian dipilih</span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 space-y-10"
          >
            {/* About Section */}
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[3rem] p-10 border border-zinc-200 dark:border-zinc-800 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                  <Award className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Tentang</h2>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed mb-6">
                {member.bio || `Anggota aktif organisasi kami yang berfokus pada bidang ${member.role}. Berkontribusi dalam berbagai project kreatif dan terus mengembangkan kemampuan di bidangnya.`}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                {member.joinYear && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bergabung Sejak</p>
                      <p className="text-zinc-900 dark:text-white font-medium">{member.joinYear}</p>
                    </div>
                  </div>
                )}
                {member.favoriteGear && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Peralatan Favorit</p>
                      <p className="text-zinc-900 dark:text-white font-medium">{member.favoriteGear}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Featured Photos Section */}
            {member.featuredPhotos && member.featuredPhotos.length > 0 && (
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[3rem] p-10 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Galeri Unggulan</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {member.featuredPhotos.map((photo, i) => (
                    <div key={i} className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm group">
                      <div className="cursor-pointer" onClick={() => setLightboxSrc(photo)}>
                        <img 
                          src={photo} 
                          alt={`Featured ${i + 1}`} 
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <button 
                        onClick={() => handleLike(photo)}
                        className={cn(
                          "absolute top-2 right-2 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-full transition-colors",
                          likedPhotos.includes(getHash(photo)) ? "text-accent" : "text-zinc-500 hover:text-accent"
                        )}
                      >
                        <Heart className={cn("w-5 h-5", likedPhotos.includes(getHash(photo)) && "fill-current")} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </motion.div>
  );
}
