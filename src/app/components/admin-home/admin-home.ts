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
import { TitleCasePipe } from '@angular/common';
import { AuthService } from '../../service/auth';

@Component({
  selector: 'app-admin-home',
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
    NzResultModule,
    TitleCasePipe
  ],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.scss',
})
export class AdminHomeComponent implements OnInit {
  isCollapsed = false;
  adminCount = 0;
  employeeCount = 0;
  totalUsers = 0;
  isLoading = true; // Start with true
  protected readonly date = new Date();
  
  currentUser: any = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('AdminHomeComponent initializing...');
    this.loadCurrentUser();
    this.loadUserCounts();
  }

  private loadCurrentUser(): void {
    console.log('Loading current user...');
    
    // Method 1: Get from auth service
    this.currentUser = this.authService.getCurrentUser();
    console.log('User from auth service:', this.currentUser);
    
    if (this.currentUser) {
      console.log('User role:', this.currentUser.role);
      console.log('User data:', this.currentUser);
      this.isLoading = false;
      
      // If user is not admin, redirect to appropriate page
      if (this.currentUser.role !== 'admin') {
        console.log('User is not admin, redirecting...');
        // Redirect to user home page
        this.router.navigate(['/user-home']);
        return;
      }
    } else {
      console.log('No user found in auth service, checking localStorage...');
      
      // Method 2: Try localStorage as fallback
      const userData = localStorage.getItem('currentUser');
      const userType = localStorage.getItem('currentUserType');
      
      if (userData) {
        this.currentUser = JSON.parse(userData);
        
        // If role doesn't exist, set it based on userType
        if (!this.currentUser.role && userType) {
          this.currentUser.role = userType;
        }
        
        console.log('User from localStorage:', this.currentUser);
        this.isLoading = false;
        
        if (this.currentUser.role !== 'admin') {
          this.router.navigate(['/user-home']);
          return;
        }
      } else {
        console.log('No user in localStorage either');
        this.isLoading = false;
      }
    }
    
    // Subscribe to changes
    this.authService.currentUser$.subscribe(user => {
      console.log('User observable updated:', user);
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
  
    // Check all possible name fields
    if (user.fullname && user.fullname.trim()) {
      return user.fullname;
    }
    
    if (user.name && user.name.trim()) {
      return user.name;
    }
    
    if (user.username && user.username.trim()) {
      return user.username;
    }
    
    // Try combining first/middle/last names
    const names = [
      user.firstName,
      user.middleName,
      user.lastName
    ].filter(name => name && name.trim());
    
    if (names.length > 0) {
      return names.join(' ');
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

  editProfile(): void {
    console.log('Edit profile clicked');
    // Navigate to edit profile page
  }

  changePassword(): void {
    console.log('Change password clicked');
    // Navigate to change password page
  }

  logout(): void {
    console.log('Logging out...');
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
}