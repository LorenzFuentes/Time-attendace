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
  imports: [CommonModule,FormsModule,ReactiveFormsModule,NzInputModule,NzPopconfirmModule,NzTableModule,NzButtonModule,NzSelectModule,NzTagModule,NzIconModule,],
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
        console.log('Employees loaded from API:', data);
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
        this.message.success('Employees loaded successfully!');
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
    console.log('Edit cache updated:', this.editCache);
  }

  startEdit(id: number): void {
    const idStr = id.toString();
    if (this.editCache[idStr]) {
      this.editCache[idStr].edit = true;
    }
  }

  cancelEdit(id: number): void {
    const idStr = id.toString();
    if (idStr.startsWith('temp_')) {
      const index = this.employees.findIndex(employee => employee.id.toString() === idStr);
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
    if (index !== -1 && this.editCache[idStr]) {
      const updatedEmployee = this.editCache[idStr].data;
      const isNewEmployee = idStr.startsWith('temp_');
      
      if (isNewEmployee) {
        this.createNewEmployee(updatedEmployee, id);
      } else {
        this.updateExistingEmployee(id, updatedEmployee, index);
      }
    }
  }
  private createNewEmployee(employeeData: Employee, tempId: number): void {
    const tempIdStr = tempId.toString();
    const newEmployeePayload = {
      firstName: employeeData.firstName,
      middleName: employeeData.middleName,
      lastName: employeeData.lastName,
      contact: employeeData.contact,
      department: employeeData.department,
      position: employeeData.position,
      username: employeeData.username,
      email: employeeData.email,
      password: employeeData.password
    };

    this.authService.createEmployee(newEmployeePayload).subscribe({
      next: (response) => {
        const tempIndex = this.employees.findIndex(employee => employee.id.toString() === tempIdStr);
        if (tempIndex !== -1) {
          this.employees[tempIndex] = {
            id: response.id,
            firstName: response.firstName,
            middleName: response.middleName,
            lastName: response.lastName,
            contact: response.contact,
            department: response.department,
            position: response.position,
            username: response.username,
            email: response.email,
            password: response.password
          };
          delete this.editCache[tempIdStr];
          this.updateEditCache();
          
          this.message.success('Employee created successfully!');
        }
      },
      error: (error) => {
        const tempIndex = this.employees.findIndex(employee => employee.id.toString() === tempIdStr);
        if (tempIndex !== -1) {
          this.employees.splice(tempIndex, 1);
          delete this.editCache[tempIdStr];
        }
        
        this.message.error('Failed to create employee. Please try again.');
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
      console.log('SUCCESS - API Response:', response);
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
      } else if (error.status === 401 || error.status === 403) {
        errorMessage += 'Unauthorized - check your permissions.';
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
    },
    complete: () => {
      console.log('Update request completed');
    }
  });
}
  deleteEmployee(id: number): void {
    this.authService.deleteEmployee(id).subscribe({
      next: () => {
        console.log('Employee deleted successfully');
        const index = this.employees.findIndex(employee => employee.id === id);
        if (index !== -1) {
          this.employees.splice(index, 1);
          delete this.editCache[id.toString()];
          this.updateEditCache();
          this.message.success('Employee deleted successfully!');
        }
      },
      error: (error) => {
        this.message.error('Failed to delete employee. Please try again.');
      }
    });
  }
  refreshData(): void {
   window.location.reload();
  }

  isFormValid(employeeId: number): boolean {
  const employeeData = this.editCache[employeeId.toString()]?.data;
  if (!employeeData) return false;
  
  const requiredFieldsValid = !!employeeData.firstName?.trim() && 
         !!employeeData.lastName?.trim() && 
         !!employeeData.contact?.trim() &&
         !!employeeData.department?.trim() &&
         !!employeeData.position?.trim() &&
         !!employeeData.username?.trim() &&
         !!employeeData.email?.trim();
  if (employeeId.toString().startsWith('temp_')) {
    return requiredFieldsValid && !!employeeData.password?.trim();
  }
  return requiredFieldsValid;
}
}