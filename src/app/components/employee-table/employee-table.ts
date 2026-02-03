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
export interface Employee {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  contact: string;
  department: string;
  position: string;
  username: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-employee-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzInputModule, NzPopconfirmModule, NzTableModule, NzButtonModule, NzSelectModule, NzTagModule, NzIconModule,],
  templateUrl: './employee-table.html',
  styleUrl: './employee-table.scss'
})
export class EmployeeTableComponent implements OnInit, OnDestroy { 
  editCache: { [key: string]: { edit: boolean; data: Employee } } = {};  
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  isLoading: boolean = true;

  isCollapsed = false;
  protected readonly date = new Date();

  currentUser: any = null;
  adminCount: number = 0;
  employeeCount: number = 0;
  currentDateTime: string = '';
  currentDate: string = '';

  // Search property for two-way binding
  searchValue: string = '';

  private timer: any; 
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;
  
  constructor(
    private authService: AuthService,
    private message: NzMessageService,
    private router: Router
  ) {}


  ngOnInit(): void {
    this.loadEmployees();
    this.loadCurrentUser();
    this.authService.currentUser$.subscribe(user => {
      console.log('User observable updated:', user);
      this.currentUser = user;
    });
  
    this.loadDashboardStats();
    this.updateDateTime();
    this.timer = setInterval(() => this.updateDateTime(), 60000);
    
    // Subscribe to search input with debounce for real-time search
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300)) // 300ms delay to prevent excessive filtering
      .subscribe(searchTerm => {
        this.filterEmployees(searchTerm);
      });
  }

  private loadEmployees(): void {
    this.isLoading = true;
    this.authService.getAllEmployee().subscribe({
      next: (data) => {
        // Convert all IDs to strings
        this.employees = data.map(employee => ({
          id: employee.id.toString(),
          firstName: employee.firstName || '',
          middleName: employee.middleName || '',
          lastName: employee.lastName || '',
          contact: employee.contact || '',
          department: employee.department || '',
          position: employee.position || '',
          username: employee.username || '',
          email: employee.email || '',
          password: employee.password || ''
        }));
        // Initialize filteredEmployees with all employees
        this.filteredEmployees = [...this.employees];
        this.updateEditCache();
        this.isLoading = false;
      },
      error: (error) => {
        this.message.error('Failed to load employees from server.');
        this.isLoading = false;
      }
    });
  }

  private updateEditCache(): void {
    this.editCache = {};
    this.filteredEmployees.forEach(employee => {
      this.editCache[employee.id] = {
        edit: false,
        data: { ...employee }
      };
    });
  }

  // Filter employees based on search term
  private filterEmployees(searchTerm: string): void {
    if (!searchTerm.trim()) {
      // If search is empty, show all employees
      this.filteredEmployees = [...this.employees];
      this.updateEditCache();
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    // Filter employees based on multiple fields
    this.filteredEmployees = this.employees.filter(employee => {
      return (
        employee.firstName?.toLowerCase().includes(term) ||
        employee.lastName?.toLowerCase().includes(term) ||
        employee.middleName?.toLowerCase().includes(term) ||
        employee.contact?.toLowerCase().includes(term) ||
        employee.department?.toLowerCase().includes(term) ||
        employee.position?.toLowerCase().includes(term) ||
        employee.username?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term) ||
        employee.id?.toLowerCase().includes(term)
      );
    });
    
    // Update edit cache for filtered results
    this.updateEditCache();
  }

  // Handle search input - triggers real-time filtering
  onSearch(): void {
    // Send the current search value to the subject
    this.searchSubject.next(this.searchValue);
  }

  // Handle search button click
  onSearchClick(): void {
    this.filterEmployees(this.searchValue);
  }

  startEdit(id: string): void {
    if (this.editCache[id]) {
      this.editCache[id].edit = true;
    }
  }

  cancelEdit(id: string): void {
    const isNewEmployee = id.startsWith('temp_');
    
    if (isNewEmployee) {
      const index = this.filteredEmployees.findIndex(employee => employee.id === id);
      const originalIndex = this.employees.findIndex(employee => employee.id === id);
      
      if (index !== -1) {
        this.filteredEmployees.splice(index, 1);
        delete this.editCache[id];
      }
      
      if (originalIndex !== -1) {
        this.employees.splice(originalIndex, 1);
      }
    } else {
      const index = this.filteredEmployees.findIndex(employee => employee.id === id);
      const originalIndex = this.employees.findIndex(employee => employee.id === id);
      
      if (index !== -1) {
        this.editCache[id] = {
          data: { ...this.filteredEmployees[index] },
          edit: false
        };
      }
    }
    
    // Re-filter after cancellation
    this.filterEmployees(this.searchValue);
  }

  saveEdit(id: string): void {
    const index = this.filteredEmployees.findIndex(employee => employee.id === id);
    const originalIndex = this.employees.findIndex(employee => employee.id === id);
    
    if (index === -1 || !this.editCache[id]) {
      this.message.error('Employee not found!');
      return;
    }

    if (!this.isFormValid(id)) {
      this.message.warning('Please fill in all required fields');
      return;
    }

    const employeeData = this.editCache[id].data;
    const isNewEmployee = id.startsWith('temp_');
    
    if (isNewEmployee) {
      this.registerNewEmployee(employeeData, id);
    } else {
      this.updateExistingEmployee(id, employeeData, index, originalIndex);
    }
  }

  private registerNewEmployee(newEmployee: Employee, tempId: string): void {
    this.authService.getAllEmployee().subscribe({
      next: (existingEmployees: any[]) => {
        let maxId = 0;
        
        existingEmployees.forEach(emp => {
          const idNum = parseInt(emp.id, 10);
          if (!isNaN(idNum) && idNum > maxId) {
            maxId = idNum;
          }
        });
        
        const nextId = (maxId + 1).toString();
        
        const employeeToCreate = {
          id: nextId, 
          firstName: newEmployee.firstName,
          middleName: newEmployee.middleName,
          lastName: newEmployee.lastName,
          contact: newEmployee.contact,
          department: newEmployee.department,
          position: newEmployee.position,
          username: newEmployee.username,
          email: newEmployee.email,
          password: newEmployee.password
        };
        
        this.authService.createEmployee(employeeToCreate).subscribe({
          next: (createdEmployee: any) => {
            const employeeWithStringId = {
              ...createdEmployee,
              id: createdEmployee.id ? createdEmployee.id.toString() : nextId
            };
            
            // Update in original array
            const originalIndex = this.employees.findIndex(employee => employee.id === tempId);
            if (originalIndex !== -1) {
              this.employees[originalIndex] = employeeWithStringId;
            } else {
              // Add to original array if not found
              this.employees.unshift(employeeWithStringId);
            }
            
            // Update edit cache
            this.editCache[employeeWithStringId.id] = {
              edit: false,
              data: employeeWithStringId
            };
            delete this.editCache[tempId];
            
            this.message.success(`Employee ${newEmployee.firstName} ${newEmployee.lastName} created successfully!`);
            window.location.reload();
            
            // Re-filter to apply current search
            this.filterEmployees(this.searchValue);
          },
          error: (error) => {
            console.error('Registration failed:', error);
            this.message.error('Failed to create employee. Please try again.');
            
            // Remove the temporary employee on error
            this.employees = this.employees.filter(e => e.id !== tempId);
            this.filterEmployees(this.searchValue);
          }
        });
      },
      error: (error) => {
        console.error('Failed to fetch existing employees:', error);
        this.message.error('Failed to connect to server. Please try again.');
      }
    });
  }

  private updateExistingEmployee(id: string, updatedEmployee: Employee, index: number, originalIndex: number): void {
    const cleanPayload = {
      firstName: updatedEmployee.firstName,
      middleName: updatedEmployee.middleName,
      lastName: updatedEmployee.lastName,
      contact: updatedEmployee.contact,
      department: updatedEmployee.department,
      position: updatedEmployee.position,
      username: updatedEmployee.username,
      email: updatedEmployee.email
    };
    
    const passwordValue = updatedEmployee.password;
    if (passwordValue && passwordValue.trim() && passwordValue !== '••••••••') {
      (cleanPayload as any).password = passwordValue;
    }
    
    this.authService.updateEmployee(id, cleanPayload).subscribe({
      next: (response) => {
        const responseWithStringId = {
          ...response,
          id: response.id ? response.id.toString() : id
        };
        
        // Update in filtered array
        if (index !== -1) {
          this.filteredEmployees[index] = {
            ...this.filteredEmployees[index],
            ...responseWithStringId
          };
        }
        
        // Update in original array
        if (originalIndex !== -1) {
          this.employees[originalIndex] = {
            ...this.employees[originalIndex],
            ...responseWithStringId
          };
        }
        
        this.editCache[id] = {
          edit: false,
          data: { ...this.filteredEmployees[index] }
        };
        
        this.message.success('Employee updated successfully!');
        window.location.reload();
        
        // Re-filter in case the update affects search results
        this.filterEmployees(this.searchValue);
      },
      error: (error) => {
        let errorMessage = 'Failed to update employee. ';
        if (error.status === 400) {
          errorMessage += 'Bad request - please check the data format.';
        } else if (error.status === 404) {
          errorMessage += 'Employee not found.';
        } else if (error.status === 409) {
          errorMessage += 'Conflict (duplicate email or username).';
        } else if (error.status === 500) {
          errorMessage += 'Server error. Please try again later.';
        } else {
          errorMessage += `Error ${error.status}: ${error.message}`;
        }
        
        this.message.error(errorMessage);
        this.editCache[id] = {
          edit: true, 
          data: { ...this.filteredEmployees[index] }
        };
      }
    });
  }

  addNewEmployee(): void {
    const tempId = `temp_${Date.now()}`;
    const newEmployee: Employee = {
      id: tempId,
      firstName: '',
      middleName: '',
      lastName: '',
      contact: '',
      department: '',
      position: '',
      username: '',
      email: '',
      password: ''
    };
    
    this.employees = [newEmployee, ...this.employees];
    this.filteredEmployees = [newEmployee, ...this.filteredEmployees];
    this.updateEditCache();
    this.startEdit(tempId);
    this.message.info('Please fill in the new employee details');
  }

  deleteEmployee(id: string): void {
    if (id.startsWith('temp_')) {
      this.employees = this.employees.filter(e => e.id !== id);
      this.filteredEmployees = this.filteredEmployees.filter(e => e.id !== id);
      delete this.editCache[id];
      this.filterEmployees(this.searchValue);
      return;
    }

    this.authService.deleteEmployee(id).subscribe({
      next: () => {
        this.employees = this.employees.filter(e => e.id !== id);
        this.filteredEmployees = this.filteredEmployees.filter(e => e.id !== id);
        delete this.editCache[id];
        this.message.success('Deleted successfully!');
        this.filterEmployees(this.searchValue);
        window.location.reload();
      },
      error: () => this.message.error('Delete failed!')
    });
  }

  refreshData(): void {
    this.isLoading = true;
    this.searchValue = '';
    this.loadEmployees();
  }

  isFormValid(employeeId: string): boolean {
    const employeeData = this.editCache[employeeId]?.data;
    
    if (!employeeData) return false;
    
    const requiredFields = [
      employeeData.firstName,
      employeeData.lastName,
      employeeData.contact,
      employeeData.department,
      employeeData.position,
      employeeData.username,
      employeeData.email
    ];
    
    const allRequiredValid = requiredFields.every(field => {
      const fieldValue = field ? field.toString().trim() : '';
      return fieldValue.length > 0;
    });
    
    // Check password only for new employees
    if (employeeId.startsWith('temp_')) {
      const passwordValue = employeeData.password ? employeeData.password.toString().trim() : '';
      const passwordValid = passwordValue.length > 0;
      return allRequiredValid && passwordValid;
    }
    
    return allRequiredValid;
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

  private loadDashboardStats(): void {
    this.authService.getAdminCount().subscribe({
      next: (count) => {
        this.adminCount = count;
      },
      error: (error) => {
        console.error('Failed to load admin count:', error);
      }
    });
    
    this.authService.getEmployeeCount().subscribe({
      next: (count) => {
        this.employeeCount = count;
      },
      error: (error) => {
        console.error('Failed to load employee count:', error);
      }
    });
  }
  exportTableToPDF(): void {
    if (!this.filteredEmployees || this.filteredEmployees.length === 0) {
      this.message.warning('No employee data to export');
      return;
    }

    this.isLoading = true;
    
    try {
      const doc = new jsPDF('landscape');
      const currentDate = new Date().toLocaleDateString();
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(81, 98, 250); // Match your button color #5162fa
      doc.text('Employee Report', 14, 20);
      
      // Subtitle
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate}`, 14, 28);
      doc.text(`Total Employees: ${this.filteredEmployees.length}`, 14, 35);
      
      // Prepare table data
      const headers = [
        ['ID', 'First Name', 'Middle Name', 'Last Name', 'Contact', 
         'Department', 'Position', 'Username', 'Email']
      ];
      
      const data = this.filteredEmployees.map(employee => [
        employee.id || 'N/A',
        employee.firstName || 'N/A',
        employee.middleName || 'N/A',
        employee.lastName || 'N/A',
        employee.contact || 'N/A',
        employee.department || 'N/A',
        employee.position || 'N/A',
        employee.username || 'N/A',
        employee.email || 'N/A'
      ]);
      
      // Add table to PDF
      autoTable(doc, {
        head: headers,
        body: data,
        startY: 45,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [81, 98, 250], // Match your button color
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 20 }, // ID
          1: { cellWidth: 25 }, // First Name
          2: { cellWidth: 25 }, // Middle Name
          3: { cellWidth: 25 }, // Last Name
          4: { cellWidth: 30 }, // Contact
          5: { cellWidth: 30 }, // Department
          6: { cellWidth: 30 }, // Position
          7: { cellWidth: 25 }, // Username
          8: { cellWidth: 45 }  // Email
        },
        margin: { top: 45 }
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
      doc.save(`Employee-report-${currentDate.replace(/\//g, '-')}.pdf`);
      this.message.success('PDF exported successfully!');
      
    } catch (error) {
      console.error('PDF export error:', error);
      this.message.error('Failed to export PDF');
    } finally {
      this.isLoading = false;
    }
  }

exportTableToExcel() {
    if (!this.filteredEmployees || this.filteredEmployees.length === 0) {
    this.message.warning('No admin data to export');
    return;
    }
    
    this.isLoading = true;


    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    
    const fileName = `admin-report-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}.xlsx`
    this.isLoading = true;
    try {
      
      
      let data = document.getElementById("table-data");
      const ws : XLSX.WorkSheet = XLSX.utils.table_to_sheet(data)
      
      const wb : XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      
      XLSX.writeFile(wb,fileName)
    }
    catch (error) {
      console.error('CSV export error:', error);
      this.message.error('Failed to export CSV');
    } finally {
      this.isLoading = false;
    }
    
   }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}