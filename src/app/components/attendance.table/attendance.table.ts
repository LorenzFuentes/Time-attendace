import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../service/attendance-service/attendance'; 
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
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';

@Component({
  selector: 'app-attendance.table',
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
    NzIconModule,
    NzAlertModule,
    NzCalendarModule
  ],
  templateUrl: './attendance.table.html',
  styleUrls: ['../../app.scss']
})
export class AttendanceTable implements OnInit {
  attendanceData: any[] = [];
  filteredData: any[] = [];
  isLoading = false;
  editCache: { [key: string]: { edit: boolean; data: any } } = {};

  constructor(private attendanceService: AttendanceService) {} 

  ngOnInit(): void {
    this.loadAttendanceData();
  }

  loadAttendanceData(): void {
    this.isLoading = true;
    this.attendanceService.getAttendance().subscribe({
      next: (data: any[]) => { 
        this.attendanceData = data;
        this.filteredData = [...data];
        this.updateEditCache();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading attendance data:', error);
        this.isLoading = false;
      }
    });
  }

  updateEditCache(): void {
    this.attendanceData.forEach(item => {
      this.editCache[item.id || item.date] = {
        edit: false,
        data: { ...item }
      };
    });
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'present': 'Present',
      'absent': 'Absent',
      'late': 'Late',
      'leave': 'On Leave'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'present': 'green',
      'absent': 'red',
      'late': 'orange',
      'leave': 'blue'
    };
    return colorMap[status] || 'default';
  }
  
  getStatusStyle(status: string): any {
    const styles: any = {
      'border-radius': '16px',
      'padding': '4px 12px',
      'font-size': '12px',
      'font-weight': '500',
      'backdrop-filter': 'blur(4px)'
    };
    return styles;
  }

  startEdit(id: string): void {
    this.editCache[id].edit = true;
  }

  cancelEdit(id: string): void {
    const index = this.attendanceData.findIndex(item => (item.id || item.date) === id);
    this.editCache[id] = {
      data: { ...this.attendanceData[index] },
      edit: false
    };
  }

  saveEdit(id: string): void {
    const index = this.attendanceData.findIndex(item => (item.id || item.date) === id);
    Object.assign(this.attendanceData[index], this.editCache[id].data);
    this.editCache[id].edit = false;
    
    // Update to server
    this.attendanceService.updateAttendance(index + 1, this.attendanceData[index]).subscribe({
      next: () => {
        console.log('Attendance updated successfully');
      },
      error: (error: any) => { 
        console.error('Error updating attendance:', error);
      }
    });
  }

  deleteRecord(id: string): void {
    const index = this.attendanceData.findIndex(item => (item.id || item.date) === id);
    if (index !== -1) {
      this.attendanceService.deleteAttendance(index + 1).subscribe({
        next: () => {
          this.attendanceData.splice(index, 1);
          this.filteredData = [...this.attendanceData];
          delete this.editCache[id];
        },
        error: (error: any) => { 
          console.error('Error deleting attendance:', error);
        }
      });
    }
  }
}