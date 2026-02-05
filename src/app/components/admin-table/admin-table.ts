import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { NzIconModule } from 'ng-zorro-antd/icon';
import { debounceTime, Subject, Subscription } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';

import { AdminService } from '../../service/admin-service/admin';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzInputModule, NzPopconfirmModule, NzTableModule, NzButtonModule, NzSelectModule, NzTagModule, NzIconModule,],
  templateUrl: './admin-table.html',
  styleUrls: ['./admin-table.scss']
})
export class AdminTable implements OnInit, OnDestroy {
  editCache: { [key: string]: { edit: boolean; data: UserData } } = {};
  listOfData: UserData[] = [];
  filteredData: UserData[] = [];
  isLoading: boolean = true;

  accessLevels = [
    { value: 'admin', label: 'Admin' }
  ];
  isCollapsed = false;
  protected readonly date = new Date();

  currentUser: any = null;
  adminCount: number = 0;
  employeeCount: number = 0;
  currentDateTime: string = '';
  currentDate: string = '';

  // Search property
  searchValue: string = '';

  private timer: any; 
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private adminService: AdminService, 
    private message: NzMessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDataFromApi();
    this.loadCurrentUser();
    this.authService.currentUser$.subscribe((user: any) => {
      console.log('User observable updated:', user);
      this.currentUser = user;
    });
    
    this.loadDashboardStats();
    this.updateDateTime();
    this.timer = setInterval(() => this.updateDateTime(), 60000);
    
