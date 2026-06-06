import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchOuterComponent } from './search-outer.component';

describe('SearchOuterComponent', () => {
  let component: SearchOuterComponent;
  let fixture: ComponentFixture<SearchOuterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SearchOuterComponent]
    });
    fixture = TestBed.createComponent(SearchOuterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
