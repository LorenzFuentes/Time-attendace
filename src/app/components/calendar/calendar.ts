import { Component, OnInit } from '@angular/core';
import { DatePipe, NgClass, CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { EventService } from '../../service/event-service/event';
import { LeaveService } from '../../service/leave-service/leave'; 
import { AttendanceService } from '../../service/attendance-service/attendance';

interface CalendarEvent {
  id: string;
  eventType: 'meeting' | 'activity';
  date: string;
  time: string;
  description: string;
}

interface Leave {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  apply: string; 
  dateFrom: string;
  dateTo: string;
  reason: string;
  approval: string;
  dateOfApproval: string;
}

interface Attendance {
  id: string;
  date: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  timeIn: string;
  timeOut: string;
  status: string;
}

interface LeaveWithDates extends Leave {
  isStartDate: boolean;
  isEndDate: boolean;
}

@Component({
  selector: 'app-calendar',
  imports: [
    CommonModule,
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzCalendarModule,
    NzBadgeModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzRadioModule,
    NzDatePickerModule,
    NzTimePickerModule,
    NzInputModule,
  ],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.scss'],
})
export class Calendar implements OnInit {
  addEventForm!: FormGroup;
  isAddModalVisible = false;
  isViewModalVisible = false;
  eventData: CalendarEvent[] = [];
  leaveData: Leave[] = [];
  attendanceData: Attendance[] = [];
  selectedValue = new Date();
  today = new Date();

  constructor(
    private eventService: EventService,
    private leaveService: LeaveService,
    private fb: FormBuilder,
    private message: NzMessageService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadLeaves();
    this.loadAttendance();
    this.initForm();
  }

  initForm(): void {
    this.addEventForm = this.fb.group({
      eventType: ['meeting', [Validators.required]],
      date: [null, [Validators.required]],
      time: [null, [Validators.required]],
      description: [null, [Validators.required]],
    });
  }

  loadEvents(): void {
    this.eventService.getEvents().subscribe({
      next: (events: any[]) => {
        this.eventData = events.map(event => ({
          id: event.id.toString(),
          eventType: event.eventType,
          date: event.date,
          time: event.time,
          description: event.description
        }));
      },
      error: (error) => {
        this.message.error('Failed to load events');
        this.eventData = [];
      },
    });
  }

  loadAttendance(): void {
    this.attendanceService.getAttendance().subscribe({
      next: (attendance: any[]) => {
        this.attendanceData = attendance.map(record => ({
          id: record.id,
          date: record.date,
          employeeId: record.employeeId,
          firstName: record.firstName,
          lastName: record.lastName,
          position: record.position,
          department: record.department,
          timeIn: record['time-in'],
          timeOut: record['time-out'],
          status: record.status
        }));
      },
      error: (error) => {
        this.message.error('Failed to load attendance records');
        this.attendanceData = [];
      }
    });
  }

  loadLeaves(): void {
    this.leaveService.getLeaveRecords().subscribe({
      next: (leaves: any[]) => {
        this.leaveData = leaves
          .filter(leave => leave.approval === 'Approved')
          .map(leave => ({
            id: leave.id,
            userId: leave.userId,
            firstName: leave.firstName,
            lastName: leave.lastName,
            position: leave.position,
            department: leave.department,
            apply: leave.apply,
            dateFrom: leave['date-from'], 
            dateTo: leave['date-to'],    
            reason: leave.reason,
            approval: leave.approval,
            dateOfApproval: leave['date-of-approval']
          }));
      },
      error: (error) => {
        this.leaveData = [];
      },
    });
  }

  selectChange(select: Date): void {
    console.log(`Selected date: ${select}`);
  }

  showAddModal(): void {
    this.isAddModalVisible = true;
    this.resetForm();
  }

  handleCancel(): void {
    this.isAddModalVisible = false;
    this.resetForm();
  }

  openViewModal(): void {
    this.isViewModalVisible = true;
  }

  closeViewModal(): void {
    this.isViewModalVisible = false;
  }

  handleOk(): void {
    if (this.isFormValid()) {
      const formValue = this.addEventForm.value;
      const nextId = this.generateNextId();
      
      const newEvent: CalendarEvent = {
        id: nextId.toString(), 
        eventType: formValue.eventType,
        date: this.formatDate(formValue.date),
        time: this.formatTime(formValue.time),
        description: formValue.description,
      };
      
      this.saveEvent(newEvent);
    }
  }

  resetForm(): void {
    this.addEventForm.reset({
      eventType: 'meeting'
    });
  }

  generateNextId(): number {
    if (this.eventData.length === 0) {
      return 1;
    }
    
    const ids = this.eventData
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

  saveEvent(newEvent: CalendarEvent): void {
    this.eventService.addEvent(newEvent).subscribe({
      next: (response) => {
        this.eventData = [...this.eventData, response];
        this.message.success('Event created successfully!');
        this.isAddModalVisible = false;
        this.resetForm();
      },
      error: (error) => {
        console.error('Error creating event:', error);
        this.message.error('Failed to create event');
      },
    });
  }

  isFormValid(): boolean {
    return this.addEventForm.valid;
  }

  formatDate(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTime(time: Date): string {
    if (!time) return '';
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getEventsByDate(date: Date): CalendarEvent[] {
    const dateStr = this.formatDate(date);
    return this.eventData.filter(event => event.date === dateStr);
  }

  getAttendanceByDate(date: Date): Attendance[] {
    const dateStr = this.formatDate(date);
    return this.attendanceData.filter(record => record.date === dateStr);
  }

  getLeavesByDate(date: Date): LeaveWithDates[] {
    const dateStr = this.formatDate(date);
    
    return this.leaveData
      .filter(leave => dateStr === leave.dateFrom || dateStr === leave.dateTo)
      .map(leave => ({
        ...leave,
        isStartDate: dateStr === leave.dateFrom,
        isEndDate: dateStr === leave.dateTo
      }));
  }

  getAllItemsByDate(date: Date): any[] {
    const events = this.getEventsByDate(date);
    const leaves = this.getLeavesByDate(date);
    const attendance = this.getAttendanceByDate(date);
    return [...events, ...leaves, ...attendance];
  }

  hasItems(date: Date): boolean {
    return this.getAllItemsByDate(date).length > 0;
  }

  getLeaveTypeClass(applyType: string): string {
    switch(applyType?.toLowerCase()) {
      case 'vacation':
        return 'leave-vacation';
      case 'sick':
        return 'leave-sick';
      case 'emergency':
        return 'leave-emergency';
      case 'personal':
        return 'leave-personal';
      default:
        return 'leave-other';
    }
  }

  getStatusBadge(status: string): string {
    switch(status?.toLowerCase()) {
      case 'present':
        return 'success';      // Green
      case 'absent':
        return 'error';        // Red
      case 'late':
        return 'warning';      // Orange/Yellow
      case 'on leave':
        return 'processing';   // Blue
      default:
        return 'default';      // Gray
    }
  }

  getMonthData(date: Date): number | null {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const eventsThisMonth = this.eventData.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });
    
    const leavesThisMonth = this.leaveData.filter(leave => {
      const fromDate = new Date(leave.dateFrom);
      const toDate = new Date(leave.dateTo);
      return (fromDate.getMonth() === month && fromDate.getFullYear() === year) ||
             (toDate.getMonth() === month && toDate.getFullYear() === year);
    });
    
    const attendanceThisMonth = this.attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === month && recordDate.getFullYear() === year;
    });
    
    const total = eventsThisMonth.length + leavesThisMonth.length + attendanceThisMonth.length;
    return total > 0 ? total : null;
  }

  getLeaveDisplayText(leave: LeaveWithDates): string {
    if (leave.isStartDate) {
      return `🏖️ ${leave.firstName} ${leave.lastName} (${leave.apply})`;
    } else if (leave.isEndDate) {
      return `🏁 ${leave.firstName} ${leave.lastName} (${leave.apply}) ending`;
    }
    return `🏖️ ${leave.firstName} ${leave.lastName} (${leave.apply})`;
  }

  getAttendanceDisplayText(record: Attendance): string {
    return `👤 ${record.firstName} ${record.lastName} (${record.status})`;
  }

  getAttendanceTooltip(record: Attendance): string {
    return `${record.firstName} ${record.lastName}\nPosition: ${record.position}\nDepartment: ${record.department}\nTime In: ${record.timeIn}\nTime Out: ${record.timeOut || '--'}\nStatus: ${record.status}`;
  }

  getLeaveTooltip(leave: LeaveWithDates): string {
    return `${leave.firstName} ${leave.lastName}\nType: ${leave.apply} leave\nFrom: ${leave.dateFrom} To: ${leave.dateTo}\nReason: ${leave.reason}`;
  }

  getEventDisplayText(event: CalendarEvent): string {
    const icon = event.eventType === 'meeting' ? '📅' : '📋';
    return `${icon} ${event.time} ${event.description}`;
  }
}