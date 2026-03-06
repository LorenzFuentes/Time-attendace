import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';

// NG-ZORRO Modules
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzBadgeModule } from 'ng-zorro-antd/badge'; // Add this for badge

// Search
import { debounceTime, Subject, Subscription } from 'rxjs';

// Service
import { LeaveService } from '../../service/leave-service/leave';
import { UserService } from '../../service/user-service/user';

// PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// CSV
import * as Papa from 'papaparse';

// Interfaces
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  email?: string;
  phone?: string;
}

interface LeaveRecord {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  apply: string;
  'date-from': string;
  'date-to': string;
  reason: string;
  approval: string;
  'date-of-approval'?: string;
}

@Component({
  selector: 'app-leave-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NzTableModule,
    NzTagModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzDatePickerModule,
    NzIconModule,
    NzModalModule,
    NzTabsModule,
    NzFormModule,
    NzBadgeModule // Add this
  ],
  templateUrl: './leave.table.html',
  styleUrls: ['../../app.scss']
})
export class LeaveTable implements OnInit, OnDestroy {
  // Data arrays
  leaveData: LeaveRecord[] = [];
  filteredData: LeaveRecord[] = [];
  pendingLeaves: LeaveRecord[] = [];
  
  // Loading states
  isLoading = false;
  isPendingLoading = false;
  isEmployeesLoading = false;
  
  // Edit cache
  editCache: { [key: string]: { edit: boolean; data: any } } = {};

  // Search
  searchValue: string = '';
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  // Modal properties
  isAddModalVisible = false;
  isPendingModalVisible = false;
  addLeaveForm!: FormGroup;
  employeeList: Employee[] = [];
  selectedEmployee: Employee | null = null;
  
