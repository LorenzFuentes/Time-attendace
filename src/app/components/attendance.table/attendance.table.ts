import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../service/attendance-service/attendance';
import { UserService } from '../../service/user-service/user';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { getISOWeek } from 'date-fns';
import { en_US, NzI18nService, zh_CN } from 'ng-zorro-antd/i18n';

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
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';

// Search
import { debounceTime, Subject, Subscription } from 'rxjs';

// PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Excel
import * as Papa from 'papaparse';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  email?: string;
  phone?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  'time-in': string;
  'time-out': string;
  status: string;
}

@Component({
  selector: 'app-attendance.table',
  standalone: true,
  imports: [CommonModule,FormsModule,ReactiveFormsModule,HttpClientModule,NzTableModule,NzTagModule,NzInputModule,NzButtonModule,
    NzSelectModule,NzPopconfirmModule,NzIconModule,NzAlertModule,NzCalendarModule,NzModalModule,NzFormModule,NzDatePickerModule,NzTimePickerModule
  ],
  templateUrl: './attendance.table.html',
  styleUrls: ['../../app.scss']
})
export class AttendanceTable implements OnInit {
  attendanceData: any[] = [];
  filteredData: any[] = [];
  isLoading = false;
  editCache: { [key: string]: { edit: boolean; data: any } } = {};
  currentDateTime: string = '';
  currentDate: string = '';
  searchValue: string = '';

  // Modal properties
  isAddModalVisible = false;
  addAttendanceForm!: FormGroup;
  selectedEmployee: Employee | null = null;
  employeeList: Employee[] = [];
  isEmployeesLoading = false;
  
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  // Date picker properties
  date = null;
  isEnglish = false;

  constructor(
    private attendanceService: AttendanceService,
    private userService: UserService,
    private message: NzMessageService,
    private fb: FormBuilder,
    private modal: NzModalService,
    private i18n: NzI18nService
  ) {}

  ngOnInit(): void {
    this.loadAttendanceData();
    this.loadEmployeeList();
    this.initForm();

    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(searchTerm => {
        this.filterAttendance(searchTerm);
      });
  }

  // ========== DATE PICKER METHODS ==========
  onChange(result: Date): void {
    console.log('onChange: ', result);
  }

  getWeek(result: Date): void {
    console.log('week: ', getISOWeek(result));
  }

  changeLanguage(): void {
    this.i18n.setLocale(this.isEnglish ? zh_CN : en_US);
    this.isEnglish = !this.isEnglish;
  }

  // ========== MODAL METHODS ==========
  initForm(): void {
    this.addAttendanceForm = this.fb.group({
      employeeId: [null, [Validators.required]],
      date: [null, [Validators.required]],
      timeIn: [null, [Validators.required]],
      timeOut: [null],
      status: ['present', [Validators.required]]
    });
  }

  showAddModal(): void {
    if (this.employeeList.length === 0) {
      this.loadEmployeeList();
    }
    
    this.isAddModalVisible = true;
    this.selectedEmployee = null;
    this.addAttendanceForm.reset({
      status: 'present'
    });
  }

  handleCancel(): void {
    this.isAddModalVisible = false;
    this.addAttendanceForm.reset();
    this.selectedEmployee = null;
  }

  handleOk(): void {
    if (this.isFormValid()) {
      const formValue = this.addAttendanceForm.value;
      const selectedEmp = this.employeeList.find(emp => emp.id === formValue.employeeId);
      
      if (selectedEmp) {
        // Generate the next numerical ID as string
        const nextId = this.generateNextId().toString();
        
        const newAttendance: any = {
          id: nextId,
          date: this.formatDate(formValue.date),
          employeeId: formValue.employeeId,
          firstName: selectedEmp.firstName,
          lastName: selectedEmp.lastName,
          position: selectedEmp.position,
          department: selectedEmp.department,
          'time-in': this.formatTime(formValue.timeIn),
          'time-out': formValue.timeOut ? this.formatTime(formValue.timeOut) : '--',
          status: formValue.status
        };

        // Save to service
        this.saveAttendance(newAttendance);
      }
    }
  }

  saveAttendance(newAttendance: any): void {
    this.attendanceService.addAttendance(newAttendance).subscribe({
      next: (response) => {
        this.attendanceData.push(response);
        this.filteredData = [...this.attendanceData];
        this.updateEditCache();
        
        // Show success message and close modal
        this.message.success('Attendance record added successfully!');
        this.isAddModalVisible = false;
        this.addAttendanceForm.reset();
        this.selectedEmployee = null;
      },
      error: (error) => {
        console.error('Error adding attendance:', error);
        this.message.error('Failed to add attendance record');
      }
    });
  }

