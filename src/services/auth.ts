import { dbAuth, type UserRow } from "../lib/db";

export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

const toPublic = (u: UserRow): PublicUser => ({
  id: u.id,
  full_name: u.full_name,
  email: u.email,
  created_at: u.created_at,
});

export const authService = {
  async register(full_name: string, email: string, password: string): Promise<PublicUser> {
    const user = await dbAuth.register(full_name, email, password);
    dbAuth.createToken(user.id);
    return toPublic(user);
  },

  async login(email: string, password: string): Promise<PublicUser> {
    const user = await dbAuth.login(email, password);
    dbAuth.createToken(user.id);
    return toPublic(user);
  },

  async restore(): Promise<PublicUser | null> {
    const user = await dbAuth.restoreSession();
    return user ? toPublic(user) : null;
  },

  async logout(): Promise<void> {
    await dbAuth.logout();
  },
};