    // Subscribe to search input with debounce
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(searchTerm => {
        this.filterAdmins(searchTerm);
      });
  }

  private loadDataFromApi(): void {
    this.isLoading = true;
    this.adminService.getAllAdmins().subscribe({ 
      next: (data: any[]) => {
        this.listOfData = data.map(user => ({
          id: user.id.toString(),
          username: user.username || '',
          password: user.password || '',
          email: user.email || '',
          fullname: user.fullname || '',
          access: user.access || 'user'
        }));
        this.filteredData = [...this.listOfData];
        this.updateEditCache();
        this.isLoading = false;
        this.message.success('Data loaded successfully!');
      },
      error: (error: any) => {
        this.message.error('Failed to load data from server.');
        this.isLoading = false;
      }
    });
  }

  private updateEditCache(): void {
    this.editCache = {};
    this.filteredData.forEach(item => {
      this.editCache[item.id] = {
        edit: false,
        data: { ...item }
      };
    });
  }

  // Filter admins based on search term
  private filterAdmins(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredData = [...this.listOfData];
      this.updateEditCache();
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    this.filteredData = this.listOfData.filter(admin => {
      return (
        admin.username?.toLowerCase().includes(term) ||
        admin.fullname?.toLowerCase().includes(term) ||
        admin.email?.toLowerCase().includes(term) ||
        admin.access?.toLowerCase().includes(term) ||
        admin.id?.toLowerCase().includes(term)
      );
    });
    
    this.updateEditCache();
  }

  // Handle real-time search
  onSearch(): void {
    this.searchSubject.next(this.searchValue);
  }

  // Handle search button click
  onSearchClick(): void {
    this.filterAdmins(this.searchValue);
  }

  startEdit(id: string): void {
    if (this.editCache[id]) {
      this.editCache[id].edit = true;
    }
  }

  cancelEdit(id: string): void {
    const isNewAdmin = id.startsWith('temp_');
    
    if (isNewAdmin) {
      const index = this.filteredData.findIndex(item => item.id === id);
      const originalIndex = this.listOfData.findIndex(item => item.id === id);
      
      if (index !== -1) {
        this.filteredData.splice(index, 1);
        delete this.editCache[id];
      }
      
      if (originalIndex !== -1) {
        this.listOfData.splice(originalIndex, 1);
      }
    } else {
      const index = this.filteredData.findIndex(item => item.id === id);
      const originalIndex = this.listOfData.findIndex(item => item.id === id);
      
      if (index !== -1) {
        this.editCache[id] = {
          data: { ...this.filteredData[index] },
          edit: false
        };
      }
    }
    
    // Re-filter after cancellation
    this.filterAdmins(this.searchValue);
  }

  saveEdit(id: string): void {
    if (!this.isFormValid(id)) {
      this.message.warning('Please fill in all required fields');
      return;
    }

    const adminData = this.editCache[id].data;
    const index = this.filteredData.findIndex(item => item.id === id);
    const originalIndex = this.listOfData.findIndex(item => item.id === id);
    
    if (id.startsWith('temp_')) {
      // New admin - get next ID from server using register logic
      this.registerAdminWithManualId(adminData, id, index, originalIndex);
    } else {
      // Existing admin - update
      this.adminService.updateAdmin(id, adminData).subscribe({ 
        next: () => {
          if (index !== -1) {
            this.filteredData[index] = { ...adminData };
          }
          if (originalIndex !== -1) {
            this.listOfData[originalIndex] = { ...adminData };
          }
          
          this.editCache[id].edit = false;
          this.message.success('Admin updated successfully!');
          window.location.reload();
          
          // Re-filter after update
          this.filterAdmins(this.searchValue);
        },
        error: (error: any) => { 
          this.message.error('Failed to update admin');
        }
      });
    }
  }

  addNewUser(): void {
    // Generate a temporary ID
    const tempId = 'temp_' + Date.now();
    
    const newAdmin: UserData = {
      id: tempId,
      username: '',
      password: '',
      email: '',
      fullname: '',
      access: 'admin'
    };
    
    this.listOfData = [newAdmin, ...this.listOfData];
    this.filteredData = [newAdmin, ...this.filteredData];
    this.updateEditCache();
    this.startEdit(tempId);
    this.message.info('Please fill in the new admin details');
  }

  private registerAdminWithManualId(newAdmin: any, tempId: string, index: number, originalIndex: number): void {
    this.adminService.getAllAdmins().subscribe({ 
      next: (existingAdmins: any[]) => {
        let maxId = 0;
        if (existingAdmins && existingAdmins.length > 0) {
          const numericIds = existingAdmins
            .filter((admin: any) => {
              const idNum = Number(admin.id);
              return !isNaN(idNum) && !admin.id.toString().startsWith('temp_');
            })
            .map((admin: any) => Number(admin.id));
          
          if (numericIds.length > 0) {
            maxId = Math.max(...numericIds);
          }
        }
        
        const nextId = maxId + 1;
        
        const adminWithId = {
          id: nextId.toString(),
          username: newAdmin.username,
          password: newAdmin.password,
          email: newAdmin.email,
          fullname: newAdmin.fullname,
          access: 'admin'
        };
        
        this.adminService.createAdmin(adminWithId).subscribe({ 
          next: (createdAdmin: any) => {
            const adminWithStringId = {
              ...createdAdmin,
              id: createdAdmin.id ? createdAdmin.id.toString() : nextId.toString()
            };
            
            // Update in filtered array
            if (index !== -1) {
              this.filteredData[index] = adminWithStringId;
            }
            
            // Update in original array
            if (originalIndex !== -1) {
              this.listOfData[originalIndex] = adminWithStringId;
            }
            
            this.editCache[adminWithStringId.id] = {
              edit: false,
              data: adminWithStringId
            };
            delete this.editCache[tempId];
            
            this.message.success(`Admin ${newAdmin.fullname} registered successfully!`);
            window.location.reload();
            
            // Re-filter after creation
            this.filterAdmins(this.searchValue);
          },
          error: (error: any) => {
            console.error('Registration failed:', error);
            this.message.error('Registration failed. Please try again.');
            
            // Remove the temporary admin on error
            this.listOfData = this.listOfData.filter(item => item.id !== tempId);
            this.filterAdmins(this.searchValue);
          }
        });
      },
      error: (error: any) => {
        console.error('Failed to get existing admins:', error);
        this.message.error('Failed to connect to server. Please try again.');
      }
    });
  }

  deleteUser(id: string): void {
    if (!id.startsWith('temp_')) {
      const userId = parseInt(id) || id;
      
      this.adminService.deleteAdmin(userId).subscribe({
        next: () => {
          this.listOfData = this.listOfData.filter(item => item.id !== id);
          this.filteredData = this.filteredData.filter(item => item.id !== id);
          delete this.editCache[id];
          this.message.success('User deleted successfully!');
          this.filterAdmins(this.searchValue);
          window.location.reload();
        },
        error: (error: any) => {
          this.message.error('Failed to delete user. Please try again.');
        }
      });
    } else {
      this.listOfData = this.listOfData.filter(item => item.id !== id);
      this.filteredData = this.filteredData.filter(item => item.id !== id);
      delete this.editCache[id];
      this.filterAdmins(this.searchValue);
    }
  }

  getAccessLabel(access: string): string {
    switch (access.toLowerCase()) {
      case 'admin': return 'Admin';
      default: return access.charAt(0).toUpperCase() + access.slice(1);
    }
  }

  refreshData(): void {
    this.isLoading = true;
    this.searchValue = '';
    this.loadDataFromApi();
  }

  isFormValid(userId: string): boolean {
    const userData = this.editCache[userId]?.data;
    if (!userData) return false;
    
    return !!userData.username.trim() && 
           !!userData.email.trim() && 
           !!userData.password.trim() &&
           !!userData.fullname.trim();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    console.log('AuthService user:', this.currentUser);

    if (!this.currentUser) {
      const userData = localStorage.getItem('currentUser');
      console.log('LocalStorage user data:', userData);
      
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData);
          console.log('Parsed user from localStorage:', this.currentUser);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
    
    if (!this.currentUser) {
      console.log('No user found, redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Final current user:', this.currentUser);
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

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  private loadDashboardStats(): void {
    this.adminService.getAdminCount().subscribe({
      next: (count: number) => {
        this.adminCount = count;
      },
      error: (error: any) => {
        console.error('Failed to load admin count:', error);
      }
    });
    
    this.authService.getEmployeeCount().subscribe({ 
      next: (count: number) => {
        this.employeeCount = count;
      },
      error: (error: any) => {
        console.error('Failed to load employee count:', error);
      }
    });
  }

exportTableToPDF(): void {
  if (!this.filteredData || this.filteredData.length === 0) {
    this.message.warning('No admin data to export');
    return;
  }

  this.isLoading = true;
  
  try {
    const doc = new jsPDF('landscape');
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(81, 98, 250);
    doc.text('Admin Users Report', 14, 20);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`, 14, 28);
    doc.text(`Total Admins: ${this.filteredData.length}`, 14, 35);
    
    // Add search filter 
    if (this.searchValue.trim()) {
      doc.text(`Search Filter: "${this.searchValue}"`, 14, 42);
    }
    
    // Prepare table data
    const headers = [
      ['ID', 'Username', 'Full Name', 'Email', 'Access Level', 'Status']
    ];
    
    const data = this.filteredData.map(admin => [
      admin.id || 'N/A',
      admin.username || 'N/A',
      admin.fullname || 'N/A',
      admin.email || 'N/A',
      this.getAccessLabel(admin.access) || 'N/A',
      admin.email && admin.username ? 'Active' : 'Inactive'
    ]);
    
    // Add table to PDF
    autoTable(doc, {
      head: headers,
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
        fillColor: [81, 98, 250], // Match your button color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 },  // ID
        1: { cellWidth: 35 },  // Username
        2: { cellWidth: 45 },  // Full Name
        3: { cellWidth: 60 },  // Email
        4: { cellWidth: 30 },  // Access Level
        5: { cellWidth: 25 }   // Status
      },
      margin: { top: this.searchValue.trim() ? 50 : 45 }
    });
    
    // Add page numbers
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
    
    // Save the PDF
    const fileName = `admin-report-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}.pdf`;
    doc.save(fileName);
    
    this.message.success('PDF exported with ${this.filteredData.length} admin records!');
    
  } catch (error) {
    console.error('PDF export error:', error);
    this.message.error('Failed to export PDF');
  } finally {
    this.isLoading = false;
  }
  }   
  
  exportTableToExcel() {
    if (!this.filteredData || this.filteredData.length === 0) {
    this.message.warning('No admin data to export');
    return;
  }

  this.isLoading = true;
  
  const currentDate = new Date();
  

  const exportData = this.filteredData.map(item => ({
    'ID': item.id.startsWith('temp_') ? 'New' : item.id,
    'Username': item.username,
    'Full Name': item.fullname,
    'Email': item.email,
    'Access Level': this.getAccessLabel(item.access),
    'Export Date': currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }));
  
  const fileName = `Admin-Report_${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  
  try {
    // Create CSV with proper formatting using Papa Parse
    const csv = Papa.unparse(exportData, {
      delimiter: ",",
      header: true,
      quotes: true,
      quoteChar: '"',
      escapeChar: '"',
      escapeFormulae: true, // Security: prevents CSV injection
      skipEmptyLines: true,
      newline: "\r\n" 
    });
    
    // Create and download the file
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `${fileName}.csv`; // Excel can open CSV
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.message.success('Export completed successfully');
    
  } catch (error) {
    console.error('Export error:', error);
    this.message.error('Failed to export data');
  } finally {
    this.isLoading = false;
  }
    
   }
}