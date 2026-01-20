import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTable } from './admin-table';

describe('AdminTable', () => {
  let component: AdminTable;
  let fixture: ComponentFixture<AdminTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
