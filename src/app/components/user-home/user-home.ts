import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { UserService } from '../../service/user-service/user';
import { AttendanceService } from '../../service/attendance-service/attendance';
import { LeaveService } from '../../service/leave-service/leave';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzDatePickerModule,
    NzSelectModule,
    NzInputModule,
    NzTableModule,
    NzTagModule,
    NzTabsModule
  ],
  templateUrl: './user-home.html',
  styleUrls: ['../../app.scss']
})
export class UserHome implements OnInit, OnDestroy {
  // User Info
  currentUser: any = null;
  userDisplayName: string = 'Administrator';
  currentDate = new Date();
  currentTime = new Date();
  private timeInterval: any;

  // Time Tracking
  isTimedIn = false;
  timeInTime: Date | null = null;
  timeOutTime: Date | null = null;
  totalHoursWorked = '0h 0m';
  todayAttendance: any = null;
  attendanceData: any[] = [];

  // Leave Modal
  isLeaveModalVisible = false;

  // Leave Request Form
  leaveRequest = {
    type: 'vacation',
    dateFrom: null,
    dateTo: null,
    reason: '',
    halfDay: false
  };

  // Leave History
  leaveHistory: any[] = [];

  // Leave Balances
  leaveBalances = [
    { type: 'Vacation Leave', total: 15, used: 0, remaining: 15, color: '#52c41a' },
    { type: 'Sick Leave', total: 12, used: 0, remaining: 12, color: '#fa8c16' },
    { type: 'Emergency Leave', total: 5, used: 0, remaining: 5, color: '#f5222d' },
    { type: 'Personal Leave', total: 5, used: 0, remaining: 5, color: '#9379b0' }
  ];

  // Recent Activity
  recentActivity: any[] = [];

