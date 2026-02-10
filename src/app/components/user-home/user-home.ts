import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './user-home.html',
  styleUrls: ['./user-home.scss']
})
export class UserHomeComponent implements OnInit {
  userName: string = 'User';
  currentDate: string;
  features: string[] = [
    'Request Leave',
    'Time in and Time out',
    'View Profile',
    'Track Performance',
  ];
  
  constructor() {
    // Format date using JavaScript
    this.currentDate = this.formatDate(new Date());
  }

  ngOnInit(): void {
    // Simulate fetching user data
    setTimeout(() => {
      this.userName = 'Lorenz';
    }, 500);
  }

  // Helper method to format date
  private formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }
}