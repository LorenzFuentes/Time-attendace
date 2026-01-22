import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzResultModule } from 'ng-zorro-antd/result';
import { AuthService } from '../../service/auth';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [
    CommonModule,
    NzBreadCrumbModule,
    NzIconModule,
    NzMenuModule,
    NzLayoutModule,
    NzAvatarModule,
    NzTagModule,
    NzCardModule,
    NzButtonModule,
    NzSpinModule,
    NzResultModule
  ],
  templateUrl: './admin-home.html',
  styleUrls: ['./admin-home.scss']
})
export class AdminHomeComponent implements OnInit {
  isCollapsed = false;
  adminCount = 0;
  employeeCount = 0;
  totalUsers = 0;
  isLoading = true;
  date = new Date()
  currentUser: any = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (this.currentUser) {
      this.handleUserLoaded();
    } else {
      this.loadUserFromStorage();
    }
    
    this.subscribeToUserUpdates();
  }

  private handleUserLoaded(): void {
    this.isLoading = false;
    this.loadUserCounts();
  }

  private loadUserFromStorage(): void {
    const userData = localStorage.getItem('currentUser');
    const userType = localStorage.getItem('currentUserType');
    
    if (userData) {
      this.currentUser = JSON.parse(userData);
      
      if (!this.currentUser.role && userType) {
        this.currentUser.role = userType;
      }
      
      this.handleUserLoaded();
    } else {
      this.isLoading = false;
    }
  }

  private subscribeToUserUpdates(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });
  }

  private loadUserCounts(): void {
    if (this.currentUser?.role === 'admin') {
      this.authService.getAllEmployee().subscribe(employees => {
        this.employeeCount = employees.length;
        this.authService.getAdminCount().subscribe(count => {
          this.adminCount = count;
          this.totalUsers = this.employeeCount + this.adminCount;
        });
      });
    }
  }

  getDisplayName(user: any): string {
    if (!user) return 'Admin';

    if (user.fullname && user.fullname.trim()) {
      return user.fullname;
    }
    
    if (user.name && user.name.trim()) {
      return user.name;
    }
    
    if (user.username && user.username.trim()) {
      return user.username;
    }
    
    const nameParts = [
      user.firstName,
      user.middleName,
      user.lastName
    ].filter(part => part && part.trim());
    
    if (nameParts.length > 0) {
      return nameParts.join(' ');
    }
    
    return 'User';
  }

  getInitials(user: any): string {
    const name = this.getDisplayName(user);
    if (!name) return 'A';
    
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['']);
  }

  getDashboard(): void {
    this.router.navigate(['main']);
  }

  getAdminTable(): void {
    this.router.navigate(['/main/admin-table']);
  }

  getEmployeeTable(): void {
    this.router.navigate(['/main/employee-table']);
  }
  
  getChart(): void {
    this.router.navigate(['/main/chart']);
  }
}