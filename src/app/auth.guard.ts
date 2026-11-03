import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// UI-only guard: it hides pages from the wrong role, the real protection is the API checking the token.
// It also drops tokens that have already expired so the user lands on /login instead of seeing a page full of 401s.
const isExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const roleGuard = (required: string): CanActivateFn => () => {
  const router = inject(Router);
  const token = localStorage.getItem('token') || '';
  const role = (localStorage.getItem('role') || '').trim().toLowerCase();
  if (!token || !role || isExpired(token)) {
    ['token', 'role', 'user_profile'].forEach(k => localStorage.removeItem(k));
    router.navigate(['/login']);
    return false;
  }
  if (role !== required) {
    router.navigate(['/']);
    return false;
  }
  return true;
};

export const adminGuard: CanActivateFn = roleGuard('admin');
export const volunteerGuard: CanActivateFn = roleGuard('volunteer');