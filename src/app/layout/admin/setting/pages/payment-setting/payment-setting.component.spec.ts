import { ComponentFixture, TestBed } from '@angular/core/testing';

import PaymentSettingComponent from './payment-setting.component';

describe('PaymentSettingComponent', () => {
  let component: PaymentSettingComponent;
  let fixture: ComponentFixture<PaymentSettingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaymentSettingComponent]
    });
    fixture = TestBed.createComponent(PaymentSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
