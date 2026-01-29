import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputModule, NzInputSearchEvent } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AuthService } from '../../service/auth';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';

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
export class EmployeeTableComponent implements OnInit { 
  editCache: { [key: string]: { edit: boolean; data: Employee } } = {};  
  employees: Employee[] = [];
  isLoading: boolean = true;

  isCollapsed = false;
  protected readonly date = new Date();

  currentUser: any = null;
  adminCount: number = 0;
  employeeCount: number = 0;
  currentDateTime: string = '';
  currentDate: string = '';

  private timer: any; 
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
    this.employees.forEach(employee => {
      this.editCache[employee.id] = {
        edit: false,
        data: { ...employee }
      };
    });
  }

  startEdit(id: string): void {
    if (this.editCache[id]) {
      this.editCache[id].edit = true;
    }
  }

  cancelEdit(id: string): void {
    const isNewEmployee = id.startsWith('temp_');
    
    if (isNewEmployee) {
      const index = this.employees.findIndex(employee => employee.id === id);
      if (index !== -1) {
        this.employees.splice(index, 1);
        delete this.editCache[id];
      }
    } else {
      const index = this.employees.findIndex(employee => employee.id === id);
      if (index !== -1) {
        this.editCache[id] = {
          data: { ...this.employees[index] },
          edit: false
        };
      }
    }
  }

  saveEdit(id: string): void {
    const index = this.employees.findIndex(employee => employee.id === id);
    
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
      this.updateExistingEmployee(id, employeeData, index);
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
          const tempIndex = this.employees.findIndex(employee => employee.id === tempId);
          if (tempIndex !== -1) {
            const employeeWithStringId = {
              ...createdEmployee,
              id: createdEmployee.id ? createdEmployee.id.toString() : nextId
            };
            
            this.employees[tempIndex] = employeeWithStringId;
            this.editCache[employeeWithStringId.id] = {
              edit: false,
              data: employeeWithStringId
            };
            delete this.editCache[tempId];
          }
          
          this.message.success(`Employee ${newEmployee.firstName} ${newEmployee.lastName} created successfully!`);
          window.location.reload();
        },
        error: (error) => {
          console.error('Registration failed:', error);
          this.message.error('Failed to create employee. Please try again.');
        }
      });
    },
    error: (error) => {
      console.error('Failed to fetch existing employees:', error);
      this.message.error('Failed to connect to server. Please try again.');
    }
  });
  }

  private updateExistingEmployee(id: string, updatedEmployee: Employee, index: number): void {
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
      
      this.employees[index] = {
        ...this.employees[index],
        ...responseWithStringId
      };
      this.editCache[id] = {
        edit: false,
        data: { ...this.employees[index] }
      };
      
      this.message.success('Employee updated successfully!');
      window.location.reload();
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
        data: { ...this.employees[index] }
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
    this.updateEditCache();
    this.startEdit(tempId);
    this.message.info('Please fill in the new employee details');
  }

  deleteEmployee(id: string): void {
    if (id.startsWith('temp_')) {
      this.employees = this.employees.filter(e => e.id !== id);
      delete this.editCache[id];
      return;
    }

    this.authService.deleteEmployee(id).subscribe({
      next: () => {
        this.employees = this.employees.filter(e => e.id !== id);
        delete this.editCache[id];
        this.message.success('Deleted successfully!');
        window.location.reload();
      },
      error: () => this.message.error('Delete failed!')
    });
  }

  refreshData(): void {
    window.location.reload();
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
   readonly value = signal('');

  onSearch(event: NzInputSearchEvent): void {
    console.log(event);
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
}