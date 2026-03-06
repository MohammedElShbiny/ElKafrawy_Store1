
import { supabase } from '../supabaseClient';
import { Product, Order, PromoCode, OrderStatus, SupportSession, SupportMessage, AdminLoginHistory, UserProfile, Notification, Review } from '../types';

// --- User Profile ---

export const dbUpdateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const { error } = await supabase
    .from('users')
    .upsert({ uid, ...data }, { onConflict: 'uid' });
  
  if (error) console.error('Error updating profile:', error);
};

export const dbGetUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', uid)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data as UserProfile;
};

// --- Products ---

export const subscribeToProducts = (callback: (data: Product[]) => void) => {
  // Initial fetch
  supabase.from('products').select('*').then(({ data, error }) => {
    if (!error && data) callback(data as Product[]);
  });

  // Realtime subscription
  const subscription = supabase
    .channel('products_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      // Re-fetch all products on any change (simplest approach, can be optimized)
      supabase.from('products').select('*').then(({ data }) => {
        if (data) callback(data as Product[]);
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const dbAddProduct = async (product: Product) => {
  const { error } = await supabase.from('products').insert(product);
  if (error) console.error('Error adding product:', error);
};

export const dbDeleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) console.error('Error deleting product:', error);
};

export const dbUpdateProductStock = async (id: string, newStock: number) => {
  const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
  if (error) console.error('Error updating stock:', error);
};

// --- Orders ---

export const subscribeToOrders = (isAdmin: boolean, userId: string | null, callback: (data: Order[]) => void) => {
  const fetchOrders = () => {
    let query = supabase.from('orders').select('*').order('timestamp', { ascending: false });
    
    if (!isAdmin && userId) {
      query = query.eq('userId', userId);
    } else if (!isAdmin && !userId) {
      callback([]);
      return;
    }

    query.then(({ data, error }) => {
      if (!error && data) callback(data as Order[]);
    });
  };

  fetchOrders();

  const subscription = supabase
    .channel('orders_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      fetchOrders();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const dbAddOrder = async (order: Order) => {
  const { error } = await supabase.from('orders').insert(order);
  if (error) console.error('Error adding order:', error);
};

export const dbUpdateOrderStatus = async (id: string, status: OrderStatus) => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) console.error('Error updating order status:', error);
};

// --- Promos ---

export const subscribeToPromos = (callback: (data: PromoCode[]) => void) => {
  const fetchPromos = () => {
    supabase.from('promos').select('*').then(({ data, error }) => {
      if (!error && data) callback(data as PromoCode[]);
    });
  };

  fetchPromos();

  const subscription = supabase
    .channel('promos_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'promos' }, () => {
      fetchPromos();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const dbAddPromo = async (promo: PromoCode) => {
  const { error } = await supabase.from('promos').insert(promo);
  if (error) console.error('Error adding promo:', error);
};

export const dbUpdatePromo = async (promo: PromoCode) => {
  const { error } = await supabase.from('promos').update(promo).eq('id', promo.id);
  if (error) console.error('Error updating promo:', error);
};

export const dbDeletePromo = async (id: string) => {
  const { error } = await supabase.from('promos').delete().eq('id', id);
  if (error) console.error('Error deleting promo:', error);
};

// --- Support ---

export const subscribeToSupportSessions = (callback: (data: SupportSession[]) => void) => {
  const fetchSessions = () => {
    supabase.from('support_sessions').select('*').order('lastMessageTimestamp', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) callback(data as SupportSession[]);
      });
  };

  fetchSessions();

  const subscription = supabase
    .channel('sessions_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_sessions' }, () => {
      fetchSessions();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const subscribeToSupportMessages = (sessionId: string, callback: (data: SupportMessage[]) => void) => {
  const fetchMessages = () => {
    supabase.from('support_messages').select('*').eq('sessionId', sessionId).order('timestamp', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) callback(data as SupportMessage[]);
      });
  };

  fetchMessages();

  const subscription = supabase
    .channel(`messages_${sessionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `sessionId=eq.${sessionId}` }, () => {
      fetchMessages();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const dbAddSupportSession = async (session: Omit<SupportSession, 'id'>) => {
  const { data, error } = await supabase.from('support_sessions').insert(session).select().single();
  if (error) {
    console.error('Error adding session:', error);
    return 'error';
  }
  return data.id;
};

export const dbAddSupportMessage = async (message: Omit<SupportMessage, 'id'>) => {
  const { error } = await supabase.from('support_messages').insert(message);
  if (error) console.error('Error adding message:', error);
  
  // Update session timestamp
  await supabase.from('support_sessions').update({ lastMessageTimestamp: message.timestamp }).eq('id', message.sessionId);
};

// --- Notifications ---

export const subscribeToNotifications = (userId: string, callback: (data: Notification[]) => void) => {
  const fetchNotifs = () => {
    supabase.from('notifications').select('*').eq('userId', userId).order('timestamp', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) callback(data as Notification[]);
      });
  };

  fetchNotifs();

  const subscription = supabase
    .channel(`notifs_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${userId}` }, () => {
      fetchNotifs();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) console.error('Error marking read:', error);
};

// --- Auth ---

export const auth = supabase.auth; // Expose auth object if needed

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error signing out:', error);
};

export const dbLogout = signOutUser; // Alias

// --- Analytics & Error Handling ---

export const analytics = null; // Supabase doesn't have direct equivalent to Firebase Analytics in JS SDK

let globalErrorCallback: (msg: string) => void = () => {};
export const setGlobalErrorCallback = (cb: (msg: string) => void) => { globalErrorCallback = cb; };

// --- Admin Login History & Session ---

export const subscribeToLoginHistory = (isAdmin: boolean, callback: (data: AdminLoginHistory[]) => void) => {
  if (!isAdmin) {
    callback([]);
    return () => {};
  }

  const fetchHistory = () => {
    supabase.from('admin_login_history').select('*').order('timestamp', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) callback(data as AdminLoginHistory[]);
      });
  };

  fetchHistory();

  const subscription = supabase
    .channel('login_history')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_login_history' }, () => {
      fetchHistory();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const dbAddLoginHistory = async (history: Omit<AdminLoginHistory, 'id'>) => {
  const { data, error } = await supabase.from('admin_login_history').insert(history).select().single();
  if (error) console.error('Error adding login history:', error);
  return data ? data.id : null;
};

export const dbDeleteLoginHistory = async (id: string) => {
  const { error } = await supabase.from('admin_login_history').delete().eq('id', id);
  if (error) console.error('Error deleting login history:', error);
};

export const subscribeToSessionStatus = (id: string, callback: (exists: boolean) => void) => {
  // Simple check if record exists
  const checkSession = async () => {
    const { data, error } = await supabase.from('admin_login_history').select('id').eq('id', id).single();
    callback(!!data);
  };

  checkSession();
  
  // Realtime check
  const subscription = supabase
    .channel(`session_${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_login_history', filter: `id=eq.${id}` }, (payload) => {
      if (payload.eventType === 'DELETE') callback(false);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

// --- Utils ---
export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  // Initial session check
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user || null);
  });

  // Listen for changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return () => subscription.unsubscribe();
};
