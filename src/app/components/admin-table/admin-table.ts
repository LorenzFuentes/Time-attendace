import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AuthService } from '../../service/auth';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { debounceTime, Subject, Subscription } from 'rxjs';

export interface UserData {
  id: string;
  username: string;
  password: string;
  email: string;
  fullname: string;
  access: string;
}

@Component({
  selector: 'app-admin-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzInputModule, NzPopconfirmModule, NzTableModule, NzButtonModule, NzSelectModule, NzTagModule, NzIconModule,],
  templateUrl: './admin-table.html',
  styleUrls: ['./admin-table.scss']
})
export class AdminTable implements OnInit, OnDestroy {
  editCache: { [key: string]: { edit: boolean; data: UserData } } = {};
  listOfData: UserData[] = [];
  filteredData: UserData[] = [];
  isLoading: boolean = true;

  accessLevels = [
    { value: 'admin', label: 'Admin' }
  ];
  isCollapsed = false;
  protected readonly date = new Date();

  currentUser: any = null;
  adminCount: number = 0;
  employeeCount: number = 0;
  currentDateTime: string = '';
  currentDate: string = '';

  // Search property
  searchValue: string = '';

  private timer: any; 
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private message: NzMessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDataFromApi();
    this.loadCurrentUser();
    this.authService.currentUser$.subscribe(user => {
      console.log('User observable updated:', user);
      this.currentUser = user;
    });
    
    this.loadDashboardStats();
    this.updateDateTime();
    this.timer = setInterval(() => this.updateDateTime(), 60000);
    
