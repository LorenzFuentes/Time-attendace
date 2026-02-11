import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { NgApexchartsModule } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { Router } from "@angular/router";
import { NzIconModule } from 'ng-zorro-antd/icon';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


import { AuthService } from '../../service/auth';
import { UserService } from '../../service/user-service/user'; 
import { AdminService } from '../../service/admin-service/admin'; 
import { User } from '../../model/post';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [NzIconModule, NgApexchartsModule, CommonModule],
  templateUrl: './charts.html',
  styleUrls: ['../../app.scss'],
})
export class Charts implements OnInit {
  public pieChartOptions: any;
  public columnChartOptions: any;
  public isLoading = true;
  public positions: string[] = [];
  public counts: number[] = [];
  public departments: string[] = [];
  public deptCounts: number[] = [];

  isCollapsed = false;
  protected readonly date = new Date();

  currentUser: any = null;
  adminCount: number = 0;
  employeeCount: number = 0;
  currentDateTime: string = '';
  currentDate: string = '';

  private timer: any; 
  
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private userService: UserService, 
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadCurrentUser();
    this.authService.currentUser$.subscribe((user: any) => { 
      console.log('User observable updated:', user);
      this.currentUser = user;
    });
  
    this.loadDashboardStats();
    this.updateDateTime();
    this.timer = setInterval(() => this.updateDateTime(), 60000);
  }

  loadUserData() {
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        const positionCounts = new Map<string, number>();
        const departmentCounts = new Map<string, number>();
        
        users.forEach((user: User) => {
          const position = user.position || 'Not Specified';
          positionCounts.set(position, (positionCounts.get(position) || 0) + 1);
          
          const department = user.department || 'Unassigned';
          departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1);
        });
        
        this.positions = Array.from(positionCounts.keys());
        this.counts = Array.from(positionCounts.values());
        
        this.departments = Array.from(departmentCounts.keys());
        this.deptCounts = Array.from(departmentCounts.values());
        
        this.createPositionChart();
        this.createColumnChart();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
      }
    });
  }

  downloadChart(chartType: string) {
    let chartElement: HTMLElement | null = null;
    
    if (chartType === 'pie') {
      chartElement = document.querySelector('.chart-card:first-child');
    } else if (chartType === 'column') {
      chartElement = document.querySelector('.chart-card:last-child');
    }

    if (chartElement) {
      html2canvas(chartElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1a1a1a',
        logging: false
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
        
        // Add title
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.text(
          chartType === 'pie' ? 'Position Distribution' : 'Department Distribution',
          105, 10, { align: 'center' }
        );
        
        pdf.save(`${chartType}-chart-report.pdf`);
      });
    }
  }

  createPositionChart() {
    this.pieChartOptions = {
      series: this.counts,
      chart: {
        height: 380,
        type: "pie",
      },
      labels: this.positions,
      colors: ["#0F7B5A", "#1A9F6B", "#2DC47C", "#5FE19C", "#9CF0C2",  
              "#0A5C44", "#0E7C5C", "#159B74", "#1EB88B", "#2AD4A2", 
              "#4BE6B7", "#7CF0CD", "#A8F7E0", "#D4FBEF", "#F0FFFA",  
              "#F97316", "#FB923C", "#FDBA74", "#FED7AA",            
              "#0891B2", "#0AA5C2", "#3BC9DB", "#7BE0F0",            
              "#0B6B4D", "#139C6B", "#42C98F", "#8EEDB7"],
      legend: {
        position: "right",
        fontSize: "14px",
        fontFamily: 'Arial, sans-serif',
        fontWeight: 500,
        itemMargin: {
          horizontal: 10,
          vertical: 6
        },
        markers: {
          width: 12,
          height: 12,
          radius: 6,
          offsetX: -2
        },
        labels: {
          colors: '#2F2F22'
        },
      },
      dataLabels: {
        enabled: true
      }
    };
  }

  createColumnChart() {
    this.columnChartOptions = {
      series: [{
        name: "Employees",
        data: this.deptCounts
      }],
      chart: {
        type: "bar",
        height: 380,
        toolbar: {
          show: false
        }
      },
      colors: [
        "#0F7B5A", "#1A9F6B", "#2DC47C", "#5FE19C", "#9CF0C2",  
          "#0A5C44", "#0E7C5C", "#159B74", "#1EB88B", "#2AD4A2", 
          "#4BE6B7", "#7CF0CD", "#A8F7E0", "#D4FBEF", "#F0FFFA",  
          "#F97316", "#FB923C", "#FDBA74", "#FED7AA",            
          "#0891B2", "#0AA5C2", "#3BC9DB", "#7BE0F0",            
          "#0B6B4D", "#139C6B", "#42C98F", "#8EEDB7"
                ],
      plotOptions: {
        bar: {
          columnWidth: '50%',
          distributed: true,
          borderRadius: 6,
          borderRadiusApplication: 'end',
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '13px',
          fontWeight: '600',
          colors: ['#2F2F22']
        },
        offsetY: -5,
        formatter: function(val: number) {
          return val;
        }
      },
      legend: {
        show: false
      },
      xaxis: {
        categories: this.departments,
        labels: {
          style: {
            fontSize: '11px',
            colors: '#2F2F22'
          },
          rotate: -90
        },
        axisBorder: {
          show: true,
          color: '#2F2F22',
          height: 1
        },
        axisTicks: {
          show: true,
          color: '#2F2F22'
        }
      },
      yaxis: {
        title: {
          text: "Department Employees",
          style: {
            fontSize: '13px',
            fontWeight: 500,
            color: '#FCF8F8'
          }
        }
      }
    };
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
    // Use adminService for admin count
    this.adminService.getAdminCount().subscribe({
      next: (count: number) => {
        this.adminCount = count;
      },
      error: (error: any) => {
        console.error('Failed to load admin count:', error);
      }
    });
    
    // Use userService for employee count
    this.userService.getUserCount().subscribe({
      next: (count: number) => {
        this.employeeCount = count;
      },
      error: (error: any) => {
        console.error('Failed to load employee count:', error);
      }
    });
  }
}