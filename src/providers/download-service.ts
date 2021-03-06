import { Injectable, NgZone } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { FileTransfer, FileUploadOptions, FileTransferObject, FileTransferError } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';
import { ApiService } from './api-service';
import { CatalogitemProvider } from '../providers/catalogitem';
import { Events } from 'ionic-angular/util/events';
import { Constants } from '../providers/constants';
import { AlertController } from 'ionic-angular';
import { Network } from '@ionic-native/network';
import { Storage } from '@ionic/storage';
/*
  Generated class for the DownloadServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class DownloadServiceProvider {
  private _downloadingCount: number = 0;
  downloadList = new Map();
  downloadedList = new Map();
  downloadBooks : any = [];
  downloadedBooks : any = [];
  downloading : boolean = false; //当前是否在下载
  fileTransfer : FileTransferObject;
  curDownloadItem :CatalogitemProvider = null;
  curProgress : number;
  settings : any = null;
  //downloadIndex: number = 0;
  constructor(private api: ApiService, private transfer : FileTransfer, 
              private file: File,
              private events: Events,
              private storage: Storage,
              private alertCtrl: AlertController,
              private ngZone: NgZone,
              private network: Network,
            ) {
    this.fileTransfer = this.transfer.create();
    this.fileTransfer.onProgress((e)=>{
      // this.ngZone.run(() => {
        if (e.lengthComputable) {  
          //console.log('当前进度：' + e.loaded / e.total);  
          this.curProgress = e.loaded / e.total;
          this.ngZone.run(() => {
            if (this.curDownloadItem != null){
              this.curDownloadItem.loaded = e.loaded.toString();
              this.curDownloadItem.total = e.total.toString();
              if (this.downloadBooks.length > 0){
                this.downloadBooks[0].status = this.curDownloadItem.status;
              }
              // this.curDownloadItem.status = `正在下载：${e.loaded} / ${e.total}`;
            }
          });
        } 
      // }) 
    })
  }

  private getSettings(callback) {
    this.storage.get(`settings.${Constants.APP_TYPE}`)
    .then(data => {
      if (data) {
        this.settings = JSON.parse(data);
        if (callback){
          callback()
        }
      }
    }).catch(()=>{
      if (callback){
        if (callback){
          callback()
        }
      }
    });
  }

  addtoDownloadList(chapterItem, bookItem):void{
    this.getSettings(()=>{
      console.log("---------------network status----------------"+this.network.type)
      if (this.network.type != 'wifi' && (this.settings && this.settings.wifiPlaying == true)){
        this.alertCtrl.create({ // 显示下载进度
          title: "提示",
          subTitle: "当前网络状态非wifi状态，您已禁止非wifi状态下载",
          enableBackdropDismiss: false,
          buttons: [
            { 
              text: '确定', handler:() => {}
            },
            ]
        }).present();
        return;
      } 
      var isExist : boolean = false;
      if (this.downloadList.has(bookItem.ID)){
        this.downloadList.get(bookItem.ID).forEach(element => {
          if (element.isEqual(chapterItem)){
            isExist = true;
            return false
          }
        });
      }
      var bookExsit :boolean  = false;
      this.downloadBooks.forEach(element => {
        if (element.ID == bookItem.ID){
          bookExsit = true;
          return false;
        }
      });
      if (bookExsit == false){
        bookItem.status = "等待下载"
        this.downloadBooks.push(bookItem)
        this.events.publish('book.downloading.add', bookItem);
        if (!this.downloadList.has(bookItem.ID)){
          this.downloadList.set(bookItem.ID, []);
        }
        if (!this.downloadedList.has(bookItem.ID)){
           this.downloadedList.set(bookItem.ID, []);
        }
      }
      
      if (isExist == false){
        this.downloadingCount ++;
  
        chapterItem.iswaiting = 1
        this.downloadList.get(bookItem.ID).push(chapterItem)
      }
      console.log("---------------------书本Length="+this.downloadBooks.length+", 章节="+this.downloadList.get(bookItem.ID).length);
      this.startDownLoad()
    })
    
    
   
  }

  get downloadingCount() {
    return this._downloadingCount;
  }

  set downloadingCount(val) {
    this._downloadingCount = val;
    this.events.publish('chapter:downloading', this._downloadingCount);
  }

  startDownLoad(){
    
    while(true && this.downloadBooks.length > 0 && this.downloading == false){
      console.log("----------------startDownLoad11")
      let firstBookId = this.downloadBooks[0].ID;
      if (this.downloading == false && this.downloadList.get(firstBookId).length > 0){
        var item = this.downloadList.get(firstBookId)[0]
        item.iswaiting = 2;
        this.curDownloadItem = item;   this.curDownloadItem = item;
        this.curProgress = 0;
        this.downloading = true;
        console.log("-----------------------开始下载："+item.requestParam.chapterID);
        this.downloadItem(item);
        break;
      }
      if (this.downloadList.get(firstBookId).length <= 0){
        var exsit = false;
        this.downloadedBooks.forEach(element => {
          if (element.ID == firstBookId){
            exsit = true;
            return false;
          }
        });
        
        let book;
        if (exsit == false){
          console.log("----------------装载下载完成-----------")
          book = this.downloadBooks.shift();
          this.downloadedBooks.push(book);
        }else{
          book = this.downloadBooks.shift();
        }
        if (book) {
          this.events.publish('downloading.book.remove', book);
        }
      }
    }
  }

  downloadItem(chapterItem):Promise<any> {

    if (chapterItem.downloaded || chapterItem.isFailed){
      this.downloading = false;
      this.startDownLoad()
      return;
    }
    
    return new Promise((resolve => {
      this.api.get('getChapter.php', chapterItem.requestParam)
        .then(data => {
          console.log(data);
          var title = chapterItem.requestParam.title.replace(/^\s+|\s+$/g,"");
          var path = this.file.documentsDirectory;//"D:\\" ; //this.file.documentsDirectory
          this.file.checkDir(path, title).then(hasExsit=>{
            if (!hasExsit){
              this.file.createDir(path, title, false).catch(()=>{

              });
            }
          }).catch(()=>{

          })
          // var fileurl = path + chapterItem.requestParam.chapterID + '.mp3';
          var fileurl = path + title + "/" + chapterItem.requestParam.chapterID + '.mp3';
          
          var uri = encodeURI(data.chapterSrcArr[0]);
         
          this.fileTransfer.download(uri, fileurl, true).then((fileEntry)=>{
            console.log('下载音频文件: ' + fileEntry.toURL());
            this.downloadingCount --;
            this.curDownloadItem.downloadSucceed(fileEntry.toURL());
            let firstBookId = this.downloadBooks[0].ID;
            this.downloadedList.get(firstBookId).push(this.curDownloadItem)
            this.downloadList.get(firstBookId).shift()
            this.downloading = false;
            this.startDownLoad();
          }).catch((error :FileTransferError)=>{
            console.log("下载报错Error:-------------");
            console.log(error)

            if (error.code != 4){
              this.curDownloadItem.downloadFailed();

              let firstBookId = this.downloadBooks[0].ID;
              this.downloadedList.get(firstBookId).push(this.curDownloadItem)
              console.log(this.curDownloadItem)
              this.downloadList.get(firstBookId).shift()
            }
            this.downloadingCount --;
            this.downloading = false;
            this.startDownLoad();
          });
          resolve(true);
        })
        .catch(error => {
          console.log("下载失败"+error)
          resolve(false);
        })
    }));
  }

  getCurDownloadItem():any{
    return this.curDownloadItem;
  }

  getCurProgress():number{
    return this.curProgress;
  }

  cancelChapter(chapterItem, bookid){
    if (this.downloadList.has(bookid)){
      var index : number = 0;
      for(var i = 0; i < this.downloadList.get(bookid).length; ++i){
        if (this.downloadList.get(bookid)[i].isEqual(chapterItem)){
          index = i;
          break;
        }
      }
      if (index >= 0){
        if (chapterItem.isEqual(this.curDownloadItem)){
          this.fileTransfer.abort();
          this.downloading = false;
          this.curDownloadItem = null;
        }
        chapterItem.cancelSelf()
        this.downloadList.get(bookid).splice(index, 1)
        this.downloadingCount --;
        //this.startDownLoad();
        console.log("---------------------书本Length="+this.downloadBooks.length+", 章节="+this.downloadList.get(bookid).length);
      }
    }
  }

  removeFailedItem(item, bookid){
    if (this.downloadedList.has(bookid)){
      var index = 0;
      for(var i = 0; i < this.downloadedList.get(bookid).length; ++i){
        if (this.downloadedList.get(bookid)[i].isEqual(item)){
          index = i;
          break;
        }
      }
      if (index >= 0){
        item.cancelSelf()
        this.downloadedList.get(bookid).splice(index, 1)

        this.downloadingCount --;
      }
    }
  }

  cancelBook(bookitem){
    var index = this.downloadBooks.indexOf(bookitem)
    if (index == 0) {
      this.fileTransfer.abort();
      this.downloading = false;
      this.curDownloadItem = null;
    }
    if (index >= 0){
      if (this.downloadList.has(bookitem.ID)){
        this.downloadList.get(bookitem.ID).forEach(element => {
          this.downloadingCount --;
          element.cancelSelf();
        });
        this.downloadList.delete(bookitem.ID);
      }
      this.downloadBooks.splice(index, 1)
      this.events.publish('book.downloading.cancel', bookitem);
    }
    //if (index == 0) this.startDownLoad()
  }

  removeDownloadedItem(item, bookid){
    if (this.downloadList.has(bookid)){
      var index = -1;
      for(var i = 0; i < this.downloadList.get(bookid).length; ++i){
        if (this.downloadList.get(bookid)[i].isEqual(item)){
          index = i;
          break;
        }
      }
      if (index >= 0){
        this.downloadList.get(bookid).splice(index, 1);
      }
    }
  }

  getBookDownloadItem(bookId){
    if (this.downloadList.has(bookId)){
      return this.downloadList.get(bookId)
    }
    return null
  }

  refreshItem(item){ //判断是否在下载列表中存在
    var path = this.file.documentsDirectory + item.requestParam.title + '/';
    var filename = item.requestParam.chapterID + '.mp3';
    this.file.checkFile(path, filename).then((e)=>{
      if (e){
        item.downloaded = true;
        item.iswaiting = 2;
        item.audioFile = path + "/" + filename;
      }
    }).catch(()=>{
      
    })
    
  }
  

}
