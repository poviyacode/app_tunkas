import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PostAdCategory } from '../interfaces/adCategory';
import { ToolsService } from './tools.service';

@Injectable({
  providedIn: 'root'
})
export class AdCategoryService {

  apiUrl = `${environment.api}/post-ad-category`;

  private http = inject(HttpClient);

  findAllCountry(dataQuery: any): Observable<any[]> {

    return this.http.post<PostAdCategory[]>(this.apiUrl +  '/country', dataQuery);
  }

}
