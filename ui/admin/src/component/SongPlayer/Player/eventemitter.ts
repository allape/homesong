import { EventEmitter } from "@allape/gocrud-react";

export default class PlayerEventEmitter extends EventEmitter<
  "play" | "pause" | "stop" | "seekTo" | "seek",
  number | unknown
> {}
