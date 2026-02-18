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
    NzBadgeModule
  ],
  templateUrl: './user-home.html',
  styleUrls: ['../../app.scss']
})
export class UserHome implements OnInit, OnDestroy {
  // User Info
  currentUser: any = null; // Stores the currently logged-in user data
  userDisplayName: string = 'Administrator'; // Display name for the UI
  currentDate = new Date(); // Current date for display
  currentTime = new Date(); // Current time for real-time clock
  private timeInterval: any; // Interval reference for clock updates

  // Time Tracking
  isTimedIn = false; // Flag indicating if user is currently timed in
  timeInTime: Date | null = null; // Timestamp of when user timed in
  timeOutTime: Date | null = null; // Timestamp of when user timed out
  totalHoursWorked = '0h 0m'; // Formatted string of total hours worked
  todayAttendance: any = null; // Today's attendance record
  attendanceData: any[] = []; // Array of all attendance records

  // Leave Modal
  isLeaveModalVisible = false; // Controls visibility of leave request modal

  // Leave Request Form
  leaveRequest = {
    type: 'vacation', // Type of leave (vacation, sick, emergency, personal)
    dateFrom: null,   // Start date of leave
    dateTo: null,     // End date of leave
    reason: '',       // Reason for leave request
    halfDay: false    // Flag for half-day leave
  };

  // Leave History
  leaveHistory: any[] = []; // Array of user's leave requests

  // Leave Balances
  leaveBalances = [
    { type: 'Vacation Leave', total: 15, used: 0, remaining: 15, color: '#52c41a' },
    { type: 'Sick Leave', total: 12, used: 0, remaining: 12, color: '#fa8c16' },
    { type: 'Emergency Leave', total: 5, used: 0, remaining: 5, color: '#f5222d' },
    { type: 'Personal Leave', total: 5, used: 0, remaining: 5, color: '#9379b0' }
  ];

  recentActivity: any[] = []; // Array of recent user activities for display

  private readonly LATE_THRESHOLD_HOUR = 21; // 9 PM threshold for late attendance
  private readonly LATE_THRESHOLD_MINUTE = 10; // 10 minutes past 9 PM
  private totalHoursInterval: any; // Interval reference for updating total hours


  constructor(
    private userService: UserService, // Service for user-related operations
    private attendanceService: AttendanceService, // Service for attendance-related operations
    private leaveService: LeaveService, // Service for leave-related operations
    private message: NzMessageService // Service for displaying toast messages
  ) {}

  // Lifecycle hook called when component initializes
  ngOnInit(): void {
    this.loadUserData(); // Load current user data
    this.startClock(); // Start the real-time clock
  }

  // Lifecycle hook called when component destroys
  ngOnDestroy(): void {
    // Clean up intervals to prevent memory leaks
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
     if (this.totalHoursInterval) { 
      clearInterval(this.totalHoursInterval);
    }
  }

  // Starts the real-time clock that updates every second
  startClock(): void {
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  // Loads user data from local storage and fetches related information
  loadUserData(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.currentUser = JSON.parse(userJson);
      this.userDisplayName = this.getDisplayName(this.currentUser);
      
      // Load additional user data
      this.loadTodayAttendance();
      this.loadUserLeaveHistory();
      this.loadRecentActivity();
    }
  }

  // Formats user display name based on available user properties
  getDisplayName(user: any): string {
    if (!user) return 'Administrator';
    
    if (user.firstName) {
      const names = [user.firstName]
        .filter(name => name && name.trim());
      if (names.length > 0) return names.join(' ');
    }
    
    if (user.name) return user.name;
    if (user.username) return user.username;
    
    return 'Administrator';
  }

  // Loads today's attendance record for the current user
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
          this.timeInTime = new Date(`${today}T${this.todayAttendance.timeIn}`);
          
          if (this.todayAttendance.timeOut) {
            this.timeOutTime = new Date(`${today}T${this.todayAttendance.timeOut}`);
            this.isTimedIn = false;
          } else {
            // Start auto-update if user is currently timed in (no time out yet)
            this.startTotalHoursUpdate();
          }
          
