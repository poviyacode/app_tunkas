import { ComponentFixture, TestBed } from '@angular/core/testing';

import LiveZegocloudEngineProfileComponent from './live-zegocloud-engine-profile.component';

describe('LiveZegocloudEngineProfileComponent', () => {
  let component: LiveZegocloudEngineProfileComponent;
  let fixture: ComponentFixture<LiveZegocloudEngineProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveZegocloudEngineProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveZegocloudEngineProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
