import { Injectable } from '@angular/core';
import { ApiService } from './api-service';
// import { ToolService } from './tool-service'; 

/*
  Generated class for the ToolService provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
*/
@Injectable()
export class BooksService {
  
  constructor(
    private api: ApiService,
    // private tool: ToolService,
  ) {
    // console.log('Hello ToolService Provider');
  }

  getCategories(params): Promise<any> {
    return this.api.get('getCategory.php', params);
  }

  getBooks(): Promise<any> {
    return new Promise((resolve, reject) => {

    });
  }

  getChapters(): Promise<any> {
    return new Promise((resolve, reject) => {

    });
  }

}