          this.calculateHoursWorked();
        }
      },
      error: (error) => {
        console.error('Error loading attendance:', error);
      }
    });
  }

  // Loads leave history for the current user
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

  // Loads recent activities (attendance and leave) for display
  loadRecentActivity(): void {
    forkJoin({
      attendance: this.attendanceService.getAttendance(),
      leaves: this.leaveService.getLeaveRecords()
    }).subscribe({
      next: (data) => {
        const activities = [];

        // Process attendance records for recent activity
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

        // Process leave records for recent activity
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
        
        // Sort and limit recent activities
        this.recentActivity = activities
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
      },
      error: (error) => {
        console.error('Error loading activities:', error);
      }
    });
  }

  // Updates leave balances based on approved leave requests
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

  // Calculates the number of days between two dates
  calculateLeaveDays(dateFrom: string, dateTo: string): number {
    if (!dateFrom || !dateTo) return 1;
    
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  // Check if a given time is late (after 9:10 PM)
  isLateTime(date: Date): boolean {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Late if after 9:00 PM
    return hours > this.LATE_THRESHOLD_HOUR || 
           (hours === this.LATE_THRESHOLD_HOUR && minutes > this.LATE_THRESHOLD_MINUTE);
  }

  // Get status based on time in
  getTimeInStatus(timeInDate: Date): string {
    return this.isLateTime(timeInDate) ? 'Late' : 'Present';
  }

  // Handles time in action
  timeIn(): void {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const dateString = now.toISOString().split('T')[0];

    // Determine status based on time
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
            this.timeInTime = now;
            this.todayAttendance = attendanceRecord;
            
            // Start auto-update of total hours
            this.startTotalHoursUpdate();
            
            // Add to recent activity
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

  // Generates the next available ID for attendance records
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

  // Handles time out action
  timeOut(): void {
    if (!this.todayAttendance) return;

    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const dateString = now.toISOString().split('T')[0];

    // Calculate total hours before updating
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
        
        // Stop auto-update of total hours
        this.stopTotalHoursUpdate();
        
        this.calculateHoursWorked(); // Final calculation
        
        // Add to recent activity
        this.recentActivity.unshift({
          action: 'Time Out',
          time: this.formatTime(now),
          date: dateString,
          status: 'default',
          statusText: `Total: ${this.totalHoursWorked}`
        });

        // Show success message with total hours
        this.message.success(
          `Timed out at ${this.formatTime(now)}. Total hours worked: ${this.totalHoursWorked}`
        );
      },
      error: (error) => {
        console.error('Error timing out:', error);
        this.message.error('Failed to time out. Please try again.');
      }
    });
  }

  // Starts automatic updating of total hours worked (every second)
  startTotalHoursUpdate(): void {
    // Clear any existing interval first
    if (this.totalHoursInterval) {
      clearInterval(this.totalHoursInterval);
    }
    
    // Update every second
    this.totalHoursInterval = setInterval(() => {
      if (this.isTimedIn && this.timeInTime) {
        this.calculateHoursWorked();
      }
    }, 1000);
  }

  // Stops automatic updating of total hours worked
  stopTotalHoursUpdate(): void {
    if (this.totalHoursInterval) {
      clearInterval(this.totalHoursInterval);
      this.totalHoursInterval = null;
    }
  }

  // Calculates total hours worked based on time in and time out
  calculateHoursWorked(): void {
    if (this.timeInTime) {
      const endTime = this.timeOutTime || new Date();
      this.totalHoursWorked = this.calculateHoursDifference(this.timeInTime, endTime);
    }
  }

  // Calculates the difference between two dates and returns formatted string
  calculateHoursDifference(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  }

  // Shows the leave request modal
  showLeaveModal(): void {
    this.isLeaveModalVisible = true;
  }

  // Handles cancel action for leave modal
  handleCancelLeave(): void {
    this.isLeaveModalVisible = false;
    this.resetLeaveForm();
  }

  // Submits a new leave request
  submitLeaveRequest(): void {
    // Validate required fields
    if (!this.leaveRequest.dateFrom || !this.leaveRequest.dateTo || !this.leaveRequest.reason) {
      this.message.warning('Please fill in all required fields');
      return;
    }

    const days = this.calculateDays();

    // Check leave balance
    const balance = this.leaveBalances.find(b => 
      b.type === this.getLeaveTypeLabel(this.leaveRequest.type)
    );
    
    if (balance && days > balance.remaining) {
      this.message.error(`Insufficient leave balance. Remaining: ${balance.remaining} days`);
      return;
    }

    // Fetch existing records to generate new ID
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
            // Add to leave history
            this.leaveHistory.unshift({
              id: response.id,
              type: this.getLeaveTypeLabel(this.leaveRequest.type),
              dateFrom: this.formatDate(this.leaveRequest.dateFrom),
              dateTo: this.formatDate(this.leaveRequest.dateTo),
              reason: this.leaveRequest.reason,
              status: 'Pending',
              days: days
            });

            // Add to recent activity
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

  // Generates the next available ID for leave records
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

  // Calculates number of days for leave request
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

  // Resets the leave request form to default values
  resetLeaveForm(): void {
    this.leaveRequest = {
      type: 'vacation',
      dateFrom: null,
      dateTo: null,
      reason: '',
      halfDay: false
    };
  }

  // Formats a date object to time string (HH:MM AM/PM)
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // Formats a date object to date string (YYYY-MM-DD)
  formatDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  }

  // Converts apply type to display label
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

  // Alias for getApplyTypeLabel
  getLeaveTypeLabel(type: string): string {
    return this.getApplyTypeLabel(type);
  }

  // Returns color code based on status for UI display
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
   openNotifications() {

    console.log('Notifications opened');
  }
}