import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveTable } from './leave.table';

describe('LeaveTable', () => {
  let component: LeaveTable;
  let fixture: ComponentFixture<LeaveTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaveTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
