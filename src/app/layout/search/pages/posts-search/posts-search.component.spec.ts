import { ComponentFixture, TestBed } from '@angular/core/testing';

import PostsSearchComponent from './posts-search.component';

describe('PostsSearchComponent', () => {
  let component: PostsSearchComponent;
  let fixture: ComponentFixture<PostsSearchComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PostsSearchComponent]
    });
    fixture = TestBed.createComponent(PostsSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
