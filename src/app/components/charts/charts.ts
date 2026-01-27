import { Component, OnInit } from "@angular/core";
import { NgApexchartsModule } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../service/auth';
import { User } from '../../model/post';
import { Router } from "@angular/router";

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [NgApexchartsModule, CommonModule],
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

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    this.authService.getAllEmployee().subscribe({
      next: (users: User[]) => {
        // Count positions 
        const positionCounts = new Map<string, number>();
        // Count departments
        const departmentCounts = new Map<string, number>();
        
        users.forEach((user: User) => {
          // Position counts 
          const position = user.position || 'Not Specified';
          positionCounts.set(position, (positionCounts.get(position) || 0) + 1);
          
          // Department counts 
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

  createPositionChart() {
  this.pieChartOptions = {
    series: this.counts,
    chart: {
      height: 380, 
      type: "pie",
    },
    labels: this.positions,
    colors: ["#4C1D95", "#6D28D9", "#8B5CF6", "#A78BFA", "#C4B5FD"],
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
      }
    },
    dataLabels: {
      enabled: false 
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
        colors: ['#2c3e50']
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
          colors: '#2c3e50'
        }, 
        rotate: -90 
      },
      axisBorder: {
        show: true,
        color: '#e0e0e0',
        height: 1
      },
      axisTicks: {
        show: true,
        color: '#e0e0e0'
      }
    },
    yaxis: {
      title: {
        text: "Department Employees",
        style: {
          fontSize: '13px',
          fontWeight: 500,
          color: '#2c3e50'
        }
      },
      // labels: {
      //   style: {
      //     fontSize: '12px',
      //     colors: '#666'
      //   }
      // }
    },
    // tooltip: {
    //   style: {
    //     fontSize: '13px'
    //   },
    //   y: {
    //     formatter: function(val: number) {
    //       return val + " employees";
    //     }
    //   }
    // },
    // grid: {
    //   borderColor: '#e0e0e0',
    //   strokeDashArray: 3
    // }
  };
}
}