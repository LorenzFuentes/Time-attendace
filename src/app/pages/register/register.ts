import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule,NzButtonModule,NzFormModule,NzInputModule,NzSelectModule ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,11}$/)]],
      department: ['', Validators.required],
      position: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  getLogin(){
    this.router.navigate(['']);
  }

  checkPasswordMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      alert('Please fill all required fields correctly!');
      return;
    }

    if (!this.checkPasswordMatch()) {
      alert('Passwords do not match!');
      return;
    }

    this.isLoading = true;
    
    const formData = this.registerForm.value;

    const newUser = {
      firstName: formData.firstName,
      middleName: formData.middleName || '',
      lastName: formData.lastName,
      contact: formData.phone,
      department: formData.department,
      position: formData.position,
      username: formData.username,
      email: formData.email,
      password: formData.password
    };
    // Manual ID calculation
    this.registerUserWithManualId(newUser);
  }

  private registerUserWithManualId(newUser: any): void {
    // Get all existing users to find the highest ID
    this.http.get('http://localhost:3000/users').subscribe({
      next: (existingUsers: any) => {
        // Find the maximum ID from existing users
        let maxId = 0;
        if (existingUsers && existingUsers.length > 0) {
          maxId = Math.max(...existingUsers.map((user: any) => user.id));
        }
        // Calculate next ID
        const nextId = maxId + 1;
        
        // Add the calculated ID to the user object
        const userWithId = {
          id: nextId,
          ...newUser
        };
        // Send POST request with the calculated ID
        this.http.post('http://localhost:3000/users', userWithId).subscribe({
          next: (response: any) => {
            alert(`User ${newUser.firstName} ${newUser.lastName} registered successfully!\nID: ${nextId}`);
            
            this.registerForm.reset();
            this.router.navigate(['']);
          },
          error: (error) => {
            console.error('Registration failed:', error);
            alert('Registration failed. Please try again.');
          },
          complete: () => {
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Failed to get existing users:', error);
        alert('Failed to connect to server. Please try again.');
        this.isLoading = false;
      }
    });
  }
}