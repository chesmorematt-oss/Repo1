import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.ts';
import {
  TOKEN_COOKIE_NAME,
  hashPassword,
  requireAuth,
  signToken,
  verifyPassword,
} from '../auth.ts';
import type { AuthenticatedRequest } from '../auth.ts';
import type { User } from '../../src/types.ts';

export const authRouter = Router();

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const xfProto = req.headers['x-forwarded-proto'];
  if (typeof xfProto === 'string') {
    return xfProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return false;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const https = isHttpsRequest(req);
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    partitioned: https,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 14,
  });
}

authRouter.get('/demo-accounts', (_req, res) => {
  const users = db
    .prepare(
      `SELECT id, name, email, role, title, department FROM users
       WHERE email IN ('zoning@independenceia.gov', 'inspector@independenceia.gov', 'hannah.miller@example.com')
       ORDER BY id ASC`
    )
    .all();
  res.json({ accounts: users });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db
    .prepare(
      'SELECT id, name, email, password_hash, role, title, department, created_at FROM users WHERE email = ?'
    )
    .get(String(email).trim()) as (User & { password_hash: string }) | undefined;

  if (!row) {
    res.status(401).json({
      error:
        'No account found for that email. Use "Create Account" above to register, or choose one of the instant demo accounts.',
    });
    return;
  }

  if (!verifyPassword(String(password), row.password_hash)) {
    res.status(401).json({
      error: 'Incorrect password. (For demo accounts, use password: Indee2026!)',
    });
    return;
  }

  const token = signToken(row.id, row.email);
  setSessionCookie(req, res, token);

  const { password_hash: _unused, ...user } = row;
  res.json({ user, token });
});

authRouter.post('/demo-login', (req, res) => {
  const requestedEmail = String(req.body?.email || 'zoning@independenceia.gov').trim();
  const allowedDemoEmails = new Set([
    'zoning@independenceia.gov',
    'inspector@independenceia.gov',
    'hannah.miller@example.com',
  ]);
  const targetEmail = allowedDemoEmails.has(requestedEmail)
    ? requestedEmail
    : 'zoning@independenceia.gov';

  const row = db
    .prepare('SELECT id, name, email, role, title, department, created_at FROM users WHERE email = ?')
    .get(targetEmail) as unknown as User | undefined;

  if (!row) {
    res.status(404).json({ error: 'Demo account not found.' });
    return;
  }

  const token = signToken(row.id, row.email);
  setSessionCookie(req, res, token);
  res.json({ user: row, token });
});

authRouter.post('/register', (req, res) => {
  const { name, email, password, role, title, department } = req.body || {};
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const validRoles = new Set(['admin', 'inspector', 'applicant']);
  const finalRole = validRoles.has(role) ? role : 'inspector';
  const defaultTitle =
    finalRole === 'admin'
      ? 'Planning & Zoning Administrator'
      : finalRole === 'applicant'
        ? 'Property Owner / Permit Applicant'
        : 'Zoning & Code Reviewer';
  const defaultDept =
    finalRole === 'applicant'
      ? 'Independence, IA Resident / Contractor'
      : 'City of Independence — Planning & Zoning';

  const passHash = hashPassword(String(password));
  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, title, department)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(name).trim(),
      cleanEmail,
      passHash,
      finalRole,
      String(title || defaultTitle).trim(),
      String(department || defaultDept).trim()
    );

  const userId = Number(result.lastInsertRowid);
  const user = db
    .prepare('SELECT id, name, email, role, title, department, created_at FROM users WHERE id = ?')
    .get(userId) as unknown as User;

  const token = signToken(user.id, user.email);
  setSessionCookie(req, res, token);
  res.status(201).json({ user, token });
});

authRouter.post('/logout', (req, res) => {
  const https = isHttpsRequest(req);
  res.clearCookie(TOKEN_COOKIE_NAME, {
    path: '/',
    sameSite: https ? 'none' : 'lax',
    secure: https,
    partitioned: https,
  });
  res.json({ ok: true });
});

authRouter.patch('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { name, title, department, role } = req.body || {};
  const validRoles = new Set(['admin', 'inspector', 'applicant']);

  const updatedName = name ? String(name).trim() : user.name;
  const updatedTitle = title ? String(title).trim() : user.title;
  const updatedDept = department ? String(department).trim() : user.department;
  const updatedRole = validRoles.has(role) ? role : user.role;

  db.prepare('UPDATE users SET name = ?, title = ?, department = ?, role = ? WHERE id = ?').run(
    updatedName,
    updatedTitle,
    updatedDept,
    updatedRole,
    user.id
  );

  const fresh = db
    .prepare('SELECT id, name, email, role, title, department, created_at FROM users WHERE id = ?')
    .get(user.id) as unknown as User;

  res.json({ user: fresh });
});
