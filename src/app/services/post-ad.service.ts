import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, Observable, retry, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Post } from '../interfaces/post';
import { Headers } from '../core/common/http-headers';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PostAdService {

  apiUrl = `${environment.api}/post-ad`;

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  create(data: any, files: any): Observable<any> {
    const uploadData = new FormData();
    //uploadData.append('files', files[0]);       // una sola imagen

    for (var i = 0; i < files.length; i++) {

      uploadData.append("files", files[i]);       // imagenes multiples
    }
    uploadData.append('data', JSON.stringify(data));
    return this.http.post<any[]>(this.apiUrl + '/create', uploadData, Headers.HttpOptions());
  }


  update(id: string, data: any, files: any): Observable<any> {
    const uploadData = new FormData();
    //uploadData.append('files', files[0]);       // una sola imagen

    for (var i = 0; i < files.length; i++) {

      uploadData.append("files", files[i]);       // imagenes multiples
    }
    uploadData.append('data', JSON.stringify(data));
    return this.http.put<any[]>(this.apiUrl + '/' + id, uploadData, Headers.HttpOptions());
  }

  create2(data: any, files: any): Observable<any> {

    const uploadData = new FormData();
    //uploadData.append('files', files[0]);       // una sola imagen

    for (var i = 0; i < files.length; i++) {
      console.log(files[i]);
      uploadData.append("files", files[i]);       // imagenes multiples
    }
    uploadData.append('data', JSON.stringify(data));
    return this.http.post<any[]>(this.apiUrl + '/create-2', uploadData, Headers.HttpOptions());
  }

  update2(id: string, data: any): Observable<Post> {
    const uri = this.apiUrl + '/update2/' + id;
    console.log(uri);
    return this.http.put<Post>(uri, data, Headers.HttpOptions());
  }

  updateStatus(id: string, data: any): Observable<Post> {
    const uri = this.apiUrl + '/update-status/' + id;
    return this.http.put<Post>(uri, data, Headers.HttpOptions());
  }

  media(data: any, files: any): Observable<any> {

    const uploadData = new FormData();
    //uploadData.append('files', files[0]);       // una sola imagen

    for (var i = 0; i < files.length; i++) {

      uploadData.append("files", files[i]);       // imagenes multiples
    }
    uploadData.append('data', JSON.stringify(data));
    return this.http.post<any[]>(this.apiUrl + '/media', uploadData, Headers.HttpOptions());
  }

  delete(id: any): Observable<any> {
    return this.http.delete<any>(this.apiUrl + '/' + id);
  }

  findOne(id: any): Observable<Post> {
    return this.http
      .get<Post>(this.apiUrl + '/' + id)
      .pipe(retry(1), catchError(this.handleError));
  }

  findOneSlug(data: any): Observable<any> {
    const dataQuery = {
      ...data
    };
    //console.log(dataQuery)
    return this.http.post<Post>(this.apiUrl + '/slug', dataQuery);
  }

  findAllSearch(data: any, limit: number, offset: number): Observable<any> {

    //offset = 1;
    return this.http.post<any>(this.apiUrl + `/q?limit=${limit}&offset=${offset}`, data)
      ;
  }

  findAllSearchInfinite(data: any, limit: number, offset: number): Observable<any> {

    //offset = 1;
    return this.http.post<any>(this.apiUrl + `/infinite?limit=${limit}&offset=${offset}`, data)
      ;
  }

  findAllUser(dataQuery: any, limit: number, offset: number): Observable<any> {
    return this.http.post<Post[]>(this.apiUrl + `/user?limit=${limit}&offset=${offset}`, dataQuery, Headers.HttpOptions());
  }

  findAllUserInfinite(dataQuery: any, limit: number, offset: number): Observable<any> {
    return this.http.post<Post[]>(this.apiUrl + `/user-infinite?limit=${limit}&offset=${offset}`, dataQuery, Headers.HttpOptions());
  }

  findAllUserCount(dataQuery: any): Observable<object[]> {

    return this.http.post<Post[]>(this.apiUrl + '/user-count', dataQuery, Headers.HttpOptions());
  }

  /******** bookmark */
  createBookmark(data: any): Observable<Post> {

    return this.http.post<Post>(this.apiUrl + '/create-bookmark', data);
  }

  findOnBookmarkUser(data: any): Observable<Post> {

    return this.http.post<Post>(this.apiUrl + '/find-all-bookmarks-user', data);
  }

  deleteBookmark(data: any): Observable<Post> {
    return this.http.post<Post>(this.apiUrl + '/delete-bookmark', data);
  }

  findAllBookmarksUser(dataQuery: any, limit: number, offset: number): Observable<any> {
    return this.http.post<Post[]>(this.apiUrl + `/find-all-bookmarks-user?limit=${limit}&offset=${offset}`, dataQuery, Headers.HttpOptions());
  }

  findAllBookmarksUserInfinite(dataQuery: any, limit: number, offset: number): Observable<any> {
    return this.http.post<Post[]>(this.apiUrl + `/find-all-bookmarks-infinite?limit=${limit}&offset=${offset}`, dataQuery, Headers.HttpOptions());
  }

  updateClick(data: any): Observable<Post> {
    return this.http.post<Post>(this.apiUrl + '/update-click', data);
  }

  updatePlan(data: any): Observable<Post> {

    return this.http.post<Post>(this.apiUrl + '/update-plan', data);
  }

  latestPost(data: any): Observable<Post> {

    return this.http.post<Post>(this.apiUrl + '/latest-post', data);
  }

  handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    window.alert(errorMessage);
    return throwError(() => {
      return errorMessage;
    });
  }
}
