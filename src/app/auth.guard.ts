import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// UI-only guard: it hides pages from the wrong role but does not protect the API
const roleGuard = (required: string): CanActivateFn => () => {
  const router = inject(Router);
  const token = localStorage.getItem('token') || '';
  const role = (localStorage.getItem('role') || '').trim().toLowerCase();
  if (!token || !role) {
    router.navigate(['/login']);
    return false;
  }
  if (!role.includes(required)) {
    router.navigate(['/']);
    return false;
  }
  return true;
};

export const adminGuard: CanActivateFn = roleGuard('admin');
export const volunteerGuard: CanActivateFn = roleGuard('volunteer');