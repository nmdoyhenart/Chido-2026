import { supabase } from '../lib/supabase';

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.log('SUPABASE LOGIN ERROR:', error);
      throw error;
    }

    console.log('SUPABASE LOGIN OK:', data.user?.email);

    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  },

  async register(
  nombre: string,
  email: string,
  password: string
  ) {
    
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        nombre: nombre.trim(),
        role: 'cliente',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  },
};