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
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

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
    NzTabsModule,
    NzBadgeModule,
    NzAlertModule,
    NzAvatarModule
  ],
  templateUrl: './user-home.html',
  styleUrls: ['../../app.scss']
})
export class UserHome implements OnInit, OnDestroy {
  // User Info
  currentUser: any = null;
  userDisplayName: string = 'User';
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

  recentActivity: any[] = [];

  private readonly LATE_THRESHOLD_HOUR = 21;
  private readonly LATE_THRESHOLD_MINUTE = 10;
  private totalHoursInterval: any;

  // Edit Profile Properties
  isEditProfileModalVisible = false;
  editProfilePhotoFile: File | null = null;
  editProfilePhotoPreview: string | null = null;
  editProfileData: any = {
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    username: '',
    email: '',
    department: '',
    position: ''
  };

  // Notification Properties
  notifications: any[] = [];
  hasNotifications = false;
  isNotificationsModalVisible = false;
  private notificationCheckInterval: any;

  constructor(
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.startClock();
    this.startNotificationCheck();
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.totalHoursInterval) { 
      clearInterval(this.totalHoursInterval);
    }
    if (this.notificationCheckInterval) {
      clearInterval(this.notificationCheckInterval);
    }
  }

  startClock(): void {
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  startNotificationCheck(): void {
    this.notificationCheckInterval = setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  loadUserData(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.currentUser = JSON.parse(userJson);
      this.userDisplayName = this.getDisplayName(this.currentUser);
      
      this.loadTodayAttendance();
      this.loadUserLeaveHistory();
      this.loadRecentActivity();
      this.loadNotifications();
    }
  }

  getDisplayName(user: any): string {
    if (!user) return 'User';
    
    if (user.firstName) {
      const names = [user.firstName, user.middleName, user.lastName]
        .filter(name => name && name.trim());
      if (names.length > 0) return names.join(' ');
    }
    
    if (user.fullname) return user.fullname;
    if (user.name) return user.name;
    if (user.username) return user.username;
    
    return 'User';
  }

  getInitials(user: any): string {
    if (!user) return 'U';
    
    if (user.photo) {
      return '';
    }
    
    const name = this.getDisplayName(user);
    if (!name) return 'U';
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  }

  // Helper method to parse time string to Date object
  private parseTimeString(timeStr: string, baseDate: Date = new Date()): Date {
    if (!timeStr) return baseDate;
    
    const parts = timeStr.split(':');
    const date = new Date(baseDate);
    date.setHours(
      parseInt(parts[0]) || 0,
      parseInt(parts[1]) || 0,
      parseInt(parts[2]) || 0,
      0
    );
    return date;
  }

  loadTodayAttendance(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.attendanceService.getAttendance().subscribe({
      next: (records: any[]) => {
        this.attendanceData = records;
        const userRecords = records.filter(r => 
          r.userId === this.currentUser?.id && 
          r.date === today
        );

        if (userRecords.length > 0) {
          this.todayAttendance = userRecords[0];
          this.isTimedIn = true;
          
          // Create date objects with the correct date from the record
          const recordDate = new Date(this.todayAttendance.date + 'T00:00:00');
          
          // Parse timeIn with the record date
          this.timeInTime = this.parseTimeString(this.todayAttendance.timeIn, recordDate);
          
          if (this.todayAttendance.timeOut) {
            // For timeOut, if it's after midnight, use the next day
            let timeOutDate = new Date(recordDate);
            const timeOutParts = this.todayAttendance.timeOut.split(':');
            const timeOutHour = parseInt(timeOutParts[0]);
            
            // If timeOut hour is less than timeIn hour, it's the next day
            if (timeOutHour < this.timeInTime.getHours()) {
              timeOutDate.setDate(timeOutDate.getDate() + 1);
            }
            
            this.timeOutTime = this.parseTimeString(this.todayAttendance.timeOut, timeOutDate);
            this.isTimedIn = false;
            
            // Calculate hours worked
            this.totalHoursWorked = this.calculateHoursDifference(this.timeInTime, this.timeOutTime);
          } else {
            this.startTotalHoursUpdate();
            this.calculateHoursWorked();
          }
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
            status: r.timeOut ? 'default' : 'success',
            statusText: r.status || 'Present'
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

  // ========== NOTIFICATION METHODS ==========

  loadNotifications(): void {
  forkJoin({
    leaves: this.leaveService.getLeaveRecords(),
    attendance: this.attendanceService.getAttendance()
  }).subscribe({
    next: (data) => {
      this.notifications = [];
      
      // Get leave notifications only (when admin approves/rejects)
      const userLeaves = data.leaves
        .filter(r => r.userId === this.currentUser?.id)
        .filter(r => r.approval !== 'Pending')
        .map(r => ({
          id: r.id,
          type: 'leave',
          message: `Your ${this.getApplyTypeLabel(r.apply)} request has been ${r.approval.toLowerCase()}`,
          date: r['date-of-approval'] || new Date().toISOString().split('T')[0],
          status: r.approval.toLowerCase(),
          read: this.isNotificationRead(r.id, 'leave', r.approval)
        }));

      this.notifications = userLeaves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      this.hasNotifications = this.notifications.some(n => !n.read);
    },
    error: (error) => {
      console.error('Error loading notifications:', error);
    }
  });
}

  isNotificationRead(id: string, type: string, status: string): boolean {
    const key = `notification_${id}_${type}_${status}`;
    const read = localStorage.getItem(key);
    return read === 'true';
  }

  markNotificationAsRead(notification: any): void {
    const key = `notification_${notification.id}_${notification.type}_${notification.status}`;
    localStorage.setItem(key, 'true');
    notification.read = true;
    this.hasNotifications = this.notifications.some(n => !n.read);
  }

  openNotifications(): void {
    this.isNotificationsModalVisible = true;
  }
 
  closeNotificationsModal(): void {
    this.isNotificationsModalVisible = false;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getNotificationIcon(notification: any): string {
    if (notification.type === 'leave') {
      return notification.status === 'approved' ? '✅' : '❌';
    }
    return notification.status === 'late' ? '⏰' : '📋';
  }

  getNotificationMessage(notification: any): string {
    if (notification.type === 'leave') {
      const leaveType = notification.message.split(' ')[1] || 'Leave';
      const status = notification.status === 'approved' ? 
        '<span class="approved">Approved</span>' : 
        '<span class="rejected">Rejected</span>';
      return `Your <strong>${leaveType}</strong> request has been ${status}`;
    }
    return notification.message;
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

  isLateTime(date: Date): boolean {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    return hours > this.LATE_THRESHOLD_HOUR || 
           (hours === this.LATE_THRESHOLD_HOUR && minutes > this.LATE_THRESHOLD_MINUTE);
  }

  getTimeInStatus(timeInDate: Date): string {
    return this.isLateTime(timeInDate) ? 'Late' : 'Present';
  }

  timeIn(): void {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS format
    const dateString = now.toISOString().split('T')[0];
    const status = this.getTimeInStatus(now);

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
          status: status 
        };

        this.attendanceService.addAttendance(attendanceRecord).subscribe({
          next: (response) => {
            this.isTimedIn = true;
            this.timeInTime = now; // Use actual Date object
            this.todayAttendance = attendanceRecord;
            this.startTotalHoursUpdate();
            
            this.recentActivity.unshift({
              action: 'Time In',
              time: this.formatTime(now),
              date: dateString,
              status: 'success',
              statusText: status
            });

            const statusMessage = status === 'Late' ? ' (Late)' : '';
            this.message.success(`Timed in at ${this.formatTime(now)}${statusMessage}`);
            this.calculateHoursWorked();
            this.loadNotifications();
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

    if (this.timeInTime) {
      this.totalHoursWorked = this.calculateHoursDifference(this.timeInTime, now);
    }

    const updatedRecord = {
      ...this.todayAttendance,
      timeOut: timeString,
      totalHours: this.totalHoursWorked 
    };

    this.attendanceService.updateAttendance(this.todayAttendance.id, updatedRecord).subscribe({
      next: (response) => {
        this.isTimedIn = false;
        this.timeOutTime = now;
        this.todayAttendance = updatedRecord;
        this.stopTotalHoursUpdate();
        
        this.recentActivity.unshift({
          action: 'Time Out',
          time: this.formatTime(now),
          date: dateString,
          status: 'default',
          statusText: `Total: ${this.totalHoursWorked}`
        });

        this.message.success(
          `Timed out at ${this.formatTime(now)}. Total hours worked: ${this.totalHoursWorked}`
        );
        this.loadNotifications();
      },
      error: (error) => {
        console.error('Error timing out:', error);
        this.message.error('Failed to time out. Please try again.');
      }
    });
  }

  startTotalHoursUpdate(): void {
    if (this.totalHoursInterval) {
      clearInterval(this.totalHoursInterval);
    }
    
    this.totalHoursInterval = setInterval(() => {
      if (this.isTimedIn && this.timeInTime) {
        this.calculateHoursWorked();
      }
    }, 1000);
  }

  stopTotalHoursUpdate(): void {
    if (this.totalHoursInterval) {
      clearInterval(this.totalHoursInterval);
      this.totalHoursInterval = null;
    }
  }

calculateHoursWorked(): void {
  if (this.timeInTime) {
    let endTime = this.timeOutTime ? new Date(this.timeOutTime) : new Date();
    
    // Fix the cross-day logic
    if (this.timeInTime && endTime < this.timeInTime) {
      // Instead of adding a full day, we need to set the endTime to the next day
      // But preserve the actual time
      const nextDay = new Date(this.timeInTime);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(
        endTime.getHours(),
        endTime.getMinutes(),
        endTime.getSeconds()
      );
      endTime = nextDay;
    }
    
    this.totalHoursWorked = this.calculateHoursDifference(this.timeInTime, endTime);
  }
}

calculateHoursDifference(start: Date, end: Date): string {
  if (!start || !end) return '0h 0m';
  
  const diffMs = Math.abs(end.getTime() - start.getTime());
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  
  // Add debug log to see the actual calculation
  console.log('Start:', start.toLocaleString());
  console.log('End:', end.toLocaleString());
  console.log('Diff MS:', diffMs);
  console.log('Diff Hours:', diffHrs);
  console.log('Diff Minutes:', diffMins);
  
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
            this.loadNotifications();
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
      'Rejected': 'red',
      'Late': 'orange', 
      'Present': 'green'
    };
    return colorMap[status] || 'default';
  }

  // ========== EDIT PROFILE METHODS ==========

  showEditProfileModal(): void {
    this.editProfileData = {
      firstName: this.currentUser?.firstName || '',
      middleName: this.currentUser?.middleName || '',
      lastName: this.currentUser?.lastName || '',
      phone: this.currentUser?.phone || '',
      username: this.currentUser?.username || '',
      email: this.currentUser?.email || '',
      department: this.currentUser?.department || '',
      position: this.currentUser?.position || ''
    };
    this.editProfilePhotoPreview = null;
    this.editProfilePhotoFile = null;
    this.isEditProfileModalVisible = true;
  }

  handleCancelEditProfile(): void {
    this.isEditProfileModalVisible = false;
    this.editProfilePhotoPreview = null;
    this.editProfilePhotoFile = null;
  }

  handleOkEditProfile(): void {
    const updatedData: any = {};
    
    if (this.editProfileData.firstName !== this.currentUser?.firstName) {
      updatedData.firstName = this.editProfileData.firstName;
    }
    if (this.editProfileData.middleName !== this.currentUser?.middleName) {
      updatedData.middleName = this.editProfileData.middleName;
    }
    if (this.editProfileData.lastName !== this.currentUser?.lastName) {
      updatedData.lastName = this.editProfileData.lastName;
    }
    if (this.editProfileData.phone !== this.currentUser?.phone) {
      updatedData.phone = this.editProfileData.phone;
    }
    if (this.editProfileData.username !== this.currentUser?.username) {
      updatedData.username = this.editProfileData.username;
    }
    if (this.editProfileData.email !== this.currentUser?.email) {
      updatedData.email = this.editProfileData.email;
    }
    if (this.editProfileData.department !== this.currentUser?.department) {
      updatedData.department = this.editProfileData.department;
    }
    if (this.editProfileData.position !== this.currentUser?.position) {
      updatedData.position = this.editProfileData.position;
    }
    
    if (this.editProfilePhotoFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updatedData.photo = e.target?.result as string;
        this.saveProfileChanges(updatedData);
      };
      reader.readAsDataURL(this.editProfilePhotoFile);
    } else {
      this.saveProfileChanges(updatedData);
    }
  }

  saveProfileChanges(updatedData: any): void {
    if (Object.keys(updatedData).length === 0) {
      this.message.info('No changes to save');
      this.handleCancelEditProfile();
      return;
    }

    this.message.loading('Updating profile...', { nzDuration: 0 });
    
    const userToUpdate: any = {
      id: this.currentUser.id,
      firstName: this.editProfileData.firstName || this.currentUser.firstName,
      middleName: this.editProfileData.middleName || this.currentUser.middleName || '',
      lastName: this.editProfileData.lastName || this.currentUser.lastName,
      contact: this.editProfileData.phone || this.currentUser.contact,
      department: this.editProfileData.department || this.currentUser.department,
      position: this.editProfileData.position || this.currentUser.position,
      username: this.editProfileData.username || this.currentUser.username,
      email: this.editProfileData.email || this.currentUser.email,
      password: this.currentUser.password
    };
    
    if (this.currentUser.photo) {
      userToUpdate.photo = this.currentUser.photo;
    }
    
    if (this.editProfilePhotoFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        userToUpdate.photo = e.target?.result as string;
        this.sendUpdateRequest(userToUpdate);
      };
      reader.readAsDataURL(this.editProfilePhotoFile);
    } else {
      this.sendUpdateRequest(userToUpdate);
    }
  }

  private sendUpdateRequest(userToUpdate: any): void {
    this.userService.updateUser(this.currentUser.id, userToUpdate).subscribe({
      next: (response) => {
        this.message.remove();
        this.message.success('Profile updated successfully!');
        
        this.currentUser = response;
        this.userDisplayName = this.getDisplayName(this.currentUser);
        this.handleCancelEditProfile();
        
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      },
      error: (error) => {
        this.message.remove();
        this.message.error('Failed to update profile. Please try again.');
        console.error('Error updating profile:', error);
      }
    });
  }

  onEditProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        this.message.warning('File size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        this.message.warning('Please select an image file');
        return;
      }

      this.editProfilePhotoFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.editProfilePhotoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  isEditProfileFormValid(): boolean {
    return true;
  }
}