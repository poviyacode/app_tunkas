import { ComponentFixture, TestBed } from '@angular/core/testing';

import LiveProfileComponent from './live-profile.component';

describe('LiveProfileComponent', () => {
  let component: LiveProfileComponent;
  let fixture: ComponentFixture<LiveProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveProfileComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LiveProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
