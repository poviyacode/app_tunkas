
import { Component, OnInit, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';;
import { TranslateModule } from '@ngx-translate/core';
import { User } from '../../interfaces/user';
//import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';
import { UserService } from '@services/user.service';

@Component({
    selector: 'app-sugestions',
    templateUrl: './sugestions.component.html',
    imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslateModule
],
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./sugestions.component.scss']
})
export class SugestionsComponent implements OnInit {

  loading: boolean;

  postLoading: string[] = ["hola", "que", "tal"];

  userService = inject(UserService);

  constructor() {
    this.usersSuggestions();
  }

  ngOnInit(): void {

  }

  usersSuggestions() {
    this.loading = true;
    const data = {};

    this.userService.findSuggestedUsers(data).subscribe(res => {
      if (res) {
        if(res) {
          this.userService.addSuggestedUsers(res);
        }
        this.loading = false;
      }
    })
  }

  prinImages(images: any) {
    return images[0]['url'];
  };

}
