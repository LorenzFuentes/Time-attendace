import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';
@Component({
  selector: 'app-calendar',
  imports: [DatePipe, FormsModule, NzAlertModule, NzCalendarModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  constructor(private router: Router){}
  selectedValue = new Date('2026-01-25');

  selectChange(select: Date): void {
    console.log(`Select value: ${select}`);
  }
}