  generateNextId(): number {
    if (this.attendanceData.length === 0) {
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

  onEmployeeChange(employeeId: string): void {
    this.selectedEmployee = this.employeeList.find(emp => emp.id === employeeId) || null;
  }

  isFormValid(): boolean {
    return this.addAttendanceForm.valid && !!this.addAttendanceForm.value.employeeId;
  }

  // ========== TABLE EDIT METHODS ==========
  updateEditCache(): void {
    this.editCache = {};
    this.attendanceData.forEach(item => {
      // Use ID as the key instead of date
      this.editCache[item.id] = {
        edit: false,
        data: { ...item }
      };
    });
  }

  startEdit(id: string): void {
    if (this.editCache[id]) {
      // Make sure we have the latest data in the edit cache
      const record = this.attendanceData.find(item => item.id === id);
      if (record) {
        this.editCache[id].data = { ...record };
      }
      this.editCache[id].edit = true;
    }
  }

  cancelEdit(id: string): void {
    const record = this.attendanceData.find(item => item.id === id);
    if (record) {
      this.editCache[id] = {
        data: { ...record },
        edit: false
      };
    }
  }

  saveEdit(id: string): void {
    if (!this.isEditFormValid(id)) {
      this.message.error('Please fill all required fields');
      return;
    }

    const index = this.attendanceData.findIndex(item => item.id === id);
    if (index !== -1 && this.editCache[id]) {
      const existingId = this.attendanceData[index].id?.toString() || '';
      
      // Get the edited data
      const updatedData = {
        ...this.editCache[id].data,
        id: existingId
      };
      
      // Call service to update
      this.attendanceService.updateAttendance(existingId, updatedData).subscribe({
        next: () => {
          // Update local data
          Object.assign(this.attendanceData[index], updatedData);
          
          // Update filtered data if not searching
          if (!this.searchValue.trim()) {
            this.filteredData = [...this.attendanceData];
          } else {
            // Re-apply current search filter
            this.filterAttendance(this.searchValue);
          }
          
          // Exit edit mode
          this.editCache[id].edit = false;
          
          // Update the cache with the new data
          this.editCache[id].data = { ...this.attendanceData[index] };
          
          this.message.success('Attendance updated successfully');
        },
        error: (error: any) => {
          console.error('Error updating attendance:', error);
          this.message.error('Failed to update attendance');
        }
      });
    }
  }

  deleteRecord(id: string): void {
    const index = this.attendanceData.findIndex(item => item.id === id);
    if (index !== -1) {
      const recordId = this.attendanceData[index].id?.toString() || '';
      
      this.attendanceService.deleteAttendance(recordId).subscribe({
        next: () => {
          // Remove from local data
          this.attendanceData.splice(index, 1);
          
          // Update filtered data
          if (!this.searchValue.trim()) {
            this.filteredData = [...this.attendanceData];
          } else {
            this.filteredData = this.attendanceData.filter(item => {
              return (
                item.firstName?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                item.lastName?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                item.position?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                item.department?.toLowerCase().includes(this.searchValue.toLowerCase())
              );
            });
          }
          
          // Remove from edit cache
          delete this.editCache[id];
          
          this.message.success('Attendance deleted successfully');
        },
        error: (error: any) => {
          console.error('Error deleting attendance:', error);
          this.message.error('Failed to delete attendance');
        }
      });
    }
  }

  onEditEmployeeChange(id: string, employeeId: string): void {
    const selectedEmp = this.employeeList.find(emp => emp.id === employeeId);
    if (selectedEmp && this.editCache[id]) {
      this.editCache[id].data.firstName = selectedEmp.firstName;
      this.editCache[id].data.lastName = selectedEmp.lastName;
      this.editCache[id].data.position = selectedEmp.position;
      this.editCache[id].data.department = selectedEmp.department;
      this.editCache[id].data.employeeId = employeeId;
    }
  }

  getEmployeePosition(employeeId: string): string {
    if (!employeeId) return '';
    const emp = this.employeeList.find(e => e.id === employeeId);
    return emp ? emp.position : '';
  }

  getEmployeeDepartment(employeeId: string): string {
    if (!employeeId) return '';
    const emp = this.employeeList.find(e => e.id === employeeId);
    return emp ? emp.department : '';
  }

  isEditFormValid(id: string): boolean {
    const data = this.editCache[id]?.data;
    if (!data) return false;
    
    return !!(
      data.date?.trim() &&
      data.employeeId?.trim() &&
      data.status?.trim() &&
      data['time-in']?.trim()
    );
  }

  // ========== EMPLOYEE METHODS ==========
  loadEmployeeList(): void {
    this.isEmployeesLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (users: any[]) => {
        this.employeeList = users.map(user => ({
          id: user.id || user._id || user.employeeId || user.userId || `emp-${Date.now()}`,
          firstName: user.firstName || user.firstname || user.fname || 'Unknown',
          lastName: user.lastName || user.lastname || user.lname || 'User',
          position: user.position || user.role || user.jobTitle || 'Not specified',
          department: user.department || 'Not specified',
          email: user.email || '',
          phone: user.phone || user.mobile || ''
        }));
        
        this.employeeList = this.employeeList.filter(emp =>
          emp.firstName && emp.lastName && emp.firstName !== 'Unknown' && emp.lastName !== 'User'
        );
        
        this.isEmployeesLoading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.message.error('Failed to load employee list');
        this.isEmployeesLoading = false;
        this.loadEmployeesFromAttendanceData();
      }
    });
  }