  constructor(
    private leaveService: LeaveService,
    private userService: UserService,
    private message: NzMessageService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadLeaveData();
    this.loadEmployeeList();
    this.initForm();
    
    // Setup search with debounce
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(searchTerm => {
        this.filterLeaveData(searchTerm);
      });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // ========== FORM INITIALIZATION ==========
  initForm(): void {
    this.addLeaveForm = this.fb.group({
      employeeId: [null, [Validators.required]],
      apply: ['leave', [Validators.required]],
      dateFrom: [null, [Validators.required]],
      dateTo: [null, [Validators.required]],
      reason: [null, [Validators.required]]
    });
  }

  // ========== DATA LOADING METHODS ==========
  loadLeaveData(): void {
    this.isLoading = true;
    this.leaveService.getLeaveRecords().subscribe({
      next: (data: any[]) => {
        this.leaveData = data;
        this.filteredData = [...data];
        this.updateEditCache();
        this.updatePendingCount(); // Update pending count immediately
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading leave data:', error);
        this.message.error('Failed to load leave records');
        this.isLoading = false;
      }
    });
  }

  loadPendingLeaves(): void {
    this.isPendingLoading = true;
    this.leaveService.getLeaveRecords().subscribe({
      next: (data: any[]) => {
        this.pendingLeaves = data.filter(record => record.approval === 'Pending');
        this.isPendingLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading pending leaves:', error);
        this.message.error('Failed to load pending requests');
        this.isPendingLoading = false;
      }
    });
  }

  // New method to update pending count without full reload
  updatePendingCount(): void {
    this.pendingLeaves = this.leaveData.filter(record => record.approval === 'Pending');
  }

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
        this.loadEmployeesFromLeaveData();
      }
    });
  }

  loadEmployeesFromLeaveData(): void {
    const uniqueEmployees = new Map();
    this.leaveData.forEach(record => {
      if (record.firstName && record.lastName) {
        const key = `${record.firstName}-${record.lastName}`;
        if (!uniqueEmployees.has(key)) {
          uniqueEmployees.set(key, {
            id: record.id || key,
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

  // ========== ADD MODAL METHODS ==========
  showAddModal(): void {
    if (this.employeeList.length === 0) {
      this.loadEmployeeList();
    }
    
    this.isAddModalVisible = true;
    this.selectedEmployee = null;
    this.addLeaveForm.reset({
      apply: 'leave'
    });
  }

  handleCancel(): void {
    this.isAddModalVisible = false;
    this.addLeaveForm.reset();
    this.selectedEmployee = null;
  }

  handleOk(): void {
    if (this.isAddFormValid()) {
      const formValue = this.addLeaveForm.value;
      const selectedEmp = this.employeeList.find(emp => emp.id === formValue.employeeId);
      
      if (selectedEmp) {
        const nextId = this.generateNextId().toString();
        
        const newLeave: any = {
          id: nextId,
          firstName: selectedEmp.firstName,
          lastName: selectedEmp.lastName,
          position: selectedEmp.position,
          department: selectedEmp.department,
          apply: formValue.apply,
          'date-from': this.formatDate(formValue.dateFrom),
          'date-to': this.formatDate(formValue.dateTo),
          reason: formValue.reason,
          approval: 'Pending', // New leaves start as Pending
          'date-of-approval': ''
        };

        this.saveLeave(newLeave);
      }
    }
  }

  saveLeave(newLeave: any): void {
    this.leaveService.addLeaveRecord(newLeave).subscribe({
      next: (response) => {
        this.leaveData.push(response);
        this.filteredData = [...this.leaveData];
        this.updateEditCache();
        this.updatePendingCount(); // Update pending count after adding
        
        this.message.success('Leave request added successfully!');
        this.isAddModalVisible = false;
        this.addLeaveForm.reset();
        this.selectedEmployee = null;
      },
      error: (error) => {
        console.error('Error adding leave:', error);
        this.message.error('Failed to add leave request');
      }
    });
  }

  generateNextId(): number {
    if (this.leaveData.length === 0) {
      return 1;
    }
    
    const ids = this.leaveData
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

  isAddFormValid(): boolean {
    return this.addLeaveForm.valid && !!this.addLeaveForm.value.employeeId;
  }

  formatDate(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ========== EDIT METHODS ==========
  updateEditCache(): void {
    this.editCache = {};
    this.leaveData.forEach(item => {
      this.editCache[item.id] = {
        edit: false,
        data: { ...item }
      };
    });
  }

  startEdit(id: string): void {
    if (this.editCache[id]) {
      const record = this.leaveData.find(item => item.id === id);
      if (record) {
        this.editCache[id].data = { ...record };
      }
      this.editCache[id].edit = true;
    }
  }

  cancelEdit(id: string): void {
    const record = this.leaveData.find(item => item.id === id);
    if (record) {
      this.editCache[id] = {
        data: { ...record },
        edit: false
      };
    }
  }

  saveEdit(id: string): void {
    if (!this.isFormValid(id)) {
      this.message.error('Please fill all required fields');
      return;
    }

    const index = this.leaveData.findIndex(item => item.id === id);
    if (index !== -1 && this.editCache[id]) {
      const existingId = this.leaveData[index].id?.toString() || '';
      
      const updatedData = {
        ...this.editCache[id].data,
        id: existingId
      };
      
      this.leaveService.updateLeaveRecord(id, updatedData).subscribe({
        next: () => {
          Object.assign(this.leaveData[index], updatedData);
          
          if (!this.searchValue.trim()) {
            this.filteredData = [...this.leaveData];
          } else {
            this.filterLeaveData(this.searchValue);
          }
          
          this.editCache[id].edit = false;
          this.editCache[id].data = { ...this.leaveData[index] };
          
          // Update pending count after edit
          this.updatePendingCount();
          
          if (this.isPendingModalVisible) {
            this.loadPendingLeaves();
          }
          
          this.message.success('Leave record updated successfully');
        },
        error: (error: any) => {
          console.error('Error updating leave:', error);
          this.message.error('Failed to update leave record');
        }
      });
    }
  }

  deleteRecord(id: string): void {
    const index = this.leaveData.findIndex(item => item.id === id);
    if (index !== -1) {
      const recordId = this.leaveData[index].id?.toString() || '';
      
      this.leaveService.deleteLeaveRecord(recordId).subscribe({
        next: () => {
          this.leaveData.splice(index, 1);
          
          if (!this.searchValue.trim()) {
            this.filteredData = [...this.leaveData];
          } else {
            this.filteredData = this.leaveData.filter(item => {
              return (
                item.firstName?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                item.lastName?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                item.position?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                item.department?.toLowerCase().includes(this.searchValue.toLowerCase())
              );
            });
          }
          
          delete this.editCache[id];
          
          // Update pending count after delete
          this.updatePendingCount();
          
          if (this.isPendingModalVisible) {
            this.loadPendingLeaves();
          }
          
          this.message.success('Leave record deleted successfully');
        },
        error: (error: any) => {
          console.error('Error deleting leave:', error);
          this.message.error('Failed to delete leave record');
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
    }
  }

  isFormValid(id: string): boolean {
    const data = this.editCache[id]?.data;
    if (!data) return false;
    
    return !!(
      data.firstName?.trim() &&
      data.lastName?.trim() &&
      data['date-from']?.trim() &&
      data['date-to']?.trim() &&
      data.reason?.trim()
    );
  }

  // ========== SEARCH METHODS ==========
  private filterLeaveData(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredData = [...this.leaveData];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredData = this.leaveData.filter(item => {
        return (
          item.firstName?.toLowerCase().includes(term) ||
          item.lastName?.toLowerCase().includes(term) ||
          item.position?.toLowerCase().includes(term) ||
          item.department?.toLowerCase().includes(term) ||
          item.reason?.toLowerCase().includes(term) ||
          this.getApplyTypeLabel(item.apply)?.toLowerCase().includes(term)
        );
      });
    }
    this.updateEditCache();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchValue);
  }

  onSearchClick(): void {
    this.filterLeaveData(this.searchValue);
  }

  // ========== UI HELPER METHODS ==========
  getApprovalColor(approval: string): string {
    const colorMap: { [key: string]: string } = {
      'Approved': 'green',
      'Pending': 'gold',
      'Rejected': 'red'
    };
    return colorMap[approval] || 'default';
  }

  getApplyTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'leave': 'Leave',
      'sick': 'Sick Leave',
      'vacation': 'Vacation',
      'emergency': 'Emergency Leave'
    };
    return typeMap[type] || type || 'N/A';
  }

  getEmployeeName(record: any): string {
    return `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'N/A';
  }

  getPendingCount(): number {
    return this.pendingLeaves.length;
  }

  // ========== MODAL METHODS ==========
  showPendingModal(): void {
    this.isPendingModalVisible = true;
    this.loadPendingLeaves(); // Full reload when opening modal
  }

  handleCancelModal(): void {
    this.isPendingModalVisible = false;
  }

  // ========== APPROVAL METHODS ==========
  approveLeave(item: any): void {
    const today = new Date().toISOString().split('T')[0];
    const updatedRecord = { 
      ...item, 
      approval: 'Approved', 
      'date-of-approval': today 
    };
    
    this.leaveService.updateLeaveRecord(item.id, updatedRecord).subscribe({
      next: () => {
        this.message.success(`Approved leave for ${this.getEmployeeName(item)}`);
        
        // Update main data
        const mainIndex = this.leaveData.findIndex(d => d.id === item.id);
        if (mainIndex > -1) {
          this.leaveData[mainIndex] = updatedRecord;
          this.filterLeaveData(this.searchValue);
        }
        
        // Update pending count immediately
        this.updatePendingCount();
        
        // Update modal data if open
        if (this.isPendingModalVisible) {
          const pendingIndex = this.pendingLeaves.findIndex(p => p.id === item.id);
          if (pendingIndex > -1) {
            this.pendingLeaves.splice(pendingIndex, 1);
          }
        }
      },
      error: (error: any) => {
        console.error('Error approving leave:', error);
        this.message.error('Failed to approve leave');
      }
    });
  }

  rejectLeave(item: any): void {
    const today = new Date().toISOString().split('T')[0];
    const updatedRecord = { 
      ...item, 
      approval: 'Rejected', 
      'date-of-approval': today 
    };
    
    this.leaveService.updateLeaveRecord(item.id, updatedRecord).subscribe({
      next: () => {
        this.message.warning(`Rejected leave for ${this.getEmployeeName(item)}`);
        
        // Update main data
        const mainIndex = this.leaveData.findIndex(d => d.id === item.id);
        if (mainIndex > -1) {
          this.leaveData[mainIndex] = updatedRecord;
          this.filterLeaveData(this.searchValue);
        }
        
        // Update pending count immediately
        this.updatePendingCount();
        
        // Update modal data if open
        if (this.isPendingModalVisible) {
          const pendingIndex = this.pendingLeaves.findIndex(p => p.id === item.id);
          if (pendingIndex > -1) {
            this.pendingLeaves.splice(pendingIndex, 1);
          }
        }
      },
      error: (error: any) => {
        console.error('Error rejecting leave:', error);
        this.message.error('Failed to reject leave');
      }
    });
  }

  // ========== EXPORT METHODS ==========
  exportToPDF(): void {
    if (!this.filteredData || this.filteredData.length === 0) {
      this.message.warning('No leave data to export');
      return;
    }

    this.isLoading = true;

    try {
      const doc = new jsPDF('landscape');
      const currentDate = new Date();

      doc.setFontSize(18);
      doc.setTextColor(147, 121, 176);
      doc.text('Employee Leave Report', 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`, 14, 28);
      doc.text(`Total Leave Records: ${this.filteredData.length}`, 14, 35);

      if (this.searchValue.trim()) {
        doc.text(`Search Filter: "${this.searchValue}"`, 14, 42);
      }

      const header = [
        ['Employee Name', 'Position', 'Department', 'Leave Type', 'Date From', 'Date To', 'Reason', 'Status', 'Approval Date']
      ];

      const data = this.filteredData.map(item => [
        this.getEmployeeName(item),
        item.position || 'N/A',
        item.department || 'N/A',
        this.getApplyTypeLabel(item.apply),
        item['date-from'] || 'N/A',
        item['date-to'] || 'N/A',
        item.reason || 'N/A',
        item.approval || 'N/A',
        item['date-of-approval'] || 'N/A'
      ]);

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
          fillColor: [147, 121, 176],
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
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 40 },
          7: { cellWidth: 25 },
          8: { cellWidth: 25 }
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

      const fileName = `leave-report-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}.pdf`;
      doc.save(fileName);

      this.message.success(`PDF exported with ${this.filteredData.length} leave records!`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.message.error('Failed to export PDF. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  exportToCSV(): void {
    if (!this.filteredData || this.filteredData.length === 0) {
      this.message.warning('No leave data to export');
      return;
    }

    this.isLoading = true;

    try {
      const exportData = this.filteredData.map(item => ({
        'Employee Name': this.getEmployeeName(item),
        'Position': item.position || 'N/A',
        'Department': item.department || 'N/A',
        'Leave Type': this.getApplyTypeLabel(item.apply),
        'Date From': item['date-from'] || 'N/A',
        'Date To': item['date-to'] || 'N/A',
        'Reason': item.reason || 'N/A',
        'Status': item.approval || 'N/A',
        'Approval Date': item['date-of-approval'] || 'N/A'
      }));

      const currentDate = new Date();
      const fileName = `leave-report-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

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

      this.message.success(`CSV exported with ${this.filteredData.length} leave records!`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      this.message.error('Failed to export CSV. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }
}