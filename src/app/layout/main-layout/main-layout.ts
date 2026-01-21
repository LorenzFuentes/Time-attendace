import { Component, OnInit } from '@angular/core';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { RouterOutlet, Router } from '@angular/router'; 
import { AuthService } from '../../service/auth';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NzBreadCrumbModule, NzIconModule, NzMenuModule, NzLayoutModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout implements OnInit {
  isCollapsed = false;
  protected readonly date = new Date();

  adminCount: number = 0;
  employeeCount: number = 0;
  currentDateTime: string = '';
  currentDate: string = '';
  private timer: any; 

  constructor( private router: Router,private authService: AuthService) {
    this.updateDateTime();
  }

  ngOnInit() {
    this.authService.getAdminCount().subscribe(count => {
      this.adminCount = count;
    });
    this.authService.getEmployeeCount().subscribe(count => {
      this.employeeCount = count;
    });
    this.timer = setInterval(() => this.updateDateTime(), 60000);
  }

  updateDateTime() {
    const now = new Date();
    this.currentDateTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.currentDate = now.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getAdminTable(){
      this.router.navigate(['/main/admin-table']);
  }

  getEmployeeTable(){
      this.router.navigate(['/main/employee-table']);
  }

  getHome(){
      this.router.navigate(['admin-home']);
  }

  logout(){
    this.router.navigate(['']);
  }
}