import { Injectable } from '@angular/core';

@Injectable()
export class Constants {
  public static APP_VERSION = '1.0';
  public static APP_SERVER = '';
  public static APP_NAME = '有声小说';
  public static APP_TYPE: number = 1; // 1 表示有声小说, 2 表示追书小说
}
