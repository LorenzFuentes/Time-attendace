import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { debounceTime, Subject, Subscription } from 'rxjs';
import { LeaveService } from '../../service/leave-service/leave';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as Papa from 'papaparse';
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
    NzIconModule,
    NzModalModule, // Add this
    NzTabsModule, 
  ],
  templateUrl: './leave.table.html',
  styleUrls: ['../../app.scss']
})
export class LeaveTable implements OnInit {
  leaveData: any[] = [];
  filteredData: any[] = [];
  isLoading = false;
  editCache: { [key: string]: { edit: boolean; data: any } } = {};

  searchValue: string = '';

  private timer: any; 
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;


  isPendingModalVisible = false;
  
  pendingLeaves = [
    {
      id: '1',
      name: 'Lorenz Fuentes',
      department: 'IT',
      leaveType: 'Vacation',
      dateFrom: '2024-03-15',
      dateTo: '2024-03-20',
      reason: 'Family vacation',
      status: 'Pending'
    },
    {
      id: '2',
      name: 'Marc Zapata',
      department: 'HR',
      leaveType: 'Sick Leave',
      dateFrom: '2024-03-10',
      dateTo: '2024-03-12',
      reason: 'Medical leave',
      status: 'Pending'
    },
    {
      id: '3',
      name: 'Ralph Cruz',
      department: 'Operations',
      leaveType: 'Emergency Leave',
      dateFrom: '2024-03-05',
      dateTo: '2024-03-07',
      reason: 'Family emergency',
      status: 'Pending'
    }
  ];
  constructor(private leaveService: LeaveService, private message: NzMessageService,) {}

  ngOnInit(): void {
    this.loadLeaveData();

    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(searchTerm => {
        this.filterAttendance(searchTerm);
      });
  }

  loadLeaveData(): void {
    this.isLoading = true;
    this.leaveService.getLeaveRecords().subscribe({
      next: (data: any[]) => { 
        this.leaveData = data;
        this.filteredData = [...data];
        this.updateEditCache();
        this.isLoading = false;
      },
      error: (error: any) => { 
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

  private filterAttendance(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredData = [...this.leaveData];
    } else {
      this.filteredData = this.leaveData.filter(item => {
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
    
    // Update to server using LeaveService
    this.leaveService.updateLeaveRecord(id, this.leaveData[index]).subscribe({
      next: () => console.log('Leave record updated'),
      error: (error: any) => console.error('Error updating leave:', error)
    });
  }

  deleteRecord(id: string): void {
    const index = this.leaveData.findIndex(item => item.id === id);
    if (index !== -1) {
      this.leaveService.deleteLeaveRecord(id).subscribe({
        next: () => {
          this.leaveData.splice(index, 1);
          this.filteredData = [...this.leaveData];
          delete this.editCache[id];
        },
        error: (error: any) => console.error('Error deleting leave:', error) 
      });
    }
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

  // Simple modal methods
  showPendingModal(): void {
    this.isPendingModalVisible = true;
  }

  handleCancelModal(): void {
    this.isPendingModalVisible = false;
  }

  approveLeave(item: any): void {
    this.message.success(`Approved leave for ${item.name}`);
    // Remove from pending
    const index = this.pendingLeaves.indexOf(item);
    if (index > -1) {
      this.pendingLeaves.splice(index, 1);
    }
  }

  rejectLeave(item: any): void {
    this.message.warning(`Rejected leave for ${item.name}`);
    // Remove from pending
    const index = this.pendingLeaves.indexOf(item);
    if (index > -1) {
      this.pendingLeaves.splice(index, 1);
    }
  }

  getPendingCount(): number {
    return this.pendingLeaves.length;
  }

  exportToPDF(): void { 
    if (!this.filteredData || this.filteredData.length === 0) {
      this.message.warning('No attendance data to export');
      return;
    }

    this.isLoading = true;

    try{
      const doc = new jsPDF('landscape');
      const currentDate = new Date();

      doc.setFontSize(18);
      doc.setTextColor(147, 121, 176);
      doc.text('Employee Leave Report', 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`, 14, 28);
      doc.text(`Total Employee Leave Records: ${this.filteredData.length}`, 14, 35);

      if (this.searchValue.trim()) {
        doc.text(`Search Filter: "${this.searchValue}"`, 14, 42);
      }

      const header = [
        ['Employee Name', 'Position', 'Department', 'Leave Type', 'Date From', 'Date To', 'Reason', 'Status','Approval Status']
      ];

      const data = this.filteredData.map(item => [
        item.firstName + ' ' + item.lastName || 'N/A',
        item.position || 'N/A',
        item.department || 'N/A',
        item.apply || 'N/A',
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
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
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

  exportToCSV() {
    if (!this.filteredData || this.filteredData.length === 0) {
      this.message.warning('No leave data to export');
      return;
    }

    this.isLoading = true;

    const exportData = this.filteredData.map(item => ({
      'Employee Name': item.firstName + ' ' + item.lastName || 'N/A',
      'Position': item.position || 'N/A',
      'Department': item.department || 'N/A',
      'Leave Type': item.apply || 'N/A',
      'Date From': item['date-from'] || 'N/A',
      'Date To': item['date-to'] || 'N/A',
      'Reason': item.reason || 'N/A',
      'Status': item.approval || 'N/A',
      'Approval Date': item['date-of-approval'] || 'N/A'
    }));

    const fileName = `leave-report-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}.xlsx`;
    
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
}