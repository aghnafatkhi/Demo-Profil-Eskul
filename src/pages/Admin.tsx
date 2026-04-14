import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Save, LogOut, AlertCircle, CheckCircle2, 
  Image as ImageIcon, Film, Users, Calendar, ExternalLink, X, Edit2, Upload, Link as LinkIcon, Download, Wallet
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { resizeImage } from '../lib/imageUtils';
import ImageCropper from '../components/ImageCropper';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

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
}

interface Project {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  category?: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
  kelas?: string;
  email: string;
  photoUrl: string;
  portfolio?: { id: string, title: string, link: string, thumbnailUrl?: string, votes?: number }[];
}

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  displayName?: string;
  createdAt?: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  timestamp: any;
  status: string;
}

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'projects' | 'members' | 'admins' | 'attendance'>('events');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceFilterDate, setAttendanceFilterDate] = useState<string>('');
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isResetSkillsModalOpen, setIsResetSkillsModalOpen] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [batchPreview, setBatchPreview] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ collection: string, id: string } | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [featuredPhotosPreview, setFeaturedPhotosPreview] = useState<string[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<{ id: string, title: string, link: string, thumbnailUrl?: string, votes?: number }[]>([]);
  const [memberSkills, setMemberSkills] = useState<string[]>([]);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [featuredPhotosDragActive, setFeaturedPhotosDragActive] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setPreviewUrl(editingItem.coverImage || editingItem.thumbnailUrl || editingItem.photoUrl || '');
      setFeaturedPhotosPreview(editingItem.featuredPhotos || []);
      setPortfolioItems(editingItem.portfolio || []);
      setMemberSkills(editingItem.skills || []);
    } else {
      setPreviewUrl('');
      setFeaturedPhotosPreview([]);
      setPortfolioItems([]);
      setMemberSkills([]);
    }
  }, [editingItem]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/login');
      return;
    }

    if (authLoading || !user || !isAdmin) return;

    setLoading(true);

    // Fetch Data
    const unsubEvents = onSnapshot(query(collection(db, 'events'), orderBy('date', 'desc')), (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
      if (error.message.includes('insufficient permissions')) {
        setMessage({ type: 'error', text: 'Izin ditolak saat mengambil data acara.' });
      }
    });

    const unsubProjects = onSnapshot(query(collection(db, 'projects'), orderBy('title', 'asc')), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Member[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserProfile[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), orderBy('timestamp', 'desc')), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })) as AttendanceRecord[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
      setLoading(false);
    });

    return () => {
      unsubEvents();
      unsubProjects();
      unsubMembers();
      unsubUsers();
      unsubAttendance();
    };
  }, [user, authLoading, isAdmin, navigate]);

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setMessage({ type: 'success', text: `Role berhasil diubah menjadi ${newRole}!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal mengubah role: ' + err.message });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const exportAttendanceToCSV = () => {
    const filteredAttendance = attendance.filter(a => {
      const matchesSearch = a.userName.toLowerCase().includes(searchQuery.toLowerCase());
      const date = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const matchesDate = !attendanceFilterDate || date.toISOString().split('T')[0] === attendanceFilterDate;
      const matchesStatus = attendanceFilterStatus === 'Semua' || a.status === attendanceFilterStatus;
      return matchesSearch && matchesDate && matchesStatus;
    });

    if (filteredAttendance.length === 0) {
      setMessage({ type: 'error', text: 'Tidak ada data untuk diekspor.' });
      return;
    }

    const headers = ['Nama', 'User ID', 'Waktu', 'Status'];
    const rows = filteredAttendance.map(a => [
      a.userName,
      a.userId,
      a.timestamp?.toDate ? a.timestamp.toDate().toLocaleString() : new Date(a.timestamp).toLocaleString(),
      a.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_presensi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { collection: collectionName, id } = deleteConfirm;
    try {
      await deleteDoc(doc(db, collectionName, id));
      setMessage({ type: 'success', text: 'Item berhasil dihapus!' });
      setDeleteConfirm(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal menghapus: ' + err.message });
      setDeleteConfirm(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // Ensure image URL is from preview if drag-and-dropped
    if (activeTab === 'events') {
      data.coverImage = previewUrl;
      // Ensure optional fields are handled correctly for rules
      if (!data.googleDriveLink) data.googleDriveLink = "";
      if (!data.description) data.description = "";
    }
    if (activeTab === 'projects') {
      data.thumbnailUrl = previewUrl;
      if (!data.description) data.description = "";
      if (!data.category) data.category = "";
    }
    if (activeTab === 'members') {
      data.photoUrl = previewUrl;
      data.featuredPhotos = featuredPhotosPreview;
      data.portfolio = portfolioItems;
      data.skills = memberSkills;
      if (!data.bio) data.bio = "";
      if (!data.kelas) data.kelas = "";
      if (!data.instagram) data.instagram = "";
      if (!data.phone) data.phone = "";
      if (!data.tiktok) data.tiktok = "";
      if (!data.youtube) data.youtube = "";
      if (!data.joinYear) data.joinYear = "";
      if (!data.favoriteGear) data.favoriteGear = "";
    }

    if (!previewUrl) {
      setMessage({ type: 'error', text: 'Gambar/Foto wajib diisi!' });
      setSaving(false);
      return;
    }

    try {
      console.log(`Saving to ${activeTab}:`, data);
      if (editingItem) {
        await updateDoc(doc(db, activeTab, editingItem.id), data);
        setMessage({ type: 'success', text: 'Berhasil diperbarui!' });
      } else {
        await addDoc(collection(db, activeTab), data);
        setMessage({ type: 'success', text: 'Berhasil ditambahkan!' });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Error saving data:", err);
      let errorText = 'Gagal menyimpan: ' + err.message;
      if (err.message.includes('insufficient permissions')) {
        errorText = 'Gagal menyimpan: Izin ditolak. Pastikan Anda login sebagai admin.';
      }
      setMessage({ type: 'error', text: errorText });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetAllSkills = async () => {
    setLoading(true);
    try {
      const membersSnap = await getDocs(collection(db, 'members'));
      const updatePromises = membersSnap.docs.map(memberDoc => 
        updateDoc(doc(db, 'members', memberDoc.id), { skills: [] })
      );
      await Promise.all(updatePromises);
      setMessage({ type: 'success', text: `Berhasil menghapus skill dari ${membersSnap.size} anggota!` });
      setIsResetSkillsModalOpen(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal mereset skill: ' + err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const parseBatchInput = (input: string) => {
    const lines = input.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const [name, email, role, kelas] = line.split('|').map(s => s.trim());
      return { name, email, role: role || 'Anggota', kelas: kelas || '' };
    }).filter(m => m.name && m.email);
  };

  useEffect(() => {
    setBatchPreview(parseBatchInput(batchInput));
  }, [batchInput]);

  const handleBatchAddMembers = async () => {
    const membersToAdd = batchPreview;
    if (membersToAdd.length === 0) return;
    
    setLoading(true);
    let added = 0;
    let skipped = 0;
    
    try {
      for (const member of membersToAdd) {
        const q = query(collection(db, 'members'), where('email', '==', member.email));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          await addDoc(collection(db, 'members'), {
            name: member.name,
            email: member.email,
            role: member.role,
            kelas: member.kelas,
            photoUrl: `https://picsum.photos/seed/${encodeURIComponent(member.name)}/200/200`
          });
          added++;
        } else {
          skipped++;
        }
      }
      setMessage({ type: 'success', text: `Berhasil menambahkan ${added} anggota! (${skipped} dilewati karena email sudah ada)` });
      setIsBatchModalOpen(false);
      setBatchInput('');
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal menambahkan batch: ' + err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFeaturedPhotosDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setFeaturedPhotosDragActive(true);
    } else if (e.type === "dragleave") {
      setFeaturedPhotosDragActive(false);
    }
  };

  const handleFeaturedPhotosDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFeaturedPhotosDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (featuredPhotosPreview.length + files.length > 8) {
        setMessage({ type: 'error', text: 'Maksimal 8 foto unggulan.' });
        return;
      }
      const newPhotos = await Promise.all(files.map(file => resizeImage(file, 1600)));
      setFeaturedPhotosPreview([...featuredPhotosPreview, ...newPhotos]);
    }
  };

  const handleFeaturedPhotosFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (featuredPhotosPreview.length + files.length > 8) {
        setMessage({ type: 'error', text: 'Maksimal 8 foto unggulan.' });
        return;
      }
      const newPhotos = await Promise.all(files.map(file => resizeImage(file, 1600)));
      setFeaturedPhotosPreview([...featuredPhotosPreview, ...newPhotos]);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBase64: string) => {
    setPreviewUrl(croppedImageBase64);
    setCropImageSrc(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">{authLoading ? 'Memeriksa autentikasi...' : 'Memuat panel admin...'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen pt-32 pb-20 px-6 font-sans transition-colors duration-300">
      {/* Crop Modal */}
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImageSrc(null)}
          aspectRatio={activeTab === 'members' ? 3 / 4 : 16 / 9}
        />
      )}

      {/* Reset Skills Modal */}
      <AnimatePresence>
        {isResetSkillsModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetSkillsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl"
            >
              <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-2xl w-fit mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-center mb-4 text-zinc-900 dark:text-white">Reset Semua Skill?</h2>
              <p className="text-zinc-500 text-center mb-8">
                Tindakan ini akan menghapus semua pilihan keahlian dari profil seluruh anggota. Anggota harus memilih ulang keahlian mereka.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsResetSkillsModalOpen(false)}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold py-4 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleResetAllSkills}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20"
                >
                  Ya, Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 text-zinc-900 dark:text-white">PANEL <span className="text-accent">ADMIN</span></h1>
            <p className="text-zinc-500 dark:text-zinc-500">Kelola konten website organisasi secara langsung.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-4 w-full md:w-auto justify-start md:justify-end">
            {activeTab === 'members' && (
              <>
                <button
                  onClick={() => setIsResetSkillsModalOpen(true)}
                  className="flex-1 md:flex-none bg-red-600/10 hover:bg-red-600/20 text-red-600 px-4 md:px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-red-600/20 text-xs md:text-sm"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  Reset Semua Skill
                </button>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="flex-1 md:flex-none bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-4 md:px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-800 text-xs md:text-sm"
                >
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                  Batch Tambah
                </button>
              </>
            )}
            {activeTab === 'admins' && (
              <div className="flex-1 md:flex-none bg-zinc-100 dark:bg-zinc-900 text-zinc-500 px-4 md:px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 text-xs md:text-sm">
                <Users className="w-4 h-4 md:w-5 md:h-5" />
                Admin Default Aktif
              </div>
            )}
            {activeTab !== 'admins' && activeTab !== 'attendance' && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setPreviewUrl('');
                  setIsModalOpen(true);
                }}
                className="flex-1 md:flex-none bg-accent hover:bg-accent/90 text-white px-4 md:px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/20 text-xs md:text-sm"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                Tambah {activeTab === 'events' ? 'Acara' : activeTab === 'projects' ? 'Project' : 'Anggota'}
              </button>
            )}
            <button
              onClick={() => auth.signOut()}
              className="flex-1 md:flex-none bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-4 md:px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-800 text-xs md:text-sm"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              Keluar
            </button>
          </div>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Acara</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white">{events.length}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Project</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white">{projects.length}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Anggota</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white">{members.length}</p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Kehadiran Hari Ini</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white">
              {attendance.filter(a => {
                const date = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                return date.toDateString() === new Date().toDateString();
              }).length}
            </p>
          </div>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md p-4 rounded-2xl flex items-center gap-4 border shadow-2xl",
              message.type === 'success' ? "bg-white dark:bg-zinc-900 border-green-500 text-green-600 dark:text-green-500" : "bg-white dark:bg-zinc-900 border-red-500 text-red-600 dark:text-red-500"
            )}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
            <span className="font-medium text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100 shrink-0"><X className="w-4 h-4" /></button>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap md:flex-nowrap gap-2 mb-8 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-full md:w-fit mx-auto md:mx-0">
          <button
            onClick={() => { setActiveTab('events'); setSearchQuery(''); }}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'events' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Calendar className="w-4 h-4 shrink-0" /> Galeri Acara
          </button>
          <button
            onClick={() => { setActiveTab('projects'); setSearchQuery(''); }}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'projects' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Film className="w-4 h-4 shrink-0" /> Project Video
          </button>
          <button
            onClick={() => { setActiveTab('members'); setSearchQuery(''); }}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'members' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Users className="w-4 h-4 shrink-0" /> Daftar Anggota
          </button>
          <button
            onClick={() => { setActiveTab('attendance'); setSearchQuery(''); }}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'attendance' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Kehadiran
          </button>
          <button
            onClick={() => { setActiveTab('admins'); setSearchQuery(''); }}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'admins' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Edit2 className="w-4 h-4 shrink-0" /> Kelola Admin
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari di ${activeTab === 'events' ? 'acara' : activeTab === 'projects' ? 'project' : activeTab === 'members' ? 'anggota' : activeTab === 'attendance' ? 'kehadiran' : 'admin'}...`}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 px-6 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'events' && events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase())).map(event => (
            <div key={event.id} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden group shadow-sm hover:shadow-xl transition-all">
              <div className="h-40 relative">
                <img src={event.coverImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button onClick={() => { setEditingItem(event); setPreviewUrl(event.coverImage); setIsModalOpen(true); }} className="p-3 bg-white text-black rounded-full hover:bg-accent hover:text-white transition-all shadow-xl"><Edit2 className="w-5 h-5" /></button>
                  <button onClick={() => setDeleteConfirm({ collection: 'events', id: event.id })} className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-xl"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-1 truncate text-zinc-900 dark:text-white">{event.title}</h3>
                <p className="text-zinc-500 text-xs mb-4">{event.date}</p>
              </div>
            </div>
          ))}

          {activeTab === 'projects' && projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())).map(project => (
            <div key={project.id} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden group shadow-sm hover:shadow-xl transition-all">
              <div className="h-40 relative">
                <img src={project.thumbnailUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button onClick={() => { setEditingItem(project); setPreviewUrl(project.thumbnailUrl); setIsModalOpen(true); }} className="p-3 bg-white text-black rounded-full hover:bg-accent hover:text-white transition-all shadow-xl"><Edit2 className="w-5 h-5" /></button>
                  <button onClick={() => setDeleteConfirm({ collection: 'projects', id: project.id })} className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-xl"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-1 truncate text-zinc-900 dark:text-white">{project.title}</h3>
                <p className="text-accent text-[10px] font-black uppercase tracking-widest">{project.category}</p>
              </div>
            </div>
          ))}

          {activeTab === 'members' && members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase())).map(member => (
            <div key={member.id} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex items-center gap-4 group shadow-sm hover:shadow-xl transition-all">
              <img src={member.photoUrl} className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-zinc-800" referrerPolicy="no-referrer" />
              <div className="flex-grow min-w-0">
                <h3 className="font-bold truncate text-zinc-900 dark:text-white">{member.name}</h3>
                <p className="text-zinc-500 text-xs truncate">{member.email}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingItem(member); setPreviewUrl(member.photoUrl); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-accent transition-all"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteConfirm({ collection: 'members', id: member.id })} className="p-2 text-zinc-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {activeTab === 'attendance' && (
            <div className="col-span-full space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Total Kehadiran</p>
                  <p className="text-4xl font-black text-zinc-900 dark:text-white">{attendance.length}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Total Hadir Hari Ini</p>
                  <p className="text-4xl font-black text-zinc-900 dark:text-white">
                    {attendance.filter(a => {
                      const date = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                      return date.toDateString() === new Date().toDateString();
                    }).length}
                  </p>
                </div>
              </div>

              {/* Filters & Export */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Filter Tanggal</label>
                    <input 
                      type="date" 
                      value={attendanceFilterDate}
                      onChange={(e) => setAttendanceFilterDate(e.target.value)}
                      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Filter Status</label>
                    <select 
                      value={attendanceFilterStatus}
                      onChange={(e) => setAttendanceFilterStatus(e.target.value)}
                      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent transition-all font-bold"
                    >
                      <option value="Semua">Semua Status</option>
                      <option value="Hadir">Hadir</option>
                      <option value="Izin">Izin</option>
                      <option value="Sakit">Sakit</option>
                    </select>
                  </div>
                  {(attendanceFilterDate || attendanceFilterStatus !== 'Semua') && (
                    <button 
                      onClick={() => { setAttendanceFilterDate(''); setAttendanceFilterStatus('Semua'); }}
                      className="mt-5 text-xs font-bold text-accent hover:underline"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={exportAttendanceToCSV}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-accent dark:hover:bg-accent hover:text-white dark:hover:text-white px-6 py-3 rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Ekspor CSV
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Nama Anggota</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Waktu</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.filter(a => {
                        const matchesSearch = a.userName.toLowerCase().includes(searchQuery.toLowerCase());
                        const date = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                        const matchesDate = !attendanceFilterDate || date.toISOString().split('T')[0] === attendanceFilterDate;
                        const matchesStatus = attendanceFilterStatus === 'Semua' || a.status === attendanceFilterStatus;
                        return matchesSearch && matchesDate && matchesStatus;
                      }).map(record => (
                        <tr key={record.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="font-bold text-zinc-900 dark:text-white">{record.userName}</p>
                          <p className="text-[10px] text-zinc-500">{record.userId}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleString() : new Date(record.timestamp).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                            {record.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => setDeleteConfirm({ collection: 'attendance', id: record.id })}
                            className="p-2 text-zinc-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'admins' && users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
            <div key={u.id} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex items-center gap-4 group shadow-sm hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-xl">
                {u.email[0].toUpperCase()}
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="font-bold truncate text-zinc-900 dark:text-white">{u.displayName || 'User'}</h3>
                <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                <span className={cn(
                  "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter mt-1",
                  u.role === 'admin' ? "bg-accent text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                )}>
                  {u.role}
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToggleAdmin(u.id, u.role)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    u.role === 'admin' ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300" : "bg-accent text-white hover:bg-accent/90"
                  )}
                >
                  {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                </button>
                {u.email !== user?.email && (
                  <button 
                    onClick={() => setDeleteConfirm({ collection: 'users', id: u.id })}
                    className="p-3 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                    title="Hapus Admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {((activeTab === 'events' && events.length === 0) || 
          (activeTab === 'projects' && projects.length === 0) || 
          (activeTab === 'members' && members.length === 0) ||
          (activeTab === 'attendance' && attendance.length === 0) ||
          (activeTab === 'admins' && users.length === 0)) && (
          <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem]">
            <Plus className="w-12 h-12 text-zinc-300 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500">Belum ada data. Klik tombol tambah untuk memulai.</p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          <div
            className="relative w-full max-w-xl mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden"
          >
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">{editingItem ? 'Edit' : 'Tambah'} {activeTab === 'events' ? 'Acara' : activeTab === 'projects' ? 'Project' : 'Anggota'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-900 dark:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto overflow-x-hidden p-6 custom-scrollbar overscroll-contain">
                <form onSubmit={handleSave} className="space-y-5">
                {activeTab === 'events' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Judul Acara</label>
                      <input name="title" defaultValue={editingItem?.title} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Tanggal Acara
                        </label>
                        <div className="relative">
                          <input 
                            name="date" 
                            type="date" 
                            defaultValue={editingItem?.date} 
                            required 
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all [color-scheme:light] dark:[color-scheme:dark]" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Thumbnail / Cover</label>
                        <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={cn(
                            "relative border-2 border-dashed rounded-xl transition-all overflow-hidden group",
                            dragActive ? "border-accent bg-accent/5" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-accent"
                          )}
                        >
                          {previewUrl ? (
                            <div className="relative aspect-video">
                              <img src={previewUrl} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <label className="cursor-pointer p-2 bg-white text-black rounded-lg hover:bg-accent hover:text-white transition-all">
                                  <Upload className="w-4 h-4" />
                                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                </label>
                                <button type="button" onClick={() => setPreviewUrl('')} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
                              <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Drop atau Klik</span>
                              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" /> URL Gambar (Opsional)
                      </label>
                      <input 
                        type="text"
                        value={previewUrl}
                        onChange={(e) => setPreviewUrl(e.target.value)}
                        placeholder="https://i.imgur.com/..." 
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all text-xs" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Link Google Drive</label>
                      <input name="googleDriveLink" defaultValue={editingItem?.googleDriveLink} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Deskripsi</label>
                      <textarea name="description" defaultValue={editingItem?.description} rows={2} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                    </div>
                  </>
                )}

                {activeTab === 'projects' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Judul Project</label>
                      <input name="title" defaultValue={editingItem?.title} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Kategori</label>
                        <input name="category" defaultValue={editingItem?.category} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Thumbnail Project</label>
                        <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={cn(
                            "relative border-2 border-dashed rounded-xl transition-all overflow-hidden group",
                            dragActive ? "border-accent bg-accent/5" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-accent"
                          )}
                        >
                          {previewUrl ? (
                            <div className="relative aspect-video">
                              <img src={previewUrl} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <label className="cursor-pointer p-2 bg-white text-black rounded-lg hover:bg-accent hover:text-white transition-all">
                                  <Upload className="w-4 h-4" />
                                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                </label>
                                <button type="button" onClick={() => setPreviewUrl('')} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
                              <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Drop atau Klik</span>
                              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" /> URL Thumbnail (Opsional)
                      </label>
                      <input 
                        type="text"
                        value={previewUrl}
                        onChange={(e) => setPreviewUrl(e.target.value)}
                        placeholder="https://i.imgur.com/..." 
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all text-xs" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">URL Video (YouTube)</label>
                      <input name="videoUrl" defaultValue={editingItem?.videoUrl} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Deskripsi</label>
                      <textarea name="description" defaultValue={editingItem?.description} rows={2} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                    </div>
                  </>
                )}

                {activeTab === 'members' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nama Lengkap</label>
                      <input name="name" defaultValue={editingItem?.name} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email</label>
                        <input name="email" type="email" defaultValue={editingItem?.email} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Kelas</label>
                        <input name="kelas" defaultValue={editingItem?.kelas} placeholder="Contoh: X-1, XI-IPA" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Instagram</label>
                        <input name="instagram" defaultValue={editingItem?.instagram} placeholder="Username tanpa @" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">No. WhatsApp</label>
                        <input name="phone" defaultValue={editingItem?.phone} placeholder="08..." className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">TikTok</label>
                        <input name="tiktok" defaultValue={editingItem?.tiktok} placeholder="Username tanpa @" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">YouTube</label>
                        <input name="youtube" defaultValue={editingItem?.youtube} placeholder="Link Channel" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Tahun Bergabung</label>
                        <input name="joinYear" defaultValue={editingItem?.joinYear} placeholder="Contoh: 2023" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Peralatan Favorit</label>
                        <input name="favoriteGear" defaultValue={editingItem?.favoriteGear} placeholder="Contoh: Sony A7III" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Bio / Tentang Saya</label>
                      <textarea name="bio" defaultValue={editingItem?.bio} rows={3} placeholder="Ceritakan sedikit tentang anggota ini..." className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all resize-none" />
                    </div>
                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Galeri Foto Unggulan</label>
                        <button 
                          type="button" 
                          onClick={() => document.getElementById('featured-photos-input')?.click()}
                          className="text-accent text-xs font-bold flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Tambah Foto
                        </button>
                        <input type="file" id="featured-photos-input" multiple accept="image/*" className="hidden" onChange={handleFeaturedPhotosFileChange} />
                      </div>
                      
                      <div 
                        onDragEnter={handleFeaturedPhotosDrag}
                        onDragLeave={handleFeaturedPhotosDrag}
                        onDragOver={handleFeaturedPhotosDrag}
                        onDrop={handleFeaturedPhotosDrop}
                        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${featuredPhotosDragActive ? 'border-accent bg-accent/5' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-accent'}`}
                      >
                        <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 mb-2">Drag & drop foto ke sini</p>
                      </div>
                      
                      {featuredPhotosPreview.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                          {featuredPhotosPreview.map((photo, index) => (
                            <div key={index} className="relative group rounded-lg overflow-hidden aspect-video border border-zinc-200 dark:border-zinc-800">
                              <img src={photo} alt={`Featured ${index}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={() => {
                                  const newPhotos = [...featuredPhotosPreview];
                                  newPhotos.splice(index, 1);
                                  setFeaturedPhotosPreview(newPhotos);
                                }} className="p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Role Utama</label>
                        <input name="role" defaultValue={editingItem?.role} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Foto Profil (PNG Transparan)</label>
                        <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={cn(
                            "relative border-2 border-dashed rounded-xl transition-all overflow-hidden group h-32",
                            dragActive ? "border-accent bg-accent/5" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-accent"
                          )}
                        >
                          {previewUrl ? (
                            <div className="relative h-full">
                              <img src={previewUrl} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <label className="cursor-pointer p-2 bg-white text-black rounded-lg hover:bg-accent hover:text-white transition-all">
                                  <Upload className="w-4 h-4" />
                                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                </label>
                                <button type="button" onClick={() => setPreviewUrl('')} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                              <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Drop Foto</span>
                              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" /> URL Foto (Opsional)
                      </label>
                      <input 
                        type="text"
                        value={previewUrl}
                        onChange={(e) => setPreviewUrl(e.target.value)}
                        placeholder="https://i.imgur.com/..." 
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all text-xs" 
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-accent/20"
                >
                  {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingItem ? 'Simpan Perubahan' : 'Tambah Data'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Batch Add Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsBatchModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white">Batch Tambah Anggota</h2>
                  <p className="text-xs text-zinc-500">Impor banyak anggota sekaligus dengan format teks.</p>
                </div>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-900 dark:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
              {/* Input Section */}
              <div className="flex-1 p-6 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto">
                <div className="mb-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-2">Format Input</label>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                    Nama | Email | Role | Kelas
                  </div>
                  <button 
                    onClick={() => setBatchInput("Aghna | aghna@example.com | Ketua | XII-IPA\nBudi | budi@example.com | Anggota | XI-IPS")}
                    className="mt-2 text-[10px] text-accent font-bold hover:underline"
                  >
                    Gunakan Contoh
                  </button>
                </div>
                <textarea
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder="Contoh:&#10;Aghna | aghna@example.com | Ketua | XII-IPA&#10;Budi | budi@example.com | Anggota | XI-IPS"
                  className="w-full h-64 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-accent transition-all font-mono text-sm resize-none"
                />
              </div>

              {/* Preview Section */}
              <div className="flex-1 p-6 bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Preview ({batchPreview.length})</label>
                  {batchPreview.length > 0 && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase">Valid</span>}
                </div>
                
                <div className="space-y-2">
                  {batchPreview.length > 0 ? (
                    batchPreview.map((m, i) => (
                      <div key={i} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                          {m.name[0]}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs font-bold truncate text-zinc-900 dark:text-white">{m.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{m.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-accent">{m.role}</p>
                          <p className="text-[10px] text-zinc-400">{m.kelas}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-xs">Data akan muncul di sini</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-white dark:bg-zinc-900">
              <button onClick={() => setIsBatchModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-sm">Batal</button>
              <button
                onClick={handleBatchAddMembers}
                disabled={batchPreview.length === 0 || loading}
                className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-accent/20 text-sm flex items-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Proses Impor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          <div
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl z-10 p-8 text-center"
          >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-zinc-900 dark:text-white tracking-tight">
                Hapus {deleteConfirm?.collection === 'members' ? 'Anggota' : deleteConfirm?.collection === 'events' ? 'Acara' : deleteConfirm?.collection === 'attendance' ? 'Catatan Kehadiran' : deleteConfirm?.collection === 'users' ? 'Admin' : 'Project'}?
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus {deleteConfirm?.collection === 'members' ? 'anggota' : deleteConfirm?.collection === 'events' ? 'acara' : deleteConfirm?.collection === 'attendance' ? 'catatan kehadiran' : deleteConfirm?.collection === 'users' ? 'admin' : 'project'} ini dari database?
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
