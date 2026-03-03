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
import { AdminService } from '../../service/admin-service/admin';
import { UserService } from '../../service/user-service/user';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzMessageService } from 'ng-zorro-antd/message';

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
    NzResultModule,
    NzModalModule,
    NzAlertModule
  ],
  templateUrl: './admin-home.html',
  styleUrls: ['../../app.scss']
})
export class AdminHomeComponent implements OnInit {
  isCollapsed = false;
  adminCount = 0;
  employeeCount = 0;
  totalUsers = 0;
  isLoading = true;
  date = new Date()
  currentUser: any = null;


  isEditProfileModalVisible = false;
  selectedPhotoFile: File | null = null;
  selectedPhotoPreview: string | null = null;


  constructor(
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService, 
    private userService: UserService,
    private message: NzMessageService
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
    this.authService.currentUser$.subscribe((user: any) => {
      if (user) {
        this.currentUser = user;
      }
    });
  }

  private loadUserCounts(): void {
    if (this.currentUser?.role === 'admin') {
      // Use userService for employee count
      this.userService.getAllUsers().subscribe((employees: any[]) => { 
        this.employeeCount = employees.length;
        
        // Use adminService for admin count
        this.adminService.getAdminCount().subscribe((count: number) => {
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
    if (user?.photo) {
      return '';
    }
    
    const name = this.getDisplayName(user);
    if (!name) return 'A';
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  }

  showEditProfileModal(): void {
  this.isEditProfileModalVisible = true;
  this.selectedPhotoPreview = null;
  this.selectedPhotoFile = null;
}

  handleCancel(): void {
    this.isEditProfileModalVisible = false;
    this.selectedPhotoPreview = null;
    this.selectedPhotoFile = null;
  }

  handleOk(): void {
    if (this.selectedPhotoFile) {
      this.uploadProfilePhoto();
    } else if (this.selectedPhotoPreview === null && this.currentUser.photo) {
      // User wants to remove photo
      this.removeProfilePhoto();
    } else {
      this.handleCancel();
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.message.warning('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.message.warning('Please select an image file');
        return;
      }

      this.selectedPhotoFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedPhotoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedPhotoPreview = null;
    this.selectedPhotoFile = null;
  }

  uploadProfilePhoto(): void {
    if (!this.selectedPhotoFile) return;
    
    // Show loading
    this.message.loading('Uploading photo...', { nzDuration: 0 });
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Photo = e.target?.result as string;
      
      // Update user object
      const updatedUser = {
        ...this.currentUser,
        photo: base64Photo
      };
      
      // Call service to update user (implement based on your API)
      this.updateUserPhoto(updatedUser);
    };
    reader.readAsDataURL(this.selectedPhotoFile);
  }

  updateUserPhoto(updatedUser: any): void {
    // Determine which service to use based on user role
    if (updatedUser.role === 'admin') {
      this.adminService.updateAdmin(updatedUser.id, updatedUser).subscribe({
        next: (response) => {
          this.message.remove();
          this.message.success('Profile photo updated successfully!');
          this.currentUser = updatedUser;
          this.handleCancel();
          window.location.reload();

          
          // Update localStorage
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        },
        error: (error) => {
          this.message.remove();
          this.message.error('Failed to update profile photo. Please try again.');
          console.error('Error updating photo:', error);
        }
      });
    } else {
      this.userService.updateUser(updatedUser.id, updatedUser).subscribe({
        next: (response) => {
          this.message.remove();
          this.message.success('Profile photo updated successfully!');
          this.currentUser = updatedUser;
          this.handleCancel();
          
          // Update localStorage
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        },
        error: (error) => {
          this.message.remove();
          this.message.error('Failed to update profile photo. Please try again.');
          console.error('Error updating photo:', error);
        }
      });
    }
  }

  removeProfilePhoto(): void {
    this.message.loading('Removing photo...', { nzDuration: 0 });
    
    const updatedUser = {
      ...this.currentUser,
      photo: null
    };
    
    this.updateUserPhoto(updatedUser);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['']);
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