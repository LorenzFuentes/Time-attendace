import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router'; 
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { AuthService } from '../../service/auth';
import { AdminService } from '../../service/admin-service/admin'; 
import { UserService } from '../../service/user-service/user';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule,RouterOutlet,NzAvatarModule,NzBreadCrumbModule,NzIconModule,NzLayoutModule,NzMenuModule,NzTagModule,NzResultModule,],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout implements OnInit, OnDestroy {
  isCollapsed = true;
  protected readonly date = new Date();

  currentUser: any = null;
  adminCount: number = 0;
  employeeCount: number = 0;
  currentDateTime: string = '';
  currentDate: string = '';

  private timer: any; 

  constructor(
    private router: Router, 
    private authService: AuthService,
    private adminService: AdminService,
    private userService: UserService 
  ) {
    this.updateDateTime();
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.authService.currentUser$.subscribe(user => {
      console.log('User observable updated:', user);
      this.currentUser = user;
    });
    
    this.loadDashboardStats();
    this.timer = setInterval(() => this.updateDateTime(), 60000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
        
    console.log('AuthService user:', this.currentUser);

    if (!this.currentUser) {
      const userData = localStorage.getItem('currentUser');
      console.log('LocalStorage user data:', userData);
      
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData);
          console.log('Parsed user from localStorage:', this.currentUser);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
    
    // Ensure photo is accessible (convert base64 if needed)
    if (this.currentUser && this.currentUser.photo) {
      // If photo is base64 and needs proper formatting
      if (this.currentUser.photo.startsWith('data:image')) {
        // Already properly formatted
        console.log('User has profile photo');
      } else if (this.currentUser.photo.startsWith('/') || this.currentUser.photo.startsWith('http')) {
        // Already a URL path
        console.log('User has profile photo URL');
      }
    }
    
    if (!this.currentUser) {
      console.log('No user found, redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Final current user:', this.currentUser);
  }

  private loadDashboardStats(): void {
    // Use adminService for admin count
    this.adminService.getAdminCount().subscribe({
      next: (count: number) => {
        this.adminCount = count;
      },
      error: (error: any) => {
        console.error('Failed to load admin count:', error);
      }
    });
    
    // use it for employee count
    if (this.userService && this.userService.getUserCount) {
      this.userService.getUserCount().subscribe({
        next: (count: number) => {
          this.employeeCount = count;
        },
        error: (error: any) => {
          console.error('Failed to load employee count:', error);
        }
      });
    } else {
      console.warn('UserService not available for employee count');
      this.employeeCount = 0;
    }
  }

  getDisplayName(user: any): string {
    if (!user) return 'Administrator';
    
    if (user.fullname) return user.fullname;
    if (user.name) return user.name;
    if (user.username) return user.username;
    
    if (user.firstName || user.lastName) {
      const names = [user.firstName, user.middleName, user.lastName]
        .filter(name => name && name.trim());
      if (names.length > 0) return names.join(' ');
    }
    
    return 'Administrator';
  }

  // FIXED: Return undefined instead of null to match nzSrc expected type
  getUserPhoto(user: any): string | undefined {
    if (!user) return undefined;
    
    // Check for photo in various possible locations
    if (user.photo) {
      // Handle different photo formats
      if (typeof user.photo === 'string') {
        // If it's a relative path, you might need to prepend the base URL
        // Uncomment and modify the line below if your photos are stored as file paths
        // if (!user.photo.startsWith('data:') && !user.photo.startsWith('http')) {
        //   return `http://localhost:3000/${user.photo}`;
        // }
        return user.photo;
      }
    }
    if (user.avatar) {
      return user.avatar;
    }
    if (user.profilePicture) {
      return user.profilePicture;
    }
    if (user.profilePhoto) {
      return user.profilePhoto;
    }
    
    return undefined; // Return undefined instead of null
  }

  // FIXED: Check if user has photo before showing initials
  getInitials(user: any): string {
    // Don't show initials if user has a photo
    if (this.getUserPhoto(user)) {
      return ''; // Return empty string so photo shows instead
    }
    
    const name = this.getDisplayName(user);
    if (!name || name === 'Administrator') return 'AD';
    
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  updateDateTime(): void {
    const now = new Date();
    this.currentDateTime = now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    this.currentDate = now.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getAdminTable(): void {
    this.router.navigate(['/main/admin-table']);
  }

  getEmployeeTable(): void {
    this.router.navigate(['/main/employee-table']);
  }

  getHome(): void {
    this.router.navigate(['/main/admin-home']);
  }

  getChart(): void {
    this.router.navigate(['/main/chart']);
  }
  getCalendar(): void {
    this.router.navigate(['/main/calendar']);
  }
  getAttendance(): void {
    this.router.navigate(['/main/attendance']);
  }
  getLeave(): void {
    this.router.navigate(['/main/leave']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['']);
  }
}