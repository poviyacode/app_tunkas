import { ComponentFixture, TestBed } from '@angular/core/testing';

import UsersLiveComponent from './users-live.component';

describe('UsersLiveComponent', () => {
  let component: UsersLiveComponent;
  let fixture: ComponentFixture<UsersLiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersLiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersLiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
