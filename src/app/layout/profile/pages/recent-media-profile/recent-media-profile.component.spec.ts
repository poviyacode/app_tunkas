import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentMediaProfileComponent } from './recent-media-profile.component';

describe('RecentMediaProfileComponent', () => {
  let component: RecentMediaProfileComponent;
  let fixture: ComponentFixture<RecentMediaProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentMediaProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentMediaProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
