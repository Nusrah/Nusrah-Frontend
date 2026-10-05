import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Reads the role saved in localStorage at login time and normalizes it,
 * the same way login.ts does when it writes it.
 */
function getStoredRole(): string {
  const role = localStorage.getItem('role') || '';
  return role.trim().toLowerCase();
}

function getStoredToken(): string {
  return localStorage.getItem('token') || '';
}

/**
 * Blocks access to admin-only routes.
 * - No token/role in localStorage (not logged in) -> redirect to /login
 * - Logged in but wrong role (e.g. volunteer)      -> redirect to home
 * - Logged in as admin                             -> allow
 */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = getStoredToken();
  const role = getStoredRole();

  if (!token || !role) {
    router.navigate(['/login']);
    return false;
  }

  if (!role.includes('admin')) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

/**
 * Blocks access to volunteer-only routes.
 * - No token/role in localStorage (not logged in) -> redirect to /login
 * - Logged in but wrong role (e.g. admin)          -> redirect to home
 * - Logged in as volunteer                         -> allow
 */
export const volunteerGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = getStoredToken();
  const role = getStoredRole();

  if (!token || !role) {
    router.navigate(['/login']);
    return false;
  }

  if (!role.includes('volunteer')) {
    router.navigate(['/']);
    return false;
  }

  return true;
};