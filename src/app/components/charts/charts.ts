import { Component } from "@angular/core";
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './charts.html',
  styleUrls: ['./charts.scss'],
})
export class Charts {
  public chartOptions: any; 

  constructor() {
    this.chartOptions = {
      series: [44, 55, 13, 43, 22],
      chart: {
        height: 350,
        type: "pie",  
      },
      labels: ["Team A", "Team B", "Team C", "Team D", "Team E"],
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: "bottom"
          }
        }
      }],
      title: {
        text: "Market Share",
        align: "center"
      }
    };
  }
}