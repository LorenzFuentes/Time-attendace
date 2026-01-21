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
  imports: [CommonModule,FormsModule,ReactiveFormsModule,NzInputModule,NzPopconfirmModule,NzTableModule, NzButtonModule,NzSelectModule,NzTagModule,NzIconModule,],
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
    const index = this.listOfData.findIndex(item => item.id === id);
    if (index !== -1 && this.editCache[id]) {
      const updatedUser = this.editCache[id].data;
      const isNewUser = id.startsWith('temp_');
      
      if (isNewUser) {
        this.createNewUser(updatedUser, id);
      } else {
        this.updateExistingUser(id, updatedUser, index);
      }
    }
  }
  private createNewUser(userData: UserData, tempId: string): void {
    const newUserPayload = {
      username: userData.username,
      password: userData.password,
      email: userData.email,
      fullname: userData.fullname,
      access: userData.access || 'user'
    };

    this.authService.createUser(newUserPayload).subscribe({
      next: (response) => {
        const tempIndex = this.listOfData.findIndex(item => item.id === tempId);
        if (tempIndex !== -1) {
          this.listOfData[tempIndex] = {
            id: response.id.toString(),
            username: response.username,
            password: response.password,
            email: response.email,
            fullname: response.fullname,
            access: response.access
          };
          delete this.editCache[tempId];
          this.updateEditCache();
          
          this.message.success('User created successfully!');
        }
      },
      error: (error) => {
        const tempIndex = this.listOfData.findIndex(item => item.id === tempId);
        if (tempIndex !== -1) {
          this.listOfData.splice(tempIndex, 1);
          delete this.editCache[tempId];
        }
        
        this.message.error('Failed to create user. Please try again.');
      }
    });
  }

  private updateExistingUser(id: string, updatedUser: UserData, index: number): void {
    const apiUser = {
      ...updatedUser,
      id: parseInt(updatedUser.id) || updatedUser.id
    };
    delete (apiUser as any).edit;

    this.authService.updateUser(apiUser.id, apiUser).subscribe({
      next: (response) => {

        this.listOfData[index] = updatedUser;
        this.editCache[id].edit = false;
        this.message.success('User updated successfully!');
      },
      error: (error) => {
        this.message.error('Failed to update user. Please try again.');
      }
    });
  }
  deleteUser(id: string): void {
    const userId = parseInt(id) || id;
    
    this.authService.deleteUser(userId).subscribe({
      next: () => {
        const index = this.listOfData.findIndex(item => item.id === id);
        if (index !== -1) {
          this.listOfData.splice(index, 1);
          delete this.editCache[id];
          this.updateEditCache();
          this.message.success('User deleted successfully!');
        }
      },
      error: (error) => {
        this.message.error('Failed to delete user. Please try again.');
      }
    });
  }
  addNewUser(): void {
    const maxId = this.listOfData.reduce((max, user) => {
      const numId = parseInt(user.id);
      return !isNaN(numId) && numId > max ? numId : max;
    }, 0);
    
    const tempId = 'temp_' + (maxId + 1);
    const newUser: UserData = {
      id: tempId,
      username: '',
      password: '',
      email: '',
      fullname: '',
      access: 'user'
    };
    this.listOfData = [newUser, ...this.listOfData];
    this.updateEditCache();
    this.startEdit(tempId);
    this.message.info('Please fill in the new user details');
  }
  getAccessLabel(access: string): string {
    switch (access.toLowerCase()) {
      case 'admin': return 'Admin';
      default: return access.charAt(0).toUpperCase() + access.slice(1);
    }
  }

  refreshData(): void {
    window.location.reload();
  }

  isFormValid(userId: string): boolean {
    const userData = this.editCache[userId]?.data;
    if (!userData) return false;
    
    return !!userData.username?.trim() && 
           !!userData.email?.trim() && 
           !!userData.password?.trim() &&
           !!userData.fullname?.trim();
  }
}