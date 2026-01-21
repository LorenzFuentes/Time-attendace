import { Component, OnInit } from '@angular/core';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth';
@Component({
  selector: 'app-admin-home',
  imports: [NzBreadCrumbModule, NzIconModule, NzMenuModule, NzLayoutModule],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.scss',
})
export class AdminHomeComponent implements OnInit  {
isCollapsed = false;
adminCount = 0;
employeeCount = 0;
totalUsers = 0;
protected readonly date = new Date();
constructor( private router: Router,  private authService: AuthService){}

currentUser: any = {
    firstName: 'Lorenz',
    lastName: 'Fuentes',
    middleName: 'C',
    email: 'lorenz@company.com',
    username: 'lorzse',
    position: 'Intern',
    department: 'IT',
    contact: '+1 (555) 123-4567'
  };
 ngOnInit(): void {
    this.loadUserCounts();
    this.loadCurrentUser();
  }

  private loadUserCounts(): void {
    this.authService.getAllEmployee().subscribe(employees => {
      this.employeeCount = employees.length;
      this.totalUsers = this.employeeCount + this.adminCount;
    });
  }

  private loadCurrentUser(): void {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
  }

logout(){
    this.router.navigate(['']);
}

getDashboard(){
  this.router.navigate(['main']);
}

getAdminTable(){
      this.router.navigate(['/main/admin-table']);
  }

getEmployeeTable(){
    this.router.navigate(['/main/employee-table']);
}

}