import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const request = token && req.url.includes('/api/') ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(
    catchError(err => {
      if (err.status === 401 && token && !req.url.includes('/api/auth/')) {
        ['token', 'role', 'user_profile'].forEach(k => localStorage.removeItem(k));
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};