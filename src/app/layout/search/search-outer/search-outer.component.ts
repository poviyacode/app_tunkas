import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ToolsService } from '@services/tools.service';
import { SearchService } from '@services/search.service';
import { Tools } from '@core/common/tools';

@Component({
    selector: 'app-search-outer',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule,
    ],
    templateUrl: './search-outer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./search-outer.component.scss']
})
export class SearchOuterComponent {

  myform: FormGroup;

  public router = inject(Router);
  private fb = inject(FormBuilder);
  private searchService = inject(SearchService);

  constructor(
  ) { }

  ngOnInit(): void {
    this.myform = this.fb.group({
      q: [null, Validators.required],
    });
  }

  onSubmit(): void {
    if (this.myform.valid) {
      this.router.navigate(['search/users'],
        { queryParams: { q: this.myform.value.q } });
      const search = this.myform.value.q;
      this.searchService.setSharedData(search!);
    }
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      event.preventDefault();
      const textarea = keyboardEvent.target as HTMLTextAreaElement;
      textarea.style.height = '2.25rem';
      this.onSubmit();
    }
  }

  // input class
  selectClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  inputClass(formGroup: FormGroup, controlName: string) {
    return Tools.inputClass(formGroup, controlName);
  }

  textareaClass(formGroup: FormGroup, controlName: string, height: string) {
    return Tools.textareaClass(formGroup, controlName, height);
  }
}
