
import { Product, Order, PromoCode, OrderStatus, SupportSession, SupportMessage, AdminLoginHistory, UserProfile, Notification, Review, SupportSender } from '../types';

const API_BASE = '/api/db';

// Helper for API calls
const api = {
  get: async (path: string) => {
    const res = await fetch(`${API_BASE}${path}`);
    return res.json();
  },
  post: async (collection: string, data: any) => {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  put: async (collection: string, id: string, data: any) => {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  delete: async (collection: string, id: string) => {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  }
};

// Polling intervals for "subscriptions"
const POLL_INTERVAL = 2000;

export const subscribeToProducts = (callback: (data: Product[]) => void) => {
  const poll = async () => {
    const db = await api.get('');
    callback(db.products || []);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const subscribeToOrders = (isAdmin: boolean, userId: string | null, callback: (data: Order[]) => void) => {
  const poll = async () => {
    const db = await api.get('');
    let orders = db.orders || [];
    if (!isAdmin && userId) {
      orders = orders.filter((o: Order) => o.userId === userId);
    } else if (!isAdmin && !userId) {
      orders = [];
    }
    callback(orders);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const subscribeToPromos = (callback: (data: PromoCode[]) => void) => {
  const poll = async () => {
    const db = await api.get('');
    callback(db.promos || []);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const subscribeToSupportSessions = (callback: (data: SupportSession[]) => void) => {
  const poll = async () => {
    const db = await api.get('');
    callback(db.support_sessions || []);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const subscribeToSupportMessages = (sessionId: string, callback: (data: SupportMessage[]) => void) => {
  const poll = async () => {
    const db = await api.get('');
    const messages = (db.support_messages || []).filter((m: SupportMessage) => m.sessionId === sessionId);
    callback(messages);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const subscribeToNotifications = (userId: string, callback: (data: Notification[]) => void) => {
  const poll = async () => {
    const db = await api.get('');
    const notifs = (db.notifications || []).filter((n: Notification) => n.userId === userId);
    callback(notifs);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const subscribeToLoginHistory = (isAdmin: boolean, callback: (data: AdminLoginHistory[]) => void) => {
  if (!isAdmin) {
    callback([]);
    return () => {};
  }
  const poll = async () => {
    const db = await api.get('');
    callback(db.admin_login_history || []);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const subscribeToSessionStatus = (id: string, callback: (exists: boolean) => void) => {
  const poll = async () => {
    const db = await api.get('');
    const exists = (db.admin_login_history || []).some((h: any) => h.id === id);
    callback(exists);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

// Database Mutations
export const dbAddProduct = (product: Product) => api.post('products', product);
export const dbDeleteProduct = (id: string) => api.delete('products', id);
export const dbUpdateProductStock = (id: string, newStock: number) => api.put('products', id, { stock: newStock });

export const dbAddOrder = (order: Order) => api.post('orders', order);
export const dbUpdateOrderStatus = (id: string, status: OrderStatus) => api.put('orders', id, { status });
export const dbClearAllOrders = async () => {
  await fetch(`${API_BASE}/orders`, { method: 'DELETE' });
};

export const dbAddPromo = (promo: PromoCode) => api.post('promos', promo);
export const dbUpdatePromo = (promo: PromoCode) => api.put('promos', promo.id, promo);
export const dbDeletePromo = (id: string) => api.delete('promos', id);

export const dbAddSupportSession = async (session: Omit<SupportSession, 'id'>) => {
  const res = await api.post('support_sessions', session);
  return res.id;
};

export const dbAddSupportMessage = async (message: Omit<SupportMessage, 'id'>) => {
  await api.post('support_messages', message);
  // Update session timestamp
  const db = await api.get('');
  const session = (db.support_sessions || []).find((s: any) => s.id === message.sessionId);
  if (session) {
    await api.put('support_sessions', session.id, { lastMessageTimestamp: message.timestamp });
  }
};

export const dbCloseSupportSession = (id: string) => api.put('support_sessions', id, { status: 'CLOSED' });
export const dbDeleteSupportSession = (id: string) => api.delete('support_sessions', id);

export const dbAddNotification = (notification: Omit<Notification, 'id'>) => api.post('notifications', notification);
export const markNotificationRead = (id: string) => api.put('notifications', id, { read: true });

export const dbAddLoginHistory = async (history: Omit<AdminLoginHistory, 'id'>) => {
  const res = await api.post('admin_login_history', history);
  return res.id;
};
export const dbDeleteLoginHistory = (id: string) => api.delete('admin_login_history', id);

export const dbUpdateUserProfile = (uid: string, data: Partial<UserProfile>) => api.put('users', uid, data);
export const dbGetUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const db = await api.get('');
  return (db.users || []).find((u: any) => u.uid === uid) || null;
};

export const subscribeToProductReviews = (productId: string, callback: (data: Review[]) => void) => {
  const poll = async () => {
    const db = await api.get('');
    const reviews = (db.reviews || []).filter((r: Review) => r.productId === productId);
    callback(reviews);
  };
  poll();
  const interval = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(interval);
};

export const dbAddReview = (review: Omit<Review, 'id'>) => api.post('reviews', review);

// Auth Mock (since we removed Firebase Auth)
export const auth = {
  currentUser: null
};

export const signInWithGoogle = async (): Promise<UserProfile | null> => {
  // Mock Google Login for local use
  const mockUser: UserProfile = {
    uid: 'local-user-' + Math.random().toString(36).substr(2, 5),
    email: 'user@local.test',
    displayName: 'Local User',
    photoURL: 'https://ui-avatars.com/api/?name=Local+User',
    isProfileComplete: true
  };
  
  // Save to local users
  const db = await api.get('');
  if (!(db.users || []).some((u: any) => u.uid === mockUser.uid)) {
    await api.post('users', mockUser);
  }
  
  localStorage.setItem('local_user', JSON.stringify(mockUser));
  window.location.reload(); // Trigger re-render
  return mockUser;
};

export const signOutUser = async () => {
  localStorage.removeItem('local_user');
  window.location.reload();
};

export const dbLogout = signOutUser;

export const dbLoginAdmin = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdminEmail = normalizedEmail === 'admin@elkafrawy' || normalizedEmail === 'admin@elkafrawy.com';
  
  if (isAdminEmail && password === 'elkafrawy_admin') {
    const adminUser = { uid: 'local-admin', email: normalizedEmail, displayName: 'Admin' };
    localStorage.setItem('local_user', JSON.stringify(adminUser));
    return adminUser;
  }
  throw new Error("Invalid credentials");
};

// Utils
export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  const saved = localStorage.getItem('local_user');
  if (saved) {
    callback(JSON.parse(saved));
  } else {
    callback(null);
  }
  return () => {};
};

export const setGlobalErrorCallback = (cb: (msg: string) => void) => {};
