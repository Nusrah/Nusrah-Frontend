import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { CampaignsComponent } from './pages/campaigns/campaigns';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { AboutComponent } from './pages/about/about';
import { ContactComponent } from './pages/contact/contact';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';
import { VolunteerDashboardComponent } from './pages/volunteer-dashboard/volunteer-dashboard';
import { DonateComponent } from './pages/donate/donate';
import { adminGuard, volunteerGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'campaigns', component: CampaignsComponent },
  { path: 'donate/:id', component: DonateComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'volunteer', component: VolunteerDashboardComponent, canActivate: [volunteerGuard] },
  { path: '**', redirectTo: '' }
];