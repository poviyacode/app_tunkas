import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: 'root'
})

export class CounterService {

  private counterSignal = signal(0);
  readonly counter = this.counterSignal.asReadonly();

  increment() {
    if(this.counter() > 10) {
      throw `Maximum value reached`;
    }
    this.counterSignal.update(val => val + 1);
  }

  private tipSignal = signal(false);
  readonly tip = this.tipSignal.asReadonly();

  toogleTip(value: boolean) {
    this.tipSignal.set(value);
  }
}
