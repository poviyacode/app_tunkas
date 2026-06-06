import { ComponentFixture, TestBed } from '@angular/core/testing';

import NotificationPayProfileComponent from './notification-pay-profile.component';

describe('NotificationPayProfileComponent', () => {
  let component: NotificationPayProfileComponent;
  let fixture: ComponentFixture<NotificationPayProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationPayProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationPayProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
