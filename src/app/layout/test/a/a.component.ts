import { ApplicationRef, Component, ComponentRef, computed, effect, HostListener, Inject, inject, Input, PLATFORM_ID, signal, ViewChild, ViewContainerRef, WritableSignal, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-a',
  imports: [

  ],
  templateUrl: './a.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './a.component.scss'
})
export default class AComponent {

  isBrowser: boolean;
  isServer: boolean;

  constructor() {

  }

  ngOnInit() {

  }


  ngOnDestroy(): void {

  }


}