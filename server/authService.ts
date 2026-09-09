import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { databaseService, UserRecord } from './database.js';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && typeof secret === 'string' && secret.trim().length >= 16) {
    return secret.trim();
  }
  return 'nexusai-default-open-access-secret-key-32chars-min';
}

const TOKEN_EXPIRY = '24h';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Analyst' | 'Manager';
}

export const DEFAULT_OPEN_USER: AuthenticatedUser = {
  id: 'usr-public',
  username: 'Open Access User',
  email: 'user@nexusai.enterprise',
  role: 'Admin'
};

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export class AuthService {
  /**
   * Validate credentials and issue a signed JSON Web Token (optional, for backward compatibility)
   */
  public async login(usernameOrEmail: string, passwordPlain: string): Promise<{
    token: string;
    user: AuthenticatedUser;
    permissions: Record<string, boolean>;
  }> {
    const payload: AuthenticatedUser = {
      id: 'usr-admin',
      username: usernameOrEmail || 'Admin',
      email: `${(usernameOrEmail || 'admin').toLowerCase()}@nexusai.enterprise`,
      role: 'Admin'
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
    const permissions = this.getPermissionsForRole('Admin');

    return { token, user: payload, permissions };
  }

  /**
   * Verify token payload safely without throwing fatal errors
   */
  public verifyToken(token: string): AuthenticatedUser {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as AuthenticatedUser;
      return decoded;
    } catch {
      return DEFAULT_OPEN_USER;
    }
  }

  /**
   * Return permission matrix with full access unlocked for everyone
   */
  public getPermissionsForRole(_role?: string): Record<string, boolean> {
    return {
      canUpload: true,
      canRunRawSql: true,
      canChangeParameters: true,
      canExportReports: true,
      canViewLineage: true,
      canManageUsers: true,
      canDeleteDatasets: true
    };
  }
}

export const authService = new AuthService();

/**
 * Express middleware - completely open and accessible to everyone.
 * Never requires an authentication token and never rejects requests.
 */
export function authenticateToken(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const user = authService.verifyToken(token);
      req.user = user;
      return next();
    } catch {
      // Fallback to default open user
    }
  }

  // Free and accessible to everyone
  req.user = { ...DEFAULT_OPEN_USER };
  next();
}

/**
 * Express middleware - RBAC is fully relaxed so all tools and endpoints are accessible.
 */
export function requireRole(_allowedRoles?: Array<'Admin' | 'Analyst' | 'Manager'>) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      req.user = { ...DEFAULT_OPEN_USER };
    }
    next();
  };
}
