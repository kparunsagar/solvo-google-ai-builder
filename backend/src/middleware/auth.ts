// MyUrbanDaily — Firebase Auth ID Token Verification & Role-Based Access Control (RBAC)
// Verifies Firebase ID Tokens via firebase-admin and enforces custom claims

import { Request, Response, NextFunction } from 'express';
import { firestore } from '../db/firestore.js';
import { db } from '../db/database.js';
import { sendError } from '../utils/response.js';

export type UserRole = 'customer' | 'technician' | 'provider' | 'admin' | 'ops' | 'support' | 'security_auditor';

export interface AuthenticatedUser {
  uid: string;
  phone?: string;
  email?: string;
  name?: string;
  role: UserRole;
  claims: Record<string, any>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHORIZED', 'Missing or invalid Authorization header. Expected Bearer <FirebaseIdToken>', 401);
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (!token) {
    return sendError(res, 'UNAUTHORIZED', 'Bearer token string is empty', 401);
  }

  try {
    const verified = await firestore.verifyToken(token);
    if (!verified) {
      return sendError(res, 'INVALID_TOKEN', 'Firebase Auth ID token verification failed or expired', 401);
    }

    // Resolve or hydrate role from Firestore / memory database if claims did not specify one
    if (!verified.role || verified.role === 'customer') {
      const dbUser = db.users.find(u => u.id === verified.uid || (verified.phone && u.phone === verified.phone));
      if (dbUser && dbUser.role) {
        verified.role = dbUser.role as UserRole;
      }
    }

    req.user = verified;
    next();
  } catch (err: any) {
    return sendError(res, 'AUTH_ERROR', err?.message || 'Authentication error while verifying Firebase token', 401);
  }
}

/**
 * Role-Based Access Control (RBAC) middleware using Firebase custom claims.
 * Allowed roles: customer, technician (provider), admin, ops, support.
 * 'admin' has superuser access to all routes.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication token required before role verification', 401);
    }

    const userRole = req.user.role;
    const isAllowed =
      userRole === 'admin' || // Admins always have superuser access
      allowedRoles.includes(userRole) ||
      (userRole === 'provider' && allowedRoles.includes('technician')) ||
      (userRole === 'technician' && allowedRoles.includes('provider'));

    if (!isAllowed) {
      return sendError(
        res,
        'FORBIDDEN',
        `Access denied. Requires one of [${allowedRoles.join(', ')}]. Current role: '${userRole}'`,
        403
      );
    }

    next();
  };
}
