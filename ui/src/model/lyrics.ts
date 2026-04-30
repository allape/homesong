import { IBase, IBaseSearchParams } from "@allape/gocrud";

export interface ILyrics extends IBase {
  name: string;
  content: string;
  searchText: string;
  description: string;
  priority: number;
}

export interface ILyricsSearchParams extends IBaseSearchParams {
  like_name?: string;
  like_searchText?: string;
  in_id?: ILyrics["id"][];
  orderBy_index?: "desc" | "asc";
  orderBy_createdAt?: "desc" | "asc";
  orderBy_updatedAt?: "desc" | "asc";
}
