import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { CatalogitemProvider } from '../providers/catalogitem';
import { File } from '@ionic-native/file';
declare let window;
window.downloadTool;
/*
  Generated class for the CataloggroupProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class CataloggroupProvider {

  chapters : any = [];
  book : any;

  constructor(private bookitem: any, private bookchapters : any, private file:File) {
    console.log('Hello CataloggroupProvider Provider');
    this.book = bookitem;
    bookchapters.forEach(element => {
      var citem = new CatalogitemProvider(element, this.book, file);
      //window.downloadTool.refreshItem(citem)
      this.chapters.push(citem);
    });
  }

  downloadSelectItems(){
    this.chapters.forEach(element => {
      if (element.isSelected){
        window.downloadTool.addtoDownloadList(element, this.book);
      }
    });
  }

  downloadOneItem(item){
    item.isSelected = true;
    if (window.downloadTool){
        console.log("加入播放列表")
        window.downloadTool.addtoDownloadList(item, this.book)
    }
  }

  //选中所有
  selectAll(){
    this.chapters.forEach(element => {
      element.isSelected = true;
    });
  }

  //反选
  unselectAll(){
    this.chapters.forEach(element => {
      element.isSelected = !element.isSelected;
    });
  }

  //反序
  reverse(){
    this.chapters.reverse();
  }

  //下载选中
  downloadAll(){
    this.chapters.forEach(element => {
      element.isSelected = true;
    });
    this.downloadSelectItems()
  }

  //连续选中
  selectMutil(){
    console.log("还未实现该方法")
  }

  cancelAll(){
    window.downloadTool.cancelBook(this.book)
  }
}