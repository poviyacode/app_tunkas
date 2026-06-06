import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PostAdCategory } from '@interfaces/adCategory';
import { CityZone } from '@interfaces/cityZone';
import { Country } from '@interfaces/country';
import { CountryState } from '@interfaces/countryState';
import { StateCity } from '@interfaces/stateCity';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  url = 'assets/data/';
  private http = inject(HttpClient);

  appCountryfindAll(): Observable<Country[]> {
    return this.http.get<Country[]>(this.url + 'countries.json');
  }

  appCountryStatesfindAll(): Observable<CountryState[]> {
    return this.http.get<CountryState[]>(this.url + 'country-states.json');
  }

  appStateCitiesfindAll(): Observable<StateCity[]> {
    return this.http.get<StateCity[]>(this.url + 'state-cities.json');
  }

  appCityZonesfindAll(): Observable<CityZone[]> {
    return this.http.get<CityZone[]>(this.url + 'city-zones.json');
  }

  appAdCategoriesfindAll(): Observable<PostAdCategory[]> {
    return this.http.get<PostAdCategory[]>(this.url + 'post-ad-categories.json');
  }

}