    // Subscribe to search input with debounce
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(searchTerm => {
        this.filterAdmins(searchTerm);
      });
  }

  private loadDataFromApi(): void {
    this.isLoading = true;
    this.authService.getAllUsers().subscribe({
      next: (data) => {
        this.listOfData = data.map(user => ({
          id: user.id.toString(),
          username: user.username || '',
          password: user.password || '',
          email: user.email || '',
          fullname: user.fullname || '',
          access: user.access || 'user'
        }));
        this.filteredData = [...this.listOfData];
        this.updateEditCache();
        this.isLoading = false;
        this.message.success('Data loaded successfully!');
      },
      error: (error) => {
        this.message.error('Failed to load data from server.');
        this.isLoading = false;
      }
    });
  }

  private updateEditCache(): void {
    this.editCache = {};
    this.filteredData.forEach(item => {
      this.editCache[item.id] = {
        edit: false,
        data: { ...item }
      };
    });
  }

  // Filter admins based on search term
  private filterAdmins(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredData = [...this.listOfData];
      this.updateEditCache();
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    this.filteredData = this.listOfData.filter(admin => {
      return (
        admin.username?.toLowerCase().includes(term) ||
        admin.fullname?.toLowerCase().includes(term) ||
        admin.email?.toLowerCase().includes(term) ||
        admin.access?.toLowerCase().includes(term) ||
        admin.id?.toLowerCase().includes(term)
      );
    });
    
    this.updateEditCache();
  }

  // Handle real-time search
  onSearch(): void {
    this.searchSubject.next(this.searchValue);
  }

  // Handle search button click
  onSearchClick(): void {
    this.filterAdmins(this.searchValue);
  }

  startEdit(id: string): void {
    if (this.editCache[id]) {
      this.editCache[id].edit = true;
    }
  }

  cancelEdit(id: string): void {
    const isNewAdmin = id.startsWith('temp_');
    
    if (isNewAdmin) {
      const index = this.filteredData.findIndex(item => item.id === id);
      const originalIndex = this.listOfData.findIndex(item => item.id === id);
      
      if (index !== -1) {
        this.filteredData.splice(index, 1);
        delete this.editCache[id];
      }
      
      if (originalIndex !== -1) {
        this.listOfData.splice(originalIndex, 1);
      }
    } else {
      const index = this.filteredData.findIndex(item => item.id === id);
      const originalIndex = this.listOfData.findIndex(item => item.id === id);
      
      if (index !== -1) {
        this.editCache[id] = {
          data: { ...this.filteredData[index] },
          edit: false
        };
      }
    }
    
    // Re-filter after cancellation
    this.filterAdmins(this.searchValue);
  }

  saveEdit(id: string): void {
    if (!this.isFormValid(id)) {
      this.message.warning('Please fill in all required fields');
      return;
    }

    const adminData = this.editCache[id].data;
    const index = this.filteredData.findIndex(item => item.id === id);
    const originalIndex = this.listOfData.findIndex(item => item.id === id);
    
    if (id.startsWith('temp_')) {
      // New admin - get next ID from server using register logic
      this.registerAdminWithManualId(adminData, id, index, originalIndex);
    } else {
      // Existing admin - update
      this.authService.updateUser(id, adminData).subscribe({
        next: () => {
          if (index !== -1) {
            this.filteredData[index] = { ...adminData };
          }
          if (originalIndex !== -1) {
            this.listOfData[originalIndex] = { ...adminData };
          }
          
          this.editCache[id].edit = false;
          this.message.success('Admin updated successfully!');
          window.location.reload();
          
          // Re-filter after update
          this.filterAdmins(this.searchValue);
        },
        error: () => {
          this.message.error('Failed to update admin');
        }
      });
    }
  }

  addNewUser(): void {
    // Generate a temporary ID
    const tempId = 'temp_' + Date.now();
    
    const newAdmin: UserData = {
      id: tempId,
      username: '',
      password: '',
      email: '',
      fullname: '',
      access: 'admin'
    };
    
    this.listOfData = [newAdmin, ...this.listOfData];
    this.filteredData = [newAdmin, ...this.filteredData];
    this.updateEditCache();
    this.startEdit(tempId);
    this.message.info('Please fill in the new admin details');
  }

  private registerAdminWithManualId(newAdmin: any, tempId: string, index: number, originalIndex: number): void {
    this.authService.getAllUsers().subscribe({
      next: (existingAdmins: any) => {
        let maxId = 0;
        if (existingAdmins && existingAdmins.length > 0) {
          const numericIds = existingAdmins
            .filter((admin: any) => {
              const idNum = Number(admin.id);
              return !isNaN(idNum) && !admin.id.toString().startsWith('temp_');
            })
            .map((admin: any) => Number(admin.id));
          
          if (numericIds.length > 0) {
            maxId = Math.max(...numericIds);
          }
        }
        
        const nextId = maxId + 1;
        
        const adminWithId = {
          id: nextId.toString(),
          username: newAdmin.username,
          password: newAdmin.password,
          email: newAdmin.email,
          fullname: newAdmin.fullname,
          access: 'admin'
        };
        
        this.authService.createUser(adminWithId).subscribe({
          next: (createdAdmin: any) => {
            const adminWithStringId = {
              ...createdAdmin,
              id: createdAdmin.id ? createdAdmin.id.toString() : nextId.toString()
            };
            
            // Update in filtered array
            if (index !== -1) {
              this.filteredData[index] = adminWithStringId;
            }
            
            // Update in original array
            if (originalIndex !== -1) {
              this.listOfData[originalIndex] = adminWithStringId;
            }
            
            this.editCache[adminWithStringId.id] = {
              edit: false,
              data: adminWithStringId
            };
            delete this.editCache[tempId];
            
            this.message.success(`Admin ${newAdmin.fullname} registered successfully!`);
            window.location.reload();
            
            // Re-filter after creation
            this.filterAdmins(this.searchValue);
          },
          error: (error) => {
            console.error('Registration failed:', error);
            this.message.error('Registration failed. Please try again.');
            
            // Remove the temporary admin on error
            this.listOfData = this.listOfData.filter(item => item.id !== tempId);
            this.filterAdmins(this.searchValue);
          }
        });
      },
      error: (error) => {
        console.error('Failed to get existing admins:', error);
        this.message.error('Failed to connect to server. Please try again.');
      }
    });
  }

  deleteUser(id: string): void {
    if (!id.startsWith('temp_')) {
      const userId = parseInt(id) || id;
      
      this.authService.deleteUser(userId).subscribe({
        next: () => {
          this.listOfData = this.listOfData.filter(item => item.id !== id);
          this.filteredData = this.filteredData.filter(item => item.id !== id);
          delete this.editCache[id];
          this.message.success('User deleted successfully!');
          this.filterAdmins(this.searchValue);
          window.location.reload();
        },
        error: (error) => {
          this.message.error('Failed to delete user. Please try again.');
        }
      });
    } else {
      this.listOfData = this.listOfData.filter(item => item.id !== id);
      this.filteredData = this.filteredData.filter(item => item.id !== id);
      delete this.editCache[id];
      this.filterAdmins(this.searchValue);
    }
  }

  getAccessLabel(access: string): string {
    switch (access.toLowerCase()) {
      case 'admin': return 'Admin';
      default: return access.charAt(0).toUpperCase() + access.slice(1);
    }
  }

  refreshData(): void {
    this.isLoading = true;
    this.searchValue = '';
    this.loadDataFromApi();
  }

  isFormValid(userId: string): boolean {
    const userData = this.editCache[userId]?.data;
    if (!userData) return false;
    
    return !!userData.username.trim() && 
           !!userData.email.trim() && 
           !!userData.password.trim() &&
           !!userData.fullname.trim();
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
    
    if (!this.currentUser) {
      console.log('No user found, redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Final current user:', this.currentUser);
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

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  private loadDashboardStats(): void {
    this.authService.getAdminCount().subscribe({
      next: (count) => {
        this.adminCount = count;
      },
      error: (error) => {
        console.error('Failed to load admin count:', error);
      }
    });
    
    this.authService.getEmployeeCount().subscribe({
      next: (count) => {
        this.employeeCount = count;
      },
      error: (error) => {
        console.error('Failed to load employee count:', error);
      }
    });
  }
}