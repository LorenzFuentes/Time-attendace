import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// NG-ZORRO Modules
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { AuthService } from '../../service/auth';

@Component({
  selector: 'app-leave-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NzTableModule,
    NzTagModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzDatePickerModule,
    NzIconModule
  ],
  templateUrl: './leave.table.html',
  styleUrls: ['./leave.table.scss']
})
export class LeaveTable implements OnInit {
  leaveData: any[] = [];
  filteredData: any[] = [];
  isLoading = false;
  editCache: { [key: string]: { edit: boolean; data: any } } = {};

  // For adding new leave
  isAddingNew = false;
  newLeaveData = {
    firstName: '',
    lastName: '',
    position: '',
    department: '',
    apply: 'leave',
    'date-to': '',
    'date-from': '',
    reason: '',
    approval: 'Pending',
    'date-of-approval': ''
  };

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadLeaveData();
  }

  loadLeaveData(): void {
    this.isLoading = true;
    this.authService.getLeaveRecords().subscribe({
      next: (data) => {
        this.leaveData = data;
        this.filteredData = [...data];
        this.updateEditCache();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading leave data:', error);
        this.isLoading = false;
      }
    });
  }

  updateEditCache(): void {
    this.leaveData.forEach(item => {
      this.editCache[item.id] = {
        edit: false,
        data: { ...item }
      };
    });
  }

  // Status Color
  getApprovalColor(approval: string): string {
  const colorMap: { [key: string]: string } = {
    'Approved': 'green',
    'Pending': 'gold', 
    'Rejected': 'red'
  };
  return colorMap[approval] || 'default';
}

getTagStyle(approval: string): any {
  const styles: any = {
    'border-radius': '16px',
    'padding': '4px 12px',
    'font-size': '12px',
    'font-weight': '500',
    'backdrop-filter': 'blur(4px)'
  };

  return styles;
}
  getApplyTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'leave': 'Leave',
      'sick': 'Sick Leave',
      'vacation': 'Vacation',
      'emergency': 'Emergency Leave'
    };
    return typeMap[type] || type;
  }

  startEdit(id: string): void {
    this.editCache[id].edit = true;
  }

  cancelEdit(id: string): void {
    const index = this.leaveData.findIndex(item => item.id === id);
    this.editCache[id] = {
      data: { ...this.leaveData[index] },
      edit: false
    };
  }

  saveEdit(id: string): void {
    const index = this.leaveData.findIndex(item => item.id === id);
    Object.assign(this.leaveData[index], this.editCache[id].data);
    this.editCache[id].edit = false;
    
    // Update to server
    this.authService.updateLeaveRecord(id, this.leaveData[index]).subscribe({
      next: () => console.log('Leave record updated'),
      error: (error) => console.error('Error updating leave:', error)
    });
  }

  deleteRecord(id: string): void {
    const index = this.leaveData.findIndex(item => item.id === id);
    if (index !== -1) {
      this.authService.deleteLeaveRecord(id).subscribe({
        next: () => {
          this.leaveData.splice(index, 1);
          this.filteredData = [...this.leaveData];
          delete this.editCache[id];
        },
        error: (error) => console.error('Error deleting leave:', error)
      });
    }
  }

  startAddNew(): void {
    this.isAddingNew = true;
    // Generate a temporary ID for the new record
    const tempId = 'temp_' + Date.now();
    this.editCache[tempId] = {
      edit: true,
      data: { ...this.newLeaveData, id: tempId }
    };
    this.filteredData = [{ ...this.newLeaveData, id: tempId }, ...this.filteredData];
  }

  cancelAddNew(tempId: string): void {
    this.isAddingNew = false;
    // Remove the temporary record from the filtered data
    this.filteredData = this.filteredData.filter(item => item.id !== tempId);
    delete this.editCache[tempId];
  }

  saveNewRecord(tempId: string): void {
    const newRecord = this.editCache[tempId].data;
    
    // Remove temp ID before sending to server
    const recordToSave = { ...newRecord };
    delete recordToSave.id;
    
    this.authService.addLeaveRecord(recordToSave).subscribe({
      next: (response) => {
        // Replace temp record with server response
        const index = this.filteredData.findIndex(item => item.id === tempId);
        if (index !== -1) {
          this.filteredData[index] = response;
          this.leaveData.push(response);
        }
        this.isAddingNew = false;
        delete this.editCache[tempId];
      },
      error: (error) => console.error('Error adding leave:', error)
    });
  }

  isFormValid(id: string): boolean {
    const data = this.editCache[id].data;
    return !!(
      data.firstName?.trim() &&
      data.lastName?.trim() &&
      data['date-to']?.trim() &&
      data['date-from']?.trim() &&
      data.reason?.trim()
    );
  }
}