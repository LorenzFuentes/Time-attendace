import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { NgApexchartsModule } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../service/auth';
import { User } from '../../model/post';
import { Router } from "@angular/router";
import { NzIconModule } from 'ng-zorro-antd/icon';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [NzIconModule,NgApexchartsModule, CommonModule],
  templateUrl: './charts.html',
  styleUrls: ['./charts.scss'],
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

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.loadUserData();
    this.loadCurrentUser();
    this.authService.currentUser$.subscribe(user => {
      console.log('User observable updated:', user);
      this.currentUser = user;
    });
  
    this.loadDashboardStats();
    this.updateDateTime();
    this.timer = setInterval(() => this.updateDateTime(), 60000);
  }

  loadUserData() {
    this.authService.getAllEmployee().subscribe({
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
      error: (error) => {
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
      colors: ["#4C1D95", "#6D28D9", "#8B5CF6", "#A78BFA", "#C4B5FD",  
              "#2E1065", "#5B21B6", "#7C3AED", "#9333EA", "#A855F7", 
              "#C084FC", "#D8B4FE", "#E9D5FF", "#F3E8FF", "#FAF5FF",  
              "#EC4899", "#F472B6", "#F9A8D4", "#FBCFE8",            
              "#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD",            
              "#10B981", "#34D399", "#6EE7B7", "#A7F3D0"],
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
          colors: '#FFFFFF'
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
        "#4C1D95", "#6D28D9", "#8B5CF6", "#A78BFA", "#C4B5FD",
        "#7C3AED", "#9333EA", "#A855F7", "#C084FC"
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
          colors: ['#FCF8F8']
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
            colors: '#FCF8F8'
          },
          rotate: -90
        },
        axisBorder: {
          show: true,
          color: '#FCF8F8',
          height: 1
        },
        axisTicks: {
          show: true,
          color: '#FCF8F8'
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