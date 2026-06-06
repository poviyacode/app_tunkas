import { ComponentFixture, TestBed } from '@angular/core/testing';

import PostsProfileComponent from './posts-profile.component';

describe('PostsProfileComponent', () => {
  let component: PostsProfileComponent;
  let fixture: ComponentFixture<PostsProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostsProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostsProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
