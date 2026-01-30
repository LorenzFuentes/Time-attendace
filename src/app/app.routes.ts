import { Routes } from '@angular/router';
import { LoginComponent } from '../app/pages/login/login';
import { RegisterComponent } from '../app/pages/register/register';
import { LandingPage } from './layout/landing-page/landing-page';
import { MainLayout } from './layout/main-layout/main-layout';
import { AdminHomeComponent } from './components/admin-home/admin-home';
import { AdminTable } from './components/admin-table/admin-table';
import { EmployeeTableComponent } from './components/employee-table/employee-table';
import { Charts } from './components/charts/charts';
import { Calendar } from './components/calendar/calendar';
import { AttendanceTable } from './components/attendance.table/attendance.table';
import { LeaveTable } from './components/leave.table/leave.table';
export const routes: Routes = [
  { path: '', component: LandingPage, },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'main', component: MainLayout,  children: [
      { path: 'admin-table', component: AdminTable },
      { path: 'employee-table', component: EmployeeTableComponent},
      { path: 'chart', component: Charts},
      { path: 'admin-home', component: AdminHomeComponent},
      { path: 'calendar', component: Calendar},
      { path: 'attendance', component: AttendanceTable},
      { path: 'leave', component: LeaveTable}
  ]},
];