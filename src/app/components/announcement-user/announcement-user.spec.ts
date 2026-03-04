import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnouncementUser } from './announcement-user';

describe('AnnouncementUser', () => {
  let component: AnnouncementUser;
  let fixture: ComponentFixture<AnnouncementUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementUser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnouncementUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
