import { Routes } from '@angular/router';
import { LoginComponent } from '../app/pages/login/login';
import { RegisterComponent } from '../app/pages/register/register';
import { LandingPage } from './layout/landing-page/landing-page';
import { MainLayout } from './layout/main-layout/main-layout';
import { AdminHomeComponent } from './components/admin-home/admin-home';
import { EmployeeHomeComponent } from './components/employee-home/employee-home';
import { AdminTable } from './components/admin-table/admin-table';
import { EmployeeTable } from './components/employee-table/employee-table';

export const routes: Routes = [
  { path: '', component: LandingPage, },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'main', component: MainLayout,  children: [
      { 
        path: 'admin-table', component: AdminTable 
      },
      { 
        path: 'employee-table', component: EmployeeTable 
      }
  ]},

  { path: 'employee-home', component: EmployeeHomeComponent},
  { path: 'admin-home', component: AdminHomeComponent},
];