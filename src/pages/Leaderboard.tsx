import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, where, addDoc, serverTimestamp, orderBy, updateDoc, arrayUnion, arrayRemove, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Trophy, Heart, LayoutGrid, List, Download, X, Maximize2, ChevronLeft, ChevronRight, MessageCircle, Send, User, Upload, Trash2 } from 'lucide-react';
import { getHash, cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { resizeImage } from '../lib/imageUtils';

interface Member {
  id: string;
  name: string;
  photoUrl: string;
  featuredPhotos?: string[];
}

interface PhotoLike {
  photoUrl: string;
  likes: number;
  memberName: string;
  memberPhoto: string;
  photoHash: string;
  memberId: string;
}

interface Comment {
  id: string;
  userName: string;
  text: string;
  timestamp: any;
}

export default function Leaderboard() {
  const { isAdmin } = useAuth();
  const [leaderboard, setLeaderboard] = useState<PhotoLike[]>([]);
  const [allPhotos, setAllPhotos] = useState<PhotoLike[]>([]);
  const [likedPhotos, setLikedPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'leaderboard' | 'feed'>('feed');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoLike | null>(null);
  
  // Comment State
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [memberProfile, setMemberProfile] = useState<any>(null);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<PhotoLike | null>(null);

  // Get the most up-to-date data for the selected photo from the allPhotos array
  const currentSelectedPhoto = selectedPhoto 
    ? allPhotos.find(p => p.photoHash === selectedPhoto.photoHash) || selectedPhoto 
    : null;

  useEffect(() => {
    console.log("Setting up real-time leaderboard and feed listeners...");
    
    let members: Member[] = [];
    let likes: any[] = [];

    const updateData = () => {
      const likesMap: Record<string, number> = {};
      likes.forEach(like => {
        const hash = like.photoHash || getHash(like.photoUrl);
        likesMap[hash] = (likesMap[hash] || 0) + 1;
      });

      const photoLikes: PhotoLike[] = [];
      members.forEach(member => {
        member.featuredPhotos?.forEach(photoUrl => {
          const photoHash = getHash(photoUrl);
          photoLikes.push({
            photoUrl,
            likes: likesMap[photoHash] || 0,
            memberName: member.name,
            memberPhoto: member.photoUrl,
            photoHash,
            memberId: member.id
          });
        });
      });

      // Leaderboard: Top 10
      const sorted = [...photoLikes].sort((a, b) => b.likes - a.likes);
      setLeaderboard(sorted.slice(0, 10));

      // Feed: All photos (maybe shuffle or sort by date if available, but for now just all)
      setAllPhotos(photoLikes);
      setLoading(false);
    };

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      updateData();
    });

    const unsubLikes = onSnapshot(collection(db, 'likes'), (snapshot) => {
      likes = snapshot.docs.map(doc => doc.data());
      
      // Also update current user's likes if logged in
      if (auth.currentUser) {
        const userLikes = snapshot.docs
          .filter(doc => doc.data().userId === auth.currentUser?.uid)
          .map(doc => doc.data().photoHash || getHash(doc.data().photoUrl));
        setLikedPhotos(userLikes);
      }
      
      updateData();
    });

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Re-fetch likes to update likedPhotos for the new user
        const q = query(collection(db, 'likes'), where('userId', '==', user.uid));
        onSnapshot(q, (snapshot) => {
          const userLikes = snapshot.docs.map(doc => doc.data().photoHash || getHash(doc.data().photoUrl));
          setLikedPhotos(userLikes);
        });

        // Fetch member profile
        const memberQ = query(collection(db, 'members'), where('email', '==', user.email));
        const memberSnap = await getDocs(query(collection(db, 'members'), where('email', '==', user.email)));
        if (!memberSnap.empty) {
          setMemberProfile({ id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() });
        }
      } else {
        setLikedPhotos([]);
        setMemberProfile(null);
      }
    });

    return () => {
      unsubMembers();
      unsubLikes();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (selectedPhoto) {
      const q = query(
        collection(db, 'photo_comments', selectedPhoto.photoHash, 'comments'),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedComments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        setComments(fetchedComments);
      });
      return () => unsubscribe();
    } else {
      setComments([]);
      setShowComments(false);
    }
  }, [selectedPhoto]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto || !commentText.trim() || !guestName.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'photo_comments', selectedPhoto.photoHash, 'comments'), {
        userName: guestName,
        text: commentText,
        timestamp: serverTimestamp()
      });
      setCommentText('');
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !memberProfile) return;
    
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const base64 = await resizeImage(file, 1600);
      
      await updateDoc(doc(db, 'members', memberProfile.id), {
        featuredPhotos: arrayUnion(base64)
      });
      
      alert("Foto berhasil diunggah ke feed!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!deleteConfirm || !memberProfile) return;
    
    try {
      await updateDoc(doc(db, 'members', memberProfile.id), {
        featuredPhotos: arrayRemove(deleteConfirm.photoUrl)
      });
      setDeleteConfirm(null);
      setSelectedPhoto(null);
      alert("Foto berhasil dihapus.");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Gagal menghapus foto.");
    }
  };
  const handleLike = async (item: PhotoLike) => {
    if (!auth.currentUser) {
      alert("Silakan login terlebih dahulu untuk menyukai foto.");
      return;
    }
    
    const likeId = `${auth.currentUser.uid}_${item.photoHash}`;
    const likeRef = doc(db, 'likes', likeId);
    const isLiked = likedPhotos.includes(item.photoHash);
    
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, { 
          photoUrl: item.photoUrl, 
          photoHash: item.photoHash,
          userId: auth.currentUser.uid, 
          memberId: item.memberId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, '_blank');
    }
  };

  const handleNext = () => {
    if (!currentSelectedPhoto) return;
    const currentIndex = allPhotos.findIndex(p => p.photoHash === currentSelectedPhoto.photoHash);
    if (currentIndex < allPhotos.length - 1) {
      setSelectedPhoto(allPhotos[currentIndex + 1]);
    } else {
      setSelectedPhoto(allPhotos[0]); // Loop to start
    }
  };

  const handlePrev = () => {
    if (!currentSelectedPhoto) return;
    const currentIndex = allPhotos.findIndex(p => p.photoHash === currentSelectedPhoto.photoHash);
    if (currentIndex > 0) {
      setSelectedPhoto(allPhotos[currentIndex - 1]);
    } else {
      setSelectedPhoto(allPhotos[allPhotos.length - 1]); // Loop to end
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedPhoto(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, allPhotos]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
      }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Memuat data...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-zinc-950 min-h-screen pt-32 pb-20 px-6 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-accent/10 border border-accent/20 px-4 py-1 rounded-full text-accent text-xs font-bold uppercase tracking-widest inline-block mb-4"
          >
            Galeri & Peringkat
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mb-8"
          >
            EKSPLORASI <span className="text-accent">KARYA</span>
          </motion.h1>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
            {/* View Toggle */}
            <div className="flex justify-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-fit">
              <button 
                onClick={() => setViewMode('feed')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
                  viewMode === 'feed' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <LayoutGrid className="w-4 h-4" /> Feed Foto
              </button>
              <button 
                onClick={() => setViewMode('leaderboard')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
                  viewMode === 'leaderboard' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Trophy className="w-4 h-4" /> Leaderboard
              </button>
            </div>

            {/* Upload Button (Members Only) */}
            {memberProfile && (
              <label className="cursor-pointer flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-accent dark:hover:bg-accent hover:text-white dark:hover:text-white transition-all shadow-lg active:scale-95">
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Unggah Foto
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {viewMode === 'leaderboard' ? (
            <motion.div 
              key="leaderboard"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              layout
              className="max-w-3xl mx-auto space-y-4"
            >
              {leaderboard.map((item, i) => (
                <motion.div 
                  key={item.photoHash}
                  layout
                  variants={itemVariants}
                  className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-accent/50 transition-all group"
                >
                  <div className="text-2xl font-black text-zinc-400 w-12 text-center group-hover:text-accent transition-colors">#{i + 1}</div>
                  <Link to={`/member/${item.memberId}`} className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl">
                    <img 
                      src={item.photoUrl} 
                      alt="Photo" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      referrerPolicy="no-referrer" 
                    />
                  </Link>
                  <Link to={`/member/${item.memberId}`} className="flex-grow min-w-0 hover:text-accent transition-colors">
                    <p className="font-bold text-zinc-900 dark:text-white truncate" title={item.memberName}>{item.memberName}</p>
                  </Link>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLike(item)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold shrink-0 transition-all",
                      likedPhotos.includes(item.photoHash) ? "bg-accent text-white" : "bg-accent/10 text-accent hover:bg-accent/20"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", likedPhotos.includes(item.photoHash) && "fill-current")} /> {item.likes}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="feed"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {allPhotos.map((item, i) => (
                <motion.div 
                  key={item.photoHash}
                  variants={itemVariants}
                  className="relative bg-zinc-50 dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group shadow-sm hover:shadow-xl transition-all"
                >
                  <button 
                    onClick={() => setSelectedPhoto(item)}
                    className="relative aspect-square overflow-hidden block w-full text-left"
                  >
                    <img 
                      src={item.photoUrl} 
                      alt="Feed" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Maximize2 className="text-white w-8 h-8 scale-50 group-hover:scale-100 transition-transform duration-300" />
                    </div>
                  </button>
                  <button 
                    onClick={() => handleLike(item)}
                    className={cn(
                      "absolute top-4 right-4 p-3 rounded-2xl backdrop-blur-md transition-all active:scale-90 z-10",
                      likedPhotos.includes(item.photoHash) ? "bg-accent text-white" : "bg-white/20 text-white hover:bg-white/40"
                    )}
                  >
                    <Heart className={cn("w-6 h-6", likedPhotos.includes(item.photoHash) && "fill-current")} />
                  </button>
                  <div className="p-6 flex items-center justify-between">
                    <Link to={`/member/${item.memberId}`} className="flex items-center gap-3 min-w-0 hover:text-accent transition-colors group/member">
                      <img src={item.memberPhoto} className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 group-hover/member:border-accent transition-colors" referrerPolicy="no-referrer" />
                      <p className="font-bold text-sm text-zinc-900 dark:text-white truncate group-hover/member:text-accent">{item.memberName}</p>
                    </Link>
                    <div className="flex items-center gap-1 text-zinc-400 font-bold text-sm">
                      <Heart className="w-4 h-4 fill-current text-accent" /> {item.likes}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {currentSelectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl aspect-auto max-h-full flex flex-col items-center"
            >
              <div className="absolute top-0 right-0 -translate-y-full mb-4 flex gap-4">
                <button
                  onClick={() => handleDownload(currentSelectedPhoto.photoUrl, `photo-${currentSelectedPhoto.photoHash}.jpg`)}
                  className="p-3 bg-white/10 hover:bg-accent text-white rounded-2xl transition-all flex items-center gap-2 font-bold"
                >
                  <Download className="w-6 h-6" />
                  <span className="hidden md:inline">Download</span>
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-3 bg-white/10 hover:bg-red-500 text-white rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 flex items-center justify-center relative group/image">
                <img 
                  src={currentSelectedPhoto.photoUrl} 
                  alt="Full view" 
                  className="max-w-full max-h-[80vh] object-contain"
                  referrerPolicy="no-referrer"
                />

                {/* Navigation Buttons */}
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-accent text-white rounded-full backdrop-blur-md opacity-0 group-hover/image:opacity-100 transition-all active:scale-90"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-accent text-white rounded-full backdrop-blur-md opacity-0 group-hover/image:opacity-100 transition-all active:scale-90"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>

                {/* Delete Button (Owner or Admin) */}
                {(isAdmin || (memberProfile && memberProfile.id === currentSelectedPhoto.memberId)) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(currentSelectedPhoto); }}
                    className="absolute top-4 left-4 p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl backdrop-blur-md opacity-0 group-hover/image:opacity-100 transition-all"
                    title="Hapus Foto"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="mt-6 flex flex-col md:flex-row items-center justify-between w-full px-4 gap-6">
                <div className="flex items-center gap-6">
                  <Link 
                    to={`/member/${currentSelectedPhoto.memberId}`}
                    onClick={() => setSelectedPhoto(null)}
                    className="flex items-center gap-4 group"
                  >
                    <img src={currentSelectedPhoto.memberPhoto} className="w-12 h-12 rounded-full object-cover border-2 border-accent" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-black text-white text-lg group-hover:text-accent transition-colors">{currentSelectedPhoto.memberName}</p>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Lihat Profil</p>
                    </div>
                  </Link>

                  <button 
                    onClick={() => setShowComments(!showComments)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all",
                      showComments ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-bold">{comments.length} Komentar</span>
                  </button>
                </div>

                <button 
                  onClick={() => handleLike(currentSelectedPhoto)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all active:scale-95",
                    likedPhotos.includes(currentSelectedPhoto.photoHash) 
                      ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" 
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  <Heart className={cn("w-6 h-6", likedPhotos.includes(currentSelectedPhoto.photoHash) && "fill-current")} />
                  <span className="font-black text-xl">{currentSelectedPhoto.likes}</span>
                </button>
              </div>

              {/* Comments Section */}
              <AnimatePresence>
                {showComments && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full mt-8 bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
                  >
                    <div className="p-6 max-h-[40vh] overflow-y-auto custom-scrollbar space-y-4">
                      {comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-white text-sm">{comment.userName}</span>
                                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                                  {comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleDateString() : 'Baru saja'}
                                </span>
                              </div>
                              <p className="text-zinc-400 text-sm">{comment.text}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-500 text-center py-8">Belum ada komentar.</p>
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
                      <input
                        type="text"
                        placeholder="Nama"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-24 md:w-32 bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent"
                      />
                      <input
                        type="text"
                        placeholder="Tulis komentar..."
                        required
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-grow bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment}
                        className="bg-accent hover:bg-accent/90 text-white p-2 rounded-xl transition-all disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] shadow-2xl z-10 text-center"
            >
              <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-2xl w-fit mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black mb-4 text-zinc-900 dark:text-white tracking-tight">Hapus Foto?</h3>
              <p className="text-zinc-500 mb-8 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus foto ini dari feed?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-4 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeletePhoto}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
