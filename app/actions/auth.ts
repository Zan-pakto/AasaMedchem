'use server';

import { sql } from '@/lib/db';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/db-setup';

export type ActionResponse = {
  success: boolean;
  error?: string;
  redirectTo?: string;
};

/**
 * Server Action for User Login
 */
export async function loginAction(formData: FormData): Promise<ActionResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    await ensureDbInitialized();
    // Look up the user
    const users = await sql`
      SELECT id, name, email, password_hash, role 
      FROM users 
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    if (users.length === 0) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const user = users[0];
    const isPasswordValid = verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Set cookie session
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'seller' | 'buyer',
    });

    return {
      success: true,
      redirectTo: user.role === 'admin' ? '/admin' : user.role === 'buyer' ? '/buyer' : '/seller',
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Server Action for User Registration
 */
export async function registerAction(formData: FormData): Promise<ActionResponse> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = (formData.get('role') as 'admin' | 'seller' | 'buyer') || 'seller';

  if (!name || !email || !password) {
    return { success: false, error: 'All fields are required.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    await ensureDbInitialized();
    // Check if email already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1
    `;

    if (existing.length > 0) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Hash password and save
    const passwordHash = hashPassword(password);
    const result = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, ${role})
      RETURNING id, name, email, role
    `;

    const newUser = result[0];

    // Set session cookie
    await setSessionCookie({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as 'admin' | 'seller' | 'buyer',
    });

    return {
      success: true,
      redirectTo: newUser.role === 'admin' ? '/admin' : newUser.role === 'buyer' ? '/buyer' : '/seller',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Failed to create account. Please try again.' };
  }
}

/**
 * Server Action for User Logout
 */
export async function logoutAction(): Promise<ActionResponse> {
  try {
    await clearSessionCookie();
    return { success: true, redirectTo: '/' };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Failed to log out.' };
  }
}
