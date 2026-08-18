import { ILV } from "@allape/gocrud-react";
import { ILyricsProps, Lyrics, TimePoint } from "@allape/lyrics";
import { useLoading } from "@allape/use-loading";
import { LoadingOutlined } from "@ant-design/icons";
import { Empty, Select } from "antd";
import cls from "classnames";
import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { getLyrics } from "../../../api/song.ts";
import { ILyrics } from "../../../model/lyrics.ts";
import { ISong } from "../../../model/song.ts";
import styles from "./style.module.scss";

export interface IKaraokeProps {
  fullscreen?: boolean;
  current: TimePoint;
  song?: ISong;
  onChange?: (tp: TimePoint) => void;
}

export interface IModifiedLyrics extends ILyrics {
  value?: ILyrics["id"];
}

export default function Karaoke({
  fullscreen,
  current,
  song,
  onChange,
}: IKaraokeProps): ReactElement {
  const { t } = useTranslation();

  const { loading, execute } = useLoading();

  const [currentLyrics, setCurrentLyrics] = useState<ILyrics | undefined>(
    undefined,
  );
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);

  const allLyrics = useRef<ILyrics[]>([]);
  const [options, setOptions] = useState<ILV<ILyrics["id"]>[]>([]);
  const [isKaraoke, setIsKaraoke] = useState<boolean>(false);

  const handleChange = useCallback((id?: ILyrics["id"]) => {
    const l = id ? allLyrics.current.find((i) => i.id === id) : undefined;
    setCurrentLyrics(l);
    setIsKaraoke(!!l?.content && /(\[\d+:\d+(\.\d+)?]){2}/gi.test(l.content));
  }, []);

  useEffect(() => {
    setCurrentLyrics(undefined);

    if (!song) {
      return;
    }

    execute(async () => {
      const ls: IModifiedLyrics[] = await getLyrics(song.id);

      allLyrics.current = [];
      handleChange(undefined);
      setOptions([]);

      if (!ls[0]) {
        return;
      }

      allLyrics.current = ls;

      setOptions(ls.map((i) => ({ value: i.id, label: i.name })));
      handleChange(ls[0]?.id);
    }).then();
  }, [execute, song, handleChange]);

  useEffect(() => {
    if (!anchor) {
      return;
    }

    anchor.scrollIntoView({
      block: "center",
    });
  }, [anchor, song]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        wakeLock = await navigator.wakeLock.request("screen");
      } else {
        await wakeLock?.release();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    handleVisibilityChange().then();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLock?.release().then();
    };
  }, []);

  const lyricsStyles = useMemo<ILyricsProps["classNames"]>(
    () => ({
      wrapper: styles.karaoke,
      line: cls(styles.line, fullscreen && styles.fullscreen),
      mask: styles.mask,
      hasLeadingSpace: styles.hasLeadingSpace,
      hasTrailingSpace: styles.hasTrailingSpace,
    }),
    [fullscreen],
  );

  return (
    <div className={styles.wrapper}>
      <div ref={setAnchor}></div>
      {loading && (
        <div className={styles.loadingText}>
          <LoadingOutlined /> {t("player.loadingLyrics")}
        </div>
      )}
      {!loading && options.length === 0 && (
        <div className={styles.empty}>
          <Empty
            description={
              <span style={{ color: "white" }}>{t("player.noLyrics")}</span>
            }
          />
        </div>
      )}
      {currentLyrics?.content && (
        <Lyrics
          karaoke={isKaraoke}
          current={current}
          content={currentLyrics.content}
          onChange={onChange}
          classNames={lyricsStyles}
        />
      )}
      <Select<ILyrics["id"]>
        loading={loading}
        className={cls(styles.selector, fullscreen && styles.fullscreen)}
        value={currentLyrics?.id}
        options={options}
        onChange={handleChange}
        placeholder={options.length ? t("lyrics._") : t("player.noLyrics")}
      />
    </div>
  );
}
