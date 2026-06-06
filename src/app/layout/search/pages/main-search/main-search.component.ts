import { Component, effect, inject, Inject, OnInit, PLATFORM_ID, DOCUMENT, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { isPlatformBrowser, isPlatformServer, Location } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '@services/user.service';
import { AuthService } from '@services/auth.service';
import { SubscriptionService } from '@services/subscription.service';
import { Subscription } from '@interfaces/subscription';
import { TranslateModule } from '@ngx-translate/core';
import { SugestionsComponent } from '@shared/sugestions/sugestions.component';
import { SearchService } from '@services/search.service';
import { Tools } from '@core/common/tools';

@Component({
  selector: 'app-main-search',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
],
  templateUrl: './main-search.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./main-search.component.scss']
})
export default class MainSearchComponent {

  isBrowser: boolean;
  isServer: boolean;

  urlCurrent = 'posts';
  search: string | null;
  loading = false;

  myform: FormGroup;

  subscriptions: Subscription[] = [];
  subscribersJoin: Subscription[] = [];
  private hasFetched = false;

  public router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  public userService = inject(UserService);
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private location = inject(Location);
  private fb = inject(FormBuilder);
  private searchService = inject(SearchService);
  private subscriptionService = inject(SubscriptionService);

  constructor(

  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isServer = isPlatformServer(this.platformId);

    this.search = this.activeRoute.snapshot.queryParamMap.get('q');

    if (this.search) {
      this.searchService.setSharedData(this.search!);
    }

  }

  ngOnInit(): void {
    this.myform = this.fb.group({
      q: [this.search ? this.search : '', Validators.required],
    });
  }

  onSearch(q: any) {
    this.search = q;
  }

  onScrollTop(): void {
    this.document.documentElement.scrollTop = 0;
  }

  goBack(): void {
    this.location.back();
  }

  onSubmit(): void {
    if (this.myform.valid) {
      this.search = this.myform.value.q;
      this.searchService.setSharedData(this.search!);
      this.router.navigate([],
        { relativeTo: this.activeRoute, queryParams: { q: this.myform.value.q } });
    } else {
      this.search = 'all';
      this.router.navigate([]);
      this.searchService.setSharedData(this.search!);
    }

    this.onScrollTop();
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
