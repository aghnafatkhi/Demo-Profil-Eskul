import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, limit, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Briefcase, Award, Plus, Trash2, Save, LogOut, AlertCircle, CheckCircle2, Image as ImageIcon, ExternalLink, Upload, Wallet, CreditCard, Clock } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import { resizeImage } from '../lib/imageUtils';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface Member {
  id: string;
  name: string;
  role: string;
  kelas?: string;
  photoUrl: string;
  email?: string;
  instagram?: string;
  phone?: string;
  uid?: string;
  skills?: string[];
  bio?: string;
  joinYear?: string;
  tiktok?: string;
  youtube?: string;
  favoriteGear?: string;
  featuredPhotos?: string[];
  voteCount?: number;
}

const ALLOWED_SKILLS = ['Cinematography', 'Directing', 'Editing', 'Screenwriting', 'Lighting', 'Sound Design', 'Production Design', 'Color Grading'];

export default function Dashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletePhotoIndex, setDeletePhotoIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();

  // Form State
  const [role, setRole] = useState('');
  const [kelas, setKelas] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [joinYear, setJoinYear] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [favoriteGear, setFavoriteGear] = useState('');
  const [featuredPhotos, setFeaturedPhotos] = useState<string[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (featuredPhotos.length + files.length > 8) {
        setMessage({ type: 'error', text: 'Maksimal 8 foto unggulan.' });
        return;
      }
      const newPhotos = await Promise.all(files.map(file => resizeImage(file, 1600)));
      setFeaturedPhotos([...featuredPhotos, ...newPhotos]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (featuredPhotos.length + files.length > 8) {
        setMessage({ type: 'error', text: 'Maksimal 8 foto unggulan.' });
        return;
      }
      const newPhotos = await Promise.all(files.map(file => resizeImage(file, 1600)));
      setFeaturedPhotos([...featuredPhotos, ...newPhotos]);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (authLoading || !user) return;

    // Find member by UID or Email
    const q = query(
      collection(db, 'members'),
      where('email', '==', user.email),
      limit(1)
    );

    const unsubscribeMember = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const data = { id: docData.id, ...docData.data() } as Member;
        
        setMember(data);
        
        // Only initialize form state if it's currently empty/default
        // This ensures we don't overwrite user's unsaved changes while still populating on first load
        setLoading(prevLoading => {
          if (prevLoading) {
            setRole(data.role || '');
            setKelas(data.kelas || '');
            setPhotoUrl(data.photoUrl || '');
            setInstagram(data.instagram || '');
            setPhone(data.phone || '');
            setSkills(Array.isArray(data.skills) ? data.skills.filter(s => ALLOWED_SKILLS.includes(s)) : []);
            setBio(data.bio || '');
            setJoinYear(data.joinYear || '');
            setTiktok(data.tiktok || '');
            setYoutube(data.youtube || '');
            setFavoriteGear(data.favoriteGear || '');
            setFeaturedPhotos(Array.isArray(data.featuredPhotos) ? data.featuredPhotos : []);
          }
          return false;
        });
        
        setVoteCount(data.voteCount || 0);

        // Link UID if not already linked
        if (!data.uid) {
          updateDoc(doc(db, 'members', docData.id), { uid: user.uid });
        }
      } else {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching member profile:", error);
      setLoading(false);
    });

    return () => unsubscribeMember();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !loading && isAdmin && !member) {
      navigate('/admin');
    }
  }, [authLoading, loading, isAdmin, member, navigate]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'members', member.id), {
        role,
        kelas,
        photoUrl,
        instagram,
        phone,
        skills,
        bio,
        joinYear,
        tiktok,
        youtube,
        favoriteGear,
        featuredPhotos,
        voteCount
      });
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal memperbarui profil. ' + err.message });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCropComplete = (croppedImageBase64: string) => {
    setPhotoUrl(croppedImageBase64);
    setCropImageSrc(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4 transition-colors">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">{authLoading ? 'Memeriksa autentikasi...' : 'Memuat dashboard...'}</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center px-6 pt-20 transition-colors">
        <div className="max-w-md w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[2.5rem] text-center shadow-2xl">
          <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-2xl w-fit mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black mb-4 text-zinc-900 dark:text-white">Profil Tidak Ditemukan</h2>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            Email Anda ({auth.currentUser?.email}) belum terdaftar sebagai anggota di sistem kami. 
            Silakan hubungi Admin untuk menambahkan profil Anda.
          </p>
          <div className="flex flex-col gap-4">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-accent/20"
              >
                <User className="w-5 h-5" />
                Buka Admin Panel
              </button>
            )}
            <button
              onClick={() => auth.signOut()}
              className="w-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen pt-32 pb-20 px-6 transition-colors">
      {/* Crop Modal */}
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImageSrc(null)}
          aspectRatio={3 / 4}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-6">
            <img
              src={photoUrl || 'https://picsum.photos/seed/user/200/200'}
              alt={member.name}
              className="w-24 h-24 object-cover rounded-3xl border-4 border-zinc-100 dark:border-zinc-900 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">{member.name}</h1>
              <p className="text-accent font-bold uppercase tracking-widest text-sm">{member.role}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-accent/20"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              Simpan Perubahan
            </button>
            <button
              onClick={() => auth.signOut()}
              className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-6 py-4 rounded-xl font-bold flex items-center gap-3 transition-all border border-zinc-200 dark:border-zinc-800"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        </header>

        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "mb-10 p-6 rounded-2xl flex items-center gap-4 border",
              message.type === 'success' ? "bg-green-600/10 border-green-600/20 text-green-600 dark:text-green-500" : "bg-red-600/10 border-red-600/20 text-red-600 dark:text-red-500"
            )}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-medium">{message.text}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Basic Info */}
          <div className="lg:col-span-1 space-y-10">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-8">
                <User className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Informasi Dasar</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Jabatan / Spesialisasi</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Contoh: Editor, Kameramen"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Kelas</label>
                  <input
                    type="text"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="Contoh: X-1, XI-IPA"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Instagram</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="Username tanpa @"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">TikTok</label>
                  <input
                    type="text"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="Username tanpa @"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">YouTube</label>
                  <input
                    type="text"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="Link Channel YouTube"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08..."
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Tahun Bergabung</label>
                  <input
                    type="text"
                    value={joinYear}
                    onChange={(e) => setJoinYear(e.target.value)}
                    placeholder="Contoh: 2023"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Peralatan Favorit</label>
                  <input
                    type="text"
                    value={favoriteGear}
                    onChange={(e) => setFavoriteGear(e.target.value)}
                    placeholder="Contoh: Sony A7III, Lensa 50mm"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Bio / Tentang Saya</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Ceritakan sedikit tentang diri Anda..."
                    rows={4}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Keahlian</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSkills([])}
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                  >
                    Reset
                  </button>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-md",
                    skills.length === 3 ? "bg-accent/20 text-accent" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  )}>
                    {skills.length}/3 Terpilih
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {ALLOWED_SKILLS.map((skill) => {
                  const isSelected = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSkills(skills.filter(s => s !== skill));
                        } else if (skills.length < 3) {
                          setSkills([...skills, skill]);
                        } else {
                          setMessage({ type: 'error', text: 'Maksimal pilih 3 keahlian.' });
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        isSelected 
                          ? "bg-accent/10 border-accent text-zinc-900 dark:text-white" 
                          : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-accent/50"
                      )}
                    >
                      <span className="font-medium">{skill}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-200 dark:border-zinc-800" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Featured Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 md:p-10 rounded-3xl h-full">
              <div className="flex items-center gap-3 mb-10">
                <ImageIcon className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Galeri Foto Unggulan</h3>
              </div>
              
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-6 ${dragActive ? 'border-accent bg-accent/5' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-accent/50'}`}
              >
                <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 mb-2">Drag & drop foto ke sini, atau</p>
                <label className="cursor-pointer inline-block bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                  Pilih File
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {featuredPhotos.map((photo, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden aspect-square border border-zinc-200 dark:border-zinc-800">
                    <img src={photo} alt={`Featured ${index}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => setDeletePhotoIndex(index)} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {featuredPhotos.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
                  <ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium">Belum ada foto unggulan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Delete Photo Confirmation */}
      <AnimatePresence>
        {deletePhotoIndex !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletePhotoIndex(null)}
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
                Apakah Anda yakin ingin menghapus foto ini dari profil Anda?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeletePhotoIndex(null)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-4 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const newPhotos = [...featuredPhotos];
                    newPhotos.splice(deletePhotoIndex, 1);
                    setFeaturedPhotos(newPhotos);
                    setDeletePhotoIndex(null);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
