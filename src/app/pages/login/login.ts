import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../service/auth';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzFormModule,
    NzInputModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  constructor(private router: Router) {}
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private msg = inject(NzMessageService);

  validateForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [false]
  });
  getRegister(){
    this.router.navigate(['register'])
  }
  submitForm(): void {
    if (this.validateForm.invalid) {
    Object.values(this.validateForm.controls).forEach(control => {
      control.markAsDirty();
      control.updateValueAndValidity({ onlySelf: true });
    });
    return;
  }

  const { username, password } = this.validateForm.getRawValue();

  this.auth.login(username, password).subscribe({
    next: (adminData) => {
      console.log('Admin login successful:', adminData);
      this.msg.success('Admin login successful');
      this.router.navigate(['/main']); 
    },
    error: (error) => {
      console.error('Admin login failed:', error);
      this.msg.error('Invalid admin username or password');
      }
    });
  }
}