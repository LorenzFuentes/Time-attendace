import { Component, OnInit } from '@angular/core';
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

export interface Employee {
  id: number;
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

  constructor(
    private authService: AuthService,
    private message: NzMessageService,
    private route: Router
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  private loadEmployees(): void {
    this.isLoading = true;
    this.authService.getAllEmployee().subscribe({
      next: (data) => {
        this.employees = data.map(employee => ({
          id: employee.id,
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
      this.editCache[employee.id.toString()] = {
        edit: false,
        data: { ...employee }
      };
    });
  }

  startEdit(id: number): void {
    const idStr = id.toString();
    if (this.editCache[idStr]) {
      this.editCache[idStr].edit = true;
    }
  }

  cancelEdit(id: number): void {
    const idStr = id.toString();
    const isNewEmployee = id < 0;
    
    if (isNewEmployee) {
      const index = this.employees.findIndex(employee => employee.id === id);
      if (index !== -1) {
        this.employees.splice(index, 1);
        delete this.editCache[idStr];
      }
    } else {
      const index = this.employees.findIndex(employee => employee.id === id);
      if (index !== -1) {
        this.editCache[idStr] = {
          data: { ...this.employees[index] },
          edit: false
        };
      }
    }
  }

  saveEdit(id: number): void {
    const idStr = id.toString();
    const index = this.employees.findIndex(employee => employee.id === id);
    
    if (index === -1 || !this.editCache[idStr]) {
      this.message.error('Employee not found!');
      return;
    }

    if (!this.isFormValid(id)) {
      this.message.warning('Please fill in all required fields');
      return;
    }

    const employeeData = this.editCache[idStr].data;
    const isNewEmployee = id < 0;
    
    if (isNewEmployee) {
      this.registerEmployeeWithManualId(employeeData, idStr);
    } else {
      this.updateExistingEmployee(id, employeeData, index);
    }
  }

  private registerEmployeeWithManualId(newEmployee: any, tempId: string): void {
    this.authService.getAllEmployee().subscribe({
      next: (existingEmployees: any) => {
        let maxId = 0;
        if (existingEmployees && existingEmployees.length > 0) {
          const numericIds = existingEmployees
            .filter((employee: any) => !isNaN(employee.id))
            .map((employee: any) => Number(employee.id));
          
          if (numericIds.length > 0) {
            maxId = Math.max(...numericIds);
          }
        }
        
        const nextId = maxId + 1;
        
        const employeeWithId = {
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
        
        this.authService.createEmployee(employeeWithId).subscribe({
          next: (createdEmployee: any) => {
            const tempIndex = this.employees.findIndex(employee => employee.id.toString() === tempId);
            if (tempIndex !== -1) {
              this.employees[tempIndex] = createdEmployee;
              
              this.editCache[createdEmployee.id.toString()] = {
                edit: false,
                data: createdEmployee
              };
              delete this.editCache[tempId];
              
              this.updateEditCache();
            }
            
            this.message.success(`Employee ${newEmployee.firstName} ${newEmployee.lastName} created successfully!`);
          },
          error: (error) => {
            console.error('Registration failed:', error);
            this.message.error('Failed to create employee. Please try again.');
          }
        });
      },
      error: (error) => {
        console.error('Failed to get existing employees:', error);
        this.message.error('Failed to connect to server. Please try again.');
      }
    });
  }

  private updateExistingEmployee(id: number, updatedEmployee: Employee, index: number): void {
    const cleanPayload = {
      id: updatedEmployee.id,
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
        this.employees[index] = {
          ...this.employees[index],
          ...response
        };
        this.editCache[id.toString()] = {
          edit: false,
          data: { ...this.employees[index] }
        };
        
        this.message.success('Employee updated successfully!');
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
        this.editCache[id.toString()] = {
          edit: true, 
          data: { ...this.employees[index] }
        };
      }
    });
  }

  addNewEmployee(): void {
    const tempId = -Date.now();
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

  deleteEmployee(id: number): void {
    const idStr = id.toString();
    
    if (id > 0) {
      this.authService.deleteEmployee(id).subscribe({
        next: () => {
          const index = this.employees.findIndex(employee => employee.id === id);
          if (index !== -1) {
            this.employees.splice(index, 1);
            delete this.editCache[idStr];
            this.updateEditCache();
            this.message.success('Employee deleted successfully!');
          }
        },
        error: (error) => {
          this.message.error('Failed to delete employee. Please try again.');
        }
      });
    } else {
      const index = this.employees.findIndex(employee => employee.id === id);
      if (index !== -1) {
        this.employees.splice(index, 1);
        delete this.editCache[idStr];
      }
    }
  }

  refreshData(): void {
    this.loadEmployees();
  }

  
 isFormValid(employeeId: number): boolean {
  const idStr = employeeId.toString();
  const employeeData = this.editCache[idStr]?.data;
  
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
  
  if (employeeId < 0) {
    const passwordValue = employeeData.password ? employeeData.password.toString().trim() : '';
    const passwordValid = passwordValue.length > 0;
    return allRequiredValid && passwordValid;
  }
  
  return allRequiredValid;
}
}