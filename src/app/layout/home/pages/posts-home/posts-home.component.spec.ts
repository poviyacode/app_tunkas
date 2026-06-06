import { ComponentFixture, TestBed } from '@angular/core/testing';

import PostsHomeComponent from './posts-home.component';

describe('PostsHomeComponent', () => {
  let component: PostsHomeComponent;
  let fixture: ComponentFixture<PostsHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostsHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostsHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