  constructor(
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.startClock();
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  startClock(): void {
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  loadUserData(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.currentUser = JSON.parse(userJson);
      this.userDisplayName = this.getDisplayName(this.currentUser);
      
      this.loadTodayAttendance();
      this.loadUserLeaveHistory();
      this.loadRecentActivity();
    }
  }

  getDisplayName(user: any): string {
    if (!user) return 'Administrator';
    
    if (user.firstName) {
      const names = [user.firstNam]
        .filter(name => name && name.trim());
      if (names.length > 0) return names.join(' ');
    }
    
    if (user.name) return user.name;
    if (user.username) return user.username;
    
    return 'Administrator';
  }

  loadTodayAttendance(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.attendanceService.getAttendance().subscribe({
      next: (records: any[]) => {
        const userRecords = records.filter(r => 
          r.userId === this.currentUser?.id && 
          r.date === today
        );

        if (userRecords.length > 0) {
          this.todayAttendance = userRecords[0];
          this.isTimedIn = true;
          this.timeInTime = new Date(`${today}T${this.todayAttendance.timeIn}`);
          
          if (this.todayAttendance.timeOut) {
            this.timeOutTime = new Date(`${today}T${this.todayAttendance.timeOut}`);
            this.isTimedIn = false;
          }
          
          this.calculateHoursWorked();
        }
      },
      error: (error) => {
        console.error('Error loading attendance:', error);
      }
    });
  }

  loadUserLeaveHistory(): void {
    this.leaveService.getLeaveRecords().subscribe({
      next: (records: any[]) => {
        console.log('Leave records:', records);
        
        this.leaveHistory = records
          .filter(r => r.userId === this.currentUser?.id)
          .map(r => ({
            id: r.id,
            type: this.getApplyTypeLabel(r.apply),
            dateFrom: r['date-from'],
            dateTo: r['date-to'],
            reason: r.reason,
            status: r.approval,
            days: this.calculateLeaveDays(r['date-from'], r['date-to'])
          }))
          .sort((a, b) => new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime());

        this.updateLeaveBalances();
      },
      error: (error) => {
        console.error('Error loading leave history:', error);
      }
    });
  }

  loadRecentActivity(): void {
    forkJoin({
      attendance: this.attendanceService.getAttendance(),
      leaves: this.leaveService.getLeaveRecords()
    }).subscribe({
      next: (data) => {
        const activities = [];

        const userAttendance = data.attendance
          .filter(r => r.userId === this.currentUser?.id)
          .slice(0, 5)
          .map(r => ({
            action: r.timeOut ? 'Time Out' : 'Time In',
            time: r.timeOut || r.timeIn,
            date: r.date,
            status: r.timeOut ? 'default' : 'success'
          }));

        const userLeaves = data.leaves
          .filter(r => r.userId === this.currentUser?.id)
          .slice(0, 5)
          .map(r => ({
            action: 'Leave Filed',
            time: this.getApplyTypeLabel(r.apply),
            date: r['date-from'],
            status: r.approval === 'Pending' ? 'processing' : 
                    r.approval === 'Approved' ? 'success' : 'error'
          }));

        activities.push(...userAttendance, ...userLeaves);
        
        this.recentActivity = activities
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
      },
      error: (error) => {
        console.error('Error loading activities:', error);
      }
    });
  }

  updateLeaveBalances(): void {
    const approvedLeaves = this.leaveHistory.filter(l => l.status === 'Approved');
    
    this.leaveBalances.forEach(balance => {
      const used = approvedLeaves
        .filter(l => l.type === balance.type)
        .reduce((sum, l) => sum + l.days, 0);
      
      balance.used = used;
      balance.remaining = balance.total - used;
    });
  }

  calculateLeaveDays(dateFrom: string, dateTo: string): number {
    if (!dateFrom || !dateTo) return 1;
    
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  timeIn(): void {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const dateString = now.toISOString().split('T')[0];

    this.attendanceService.getAttendance().subscribe({
      next: (records: any[]) => {
        this.attendanceData = records;
        const attendanceRecord = {
          id: this.generateNextId().toString(),
          userId: this.currentUser?.id,
          firstName: this.currentUser?.firstName,
          lastName: this.currentUser?.lastName,
          position: this.currentUser?.position,
          department: this.currentUser?.department,
          date: dateString,
          timeIn: timeString,
          timeOut: null,
          status: 'Present'
        };

        this.attendanceService.addAttendance(attendanceRecord).subscribe({
          next: (response) => {
            this.isTimedIn = true;
            this.timeInTime = now;
            this.todayAttendance = attendanceRecord;
            
            this.recentActivity.unshift({
              action: 'Time In',
              time: this.formatTime(now),
              date: dateString,
              status: 'success'
            });

            this.message.success(`Timed in at ${this.formatTime(now)}`);
            this.calculateHoursWorked();
          },
          error: (error) => {
            console.error('Error timing in:', error);
            this.message.error('Failed to time in. Please try again.');
          }
        });
      },
      error: (error) => {
        console.error('Error fetching attendance records:', error);
        this.message.error('Failed to process time in. Please try again.');
      }
    });
  }

  generateNextId(): number {
    if (!this.attendanceData || this.attendanceData.length === 0) {
      return 1;
    }
    const ids = this.attendanceData
      .map(item => item.id)
      .filter(id => id !== undefined && id !== null)
      .map(id => {
        const num = Number(id);
        return isNaN(num) ? 0 : num;
      });
    
    if (ids.length === 0) {
      return 1;
    }
    
    const maxId = Math.max(...ids);
    return maxId + 1;
  }

  timeOut(): void {
    if (!this.todayAttendance) return;

    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const dateString = now.toISOString().split('T')[0];

    const updatedRecord = {
      ...this.todayAttendance,
      timeOut: timeString
    };

    this.attendanceService.updateAttendance(this.todayAttendance.id, updatedRecord).subscribe({
      next: (response) => {
        this.isTimedIn = false;
        this.timeOutTime = now;
        this.todayAttendance = updatedRecord;
        
        this.calculateHoursWorked();
        
        this.recentActivity.unshift({
          action: 'Time Out',
          time: this.formatTime(now),
          date: dateString,
          status: 'default'
        });

        this.message.success(`Timed out at ${this.formatTime(now)}. Total: ${this.totalHoursWorked}`);
      },
      error: (error) => {
        console.error('Error timing out:', error);
        this.message.error('Failed to time out. Please try again.');
      }
    });
  }

  calculateHoursWorked(): void {
    if (this.timeInTime) {
      const endTime = this.timeOutTime || new Date();
      this.totalHoursWorked = this.calculateHoursDifference(this.timeInTime, endTime);
    }
  }

  calculateHoursDifference(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  }

  showLeaveModal(): void {
    this.isLeaveModalVisible = true;
  }

  handleCancelLeave(): void {
    this.isLeaveModalVisible = false;
    this.resetLeaveForm();
  }

  submitLeaveRequest(): void {
    if (!this.leaveRequest.dateFrom || !this.leaveRequest.dateTo || !this.leaveRequest.reason) {
      this.message.warning('Please fill in all required fields');
      return;
    }

    const days = this.calculateDays();

    const balance = this.leaveBalances.find(b => 
      b.type === this.getLeaveTypeLabel(this.leaveRequest.type)
    );
    
    if (balance && days > balance.remaining) {
      this.message.error(`Insufficient leave balance. Remaining: ${balance.remaining} days`);
      return;
    }

    this.leaveService.getLeaveRecords().subscribe({
      next: (records: any[]) => {
        const leaveId = this.generateLeaveId(records);

        const leaveRecord = {
          userId: this.currentUser?.id,
          firstName: this.currentUser?.firstName,
          lastName: this.currentUser?.lastName,
          position: this.currentUser?.position,
          department: this.currentUser?.department,
          apply: this.leaveRequest.type,
          'date-from': this.formatDate(this.leaveRequest.dateFrom),
          'date-to': this.formatDate(this.leaveRequest.dateTo),
          reason: this.leaveRequest.reason,
          approval: 'Pending',
          'date-of-approval': '',
          id: leaveId.toString()
        };

        this.leaveService.addLeaveRecord(leaveRecord).subscribe({
          next: (response) => {
            this.leaveHistory.unshift({
              id: response.id,
              type: this.getLeaveTypeLabel(this.leaveRequest.type),
              dateFrom: this.formatDate(this.leaveRequest.dateFrom),
              dateTo: this.formatDate(this.leaveRequest.dateTo),
              reason: this.leaveRequest.reason,
              status: 'Pending',
              days: days
            });

            this.recentActivity.unshift({
              action: 'Leave Filed',
              time: this.getLeaveTypeLabel(this.leaveRequest.type),
              date: this.formatDate(new Date()),
              status: 'processing'
            });

            this.message.success('Leave request submitted successfully');
            this.isLeaveModalVisible = false;
            this.resetLeaveForm();
          },
          error: (error) => {
            console.error('Error submitting leave:', error);
            this.message.error('Failed to submit leave request. Please try again.');
          }
        });
      },
      error: (error) => {
        console.error('Error fetching leave records:', error);
        this.message.error('Failed to submit leave request. Please try again.');
      }
    });
  }

  generateLeaveId(records: any[]): number {
    if (!records || records.length === 0) {
      return 1;
    }
    
    const ids = records
      .map(item => item.id)
      .filter(id => id !== undefined && id !== null)
      .map(id => {
        const num = Number(id);
        return isNaN(num) ? 0 : num;
      });
    
    if (ids.length === 0) {
      return 1;
    }
    
    const maxId = Math.max(...ids);
    return maxId + 1;
  }

  calculateDays(): number {
    if (this.leaveRequest.dateFrom && this.leaveRequest.dateTo) {
      const from = new Date(this.leaveRequest.dateFrom);
      const to = new Date(this.leaveRequest.dateTo);
      const diffTime = Math.abs(to.getTime() - from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 1;
  }

  resetLeaveForm(): void {
    this.leaveRequest = {
      type: 'vacation',
      dateFrom: null,
      dateTo: null,
      reason: '',
      halfDay: false
    };
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  }

  getApplyTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'leave': 'Leave',
      'sick': 'Sick Leave',
      'vacation': 'Vacation Leave',
      'emergency': 'Emergency Leave',
      'personal': 'Personal Leave'
    };
    return typeMap[type] || type;
  }

  getLeaveTypeLabel(type: string): string {
    return this.getApplyTypeLabel(type);
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'Approved': 'green',
      'Pending': 'gold', 
      'Rejected': 'red'
    };
    return colorMap[status] || 'default';
  }

}