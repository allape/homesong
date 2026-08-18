import { IBase, IBaseSearchParams } from "@allape/gocrud";

export interface ILyrics extends IBase {
  name: string;
  content: string;
  searchText: string;
  description: string;
}

export interface ILyricsSearchParams extends IBaseSearchParams {
  keywords?: string;
  like_name?: string;
  like_searchText?: string;
}
