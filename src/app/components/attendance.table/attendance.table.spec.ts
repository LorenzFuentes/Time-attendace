import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceTable } from './attendance.table';

describe('AttendanceTable', () => {
  let component: AttendanceTable;
  let fixture: ComponentFixture<AttendanceTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
