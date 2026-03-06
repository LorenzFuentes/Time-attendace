import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  registerForm: FormGroup;
  isLoading = false;
  photoPreview: string | null = null;
  selectedPhotoFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private message: NzMessageService
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
    this.router.navigate(['login']);
  }

  checkPasswordMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.message.error('Please fill all required fields correctly!');
      return;
    }

    if (!this.checkPasswordMatch()) {
      this.message.error('Passwords do not match!');
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
      password: formData.password,
      photo: this.photoPreview || null
    };
    
    this.registerUserWithStringId(newUser);
  }

  private registerUserWithStringId(newUser: any): void {
    // Get all existing users to find the highest ID
    this.http.get('http://localhost:3000/users').subscribe({
      next: (existingUsers: any) => {
        // Find the maximum numeric ID from existing users (convert strings to numbers)
        let maxId = 0;
        if (existingUsers && existingUsers.length > 0) {
          existingUsers.forEach((user: any) => {
            // Convert string ID to number to find the max
            const numericId = parseInt(user.id, 10);
            if (!isNaN(numericId) && numericId > maxId) {
              maxId = numericId;
            }
          });
        }
        
        // Calculate next ID and convert to string
        const nextId = (maxId + 1).toString();
        
        // Add the string ID to the user object
        const userWithId = {
          id: nextId,
          ...newUser
        };

        // Send POST request with the string ID
        this.http.post('http://localhost:3000/users', userWithId).subscribe({
          next: (response: any) => {
            this.message.success(`User ${newUser.firstName} ${newUser.lastName} registered successfully!`);
            
            this.registerForm.reset();
            this.removePhoto(); // Clear photo preview
            this.router.navigate(['login']); // Navigate to login page
          },
          error: (error) => {
            console.error('Registration failed:', error);
            this.message.error('Registration failed. Please try again.');
            this.isLoading = false;
          },
          complete: () => {
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Failed to get existing users:', error);
        this.message.error('Failed to connect to server. Please try again.');
        this.isLoading = false;
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.message.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.message.error('Please select an image file');
        return;
      }

      this.selectedPhotoFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.photoPreview = null;
    this.selectedPhotoFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}