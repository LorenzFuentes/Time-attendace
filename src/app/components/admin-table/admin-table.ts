import { Component, OnInit } from '@angular/core';
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
import { NzIconModule } from 'ng-zorro-antd/icon'

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
export class AdminTable implements OnInit {
  editCache: { [key: string]: { edit: boolean; data: UserData } } = {};
  listOfData: UserData[] = [];
  isLoading: boolean = true;

  accessLevels = [
    { value: 'admin', label: 'Admin' }
  ];

  constructor(
    private authService: AuthService,
    private message: NzMessageService,
    private route: Router
  ) {}

  ngOnInit(): void {
    this.loadDataFromApi();
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
    this.listOfData.forEach(item => {
      this.editCache[item.id] = {
        edit: false,
        data: { ...item }
      };
    });
  }

  startEdit(id: string): void {
    if (this.editCache[id]) {
      this.editCache[id].edit = true;
    }
  }

  cancelEdit(id: string): void {
    if (id.startsWith('temp_')) {
      const index = this.listOfData.findIndex(item => item.id === id);
      if (index !== -1) {
        this.listOfData.splice(index, 1);
        delete this.editCache[id];
      }
    } else {
      const index = this.listOfData.findIndex(item => item.id === id);
      if (index !== -1) {
        this.editCache[id] = {
          data: { ...this.listOfData[index] },
          edit: false
        };
      }
    }
  }

  saveEdit(id: string): void {
    if (!this.isFormValid(id)) {
      this.message.warning('Please fill in all required fields');
      return;
    }

    const adminData = this.editCache[id].data;
    
    if (id.startsWith('temp_')) {
      // New admin - get next ID from server using register logic
      this.registerAdminWithManualId(adminData, id);
    } else {
      // Existing admin - update
      this.authService.updateUser(id, adminData).subscribe({
        next: () => {
          this.editCache[id].edit = false;
          this.message.success('Admin updated successfully!');
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
    this.updateEditCache();
    this.startEdit(tempId);
    this.message.info('Please fill in the new admin details');
  }

  private registerAdminWithManualId(newAdmin: any, tempId: string): void {
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
            const tempIndex = this.listOfData.findIndex(item => item.id === tempId);
            if (tempIndex !== -1) {
              this.listOfData[tempIndex] = createdAdmin;
              
              this.editCache[createdAdmin.id] = {
                edit: false,
                data: createdAdmin
              };
              delete this.editCache[tempId];
              
              this.updateEditCache();
            }
            
            this.message.success(`Admin ${newAdmin.fullname} registered successfully! ID: ${nextId}`);
          },
          error: (error) => {
            console.error('Registration failed:', error);
            this.message.error('Registration failed. Please try again.');
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
          delete this.editCache[id];
          this.message.success('User deleted successfully!');
        },
        error: (error) => {
          this.message.error('Failed to delete user. Please try again.');
        }
      });
    } else {
      this.listOfData = this.listOfData.filter(item => item.id !== id);
      delete this.editCache[id];
    }
  }

  getAccessLabel(access: string): string {
    switch (access.toLowerCase()) {
      case 'admin': return 'Admin';
      default: return access.charAt(0).toUpperCase() + access.slice(1);
    }
  }

  refreshData(): void {
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
}