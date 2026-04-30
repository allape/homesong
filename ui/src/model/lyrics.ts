import {
  IBase,
  IBaseSearchParams,
  ITimeSortSearchParams,
  SortType,
} from "@allape/gocrud";

export interface ILyrics extends IBase {
  name: string;
  content: string;
  searchText: string;
  description: string;
  priority: number;
}

export interface ILyricsSearchParams
  extends
    IBaseSearchParams,
    Pick<ITimeSortSearchParams, "orderBy_createdAt" | "orderBy_updatedAt"> {
  like_name?: string;
  like_searchText?: string;
  in_id?: ILyrics["id"][];
  orderBy_priority?: SortType;
}