  loadEmployeesFromAttendanceData(): void {
    const uniqueEmployees = new Map();
    this.attendanceData.forEach(record => {
      if (record.firstName && record.lastName) {
        const key = `${record.firstName}-${record.lastName}`;
        if (!uniqueEmployees.has(key)) {
          uniqueEmployees.set(key, {
            id: record.employeeId || record.id || key,
            firstName: record.firstName,
            lastName: record.lastName,
            position: record.position || 'Not specified',
            department: record.department || 'Not specified'
          });
        }
      }
    });
    
    this.employeeList = Array.from(uniqueEmployees.values());
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

  // ========== UTILITY METHODS ==========
  disabledFutureDates = (current: Date): boolean => {
    return current > new Date();
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

  // ========== SEARCH AND FILTER ==========
  private filterAttendance(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredData = [...this.attendanceData];
    } else {
      this.filteredData = this.attendanceData.filter(item => {
        return (
          item.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.department?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    this.updateEditCache();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchValue);
  }

  onSearchClick(): void {
    this.filterAttendance(this.searchValue);
  }
  
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'present': 'Present',
      'absent': 'Absent',
      'late': 'Late',
      'leave': 'On Leave',
      'half-day': 'Half Day'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'present': 'green',    
      'absent': 'red',       
      'late': 'orange',     
      'leave': 'blue',       
      'half-day': 'purple'  
    };
    return colorMap[status] || 'default';
  }

  exportTableToPDF(): void {
    if (!this.filteredData || this.filteredData.length === 0) {
      this.message.warning('No attendance data to export');
      return;
    }

    this.isLoading = true;

    try{
      const doc = new jsPDF('landscape');
      const currentDate = new Date();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(147,121,176);
      doc.text('Employee Attendance Report', 14, 20);
      
      // Subtitle
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`, 14, 28);
      doc.text(`Total Employee Attendance Records: ${this.filteredData.length}`, 14, 35);

      if (this.searchValue.trim()) {
        doc.text(`Search Filter: "${this.searchValue}"`, 14, 42);
      }

      const header = [
        [ 'Date', 'First Name', 'Last Name', 'Position', 'Department', 'Time-in', 'Time-out', 'Status']
      ];

      const data = this.filteredData.map(item => [
        item.date || 'N/A',
        item.firstName || 'N/A',
        item.lastName || 'N/A',
        item.position || 'N/A',
        item.department || 'N/A',
        item['time-in'] || 'N/A',
        item['time-out'] || 'N/A',
        this.getStatusLabel(item.status) || 'N/A'
      ]);

      // Add table to PDF
      autoTable(doc, {
        head: header,
        body: data,
        startY: this.searchValue.trim() ? 50 : 45,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          lineWidth: 0.1,
          halign: 'left'
        },
        headStyles: {
          fillColor: [147,121,176],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          lineWidth: 0.1
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 45 },
          3: { cellWidth: 60 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 }
        },
        margin: { top: this.searchValue.trim() ? 50 : 45 }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 40,
          doc.internal.pageSize.height - 10
        );
      }
      
      const fileName = `attendance-report-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}.pdf`;
      doc.save(fileName);
      
      this.message.success(`PDF exported with ${this.filteredData.length} attendance records!`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.message.error('Failed to export PDF. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  exportTableToExcel() {
    if (!this.filteredData || this.filteredData.length === 0) {
      this.message.warning('No attendance data to export');
      return;
    }

    this.isLoading = true;

    const currentDate = new Date();

    const exportData = this.filteredData.map(item => ({
      Date: item.date || 'N/A',
      'First Name': item.firstName || 'N/A',
      'Last Name': item.lastName || 'N/A',
      Position: item.position || 'N/A',
      Department: item.department || 'N/A',
      'Time-in': item['time-in'] || 'N/A',
      'Time-out': item['time-out'] || 'N/A',
      Status: this.getStatusLabel(item.status) || 'N/A'
    }));

    const fileName = `attendance-report-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}.xlsx`;

    try {
      const csv = Papa.unparse(exportData, {
        delimiter: ",",
        header: true,
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        escapeFormulae: true,
        skipEmptyLines: true,
        newline: "\r\n"
      });
    
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.download = `${fileName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.message.success('Export completed successfully');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      this.message.error('Failed to export Excel. Please try again.');
    } finally {
      this.isLoading = false;
    }
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
}