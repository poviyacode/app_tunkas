import { ComponentFixture, TestBed } from '@angular/core/testing';

import VideoCallProfileComponent from './video-call-profile.component';

describe('VideoCallProfileComponent', () => {
  let component: VideoCallProfileComponent;
  let fixture: ComponentFixture<VideoCallProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoCallProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoCallProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
