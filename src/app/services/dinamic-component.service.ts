import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DynamicComponentService {
  private componentVisibleSubject = new BehaviorSubject<boolean>(false);
  componentVisible$ = this.componentVisibleSubject.asObservable();

  showComponent() {
    this.componentVisibleSubject.next(true);
  }

  hideComponent() {
    this.componentVisibleSubject.next(false);
  }
}
