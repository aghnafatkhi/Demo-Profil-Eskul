import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubRole: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (unsubRole) unsubRole();
      
      if (u) {
        unsubRole = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role);
          } else {
            setUserRole('user');
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user role:", error);
          setUserRole('user');
          setLoading(false);
        });
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubRole) unsubRole();
    };
  }, []);

  const isAdmin = userRole === 'admin' || user?.email === 'aghna1011@gmail.com';

  return (
    <AuthContext.Provider value={{ user, userRole, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
