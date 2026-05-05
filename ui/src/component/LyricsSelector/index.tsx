import { BaseSearchParams } from "@allape/gocrud";
import {
  CopyButton,
  CrudySelector,
  type ICrudySelectorProps,
  PagedCrudySelector,
} from "@allape/gocrud-react";
import { Button } from "antd";
import {
  PropsWithChildren,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { LyricsCrudy } from "../../api/lyrics.ts";
import { ILyrics, ILyricsSearchParams } from "../../model/lyrics.ts";
import styles from "./style.module.scss";

export interface ILyricsSelectorProps extends Partial<
  ICrudySelectorProps<ILyrics>
> {
  all?: boolean;
  onLyricsClick?: (record: ILyrics) => void;
}

export default function LyricsSelector({
  all,
  value,
  onLoaded,
  onLyricsClick,
  ...props
}: PropsWithChildren<ILyricsSelectorProps>): ReactElement {
  const { t } = useTranslation();

  const sp = useMemo<ILyricsSearchParams>(
    () => ({
      ...BaseSearchParams,
      orderBy_priority: "desc",
      orderBy_updatedAt: "desc",
    }),
    [],
  );

  const loadedLyricsRef = useRef<ILyrics[]>([]);
  const selectedLyricsIdsRef = useRef<ILyrics["id"][]>([]);

  const [lyrics, setLyrics] = useState<Array<ILyrics | ILyrics["id"]>>([]);

  const handleLyricsChange = useCallback(() => {
    setLyrics(
      selectedLyricsIdsRef.current.map(
        (id) => loadedLyricsRef.current.find((i) => i.id === id) || id,
      ),
    );
  }, []);

  const handleLoaded = useCallback(
    (records: ILyrics[]) => {
      loadedLyricsRef.current = records;
      handleLyricsChange();
      onLoaded?.(records);
    },
    [handleLyricsChange, onLoaded],
  );

  useEffect(() => {
    selectedLyricsIdsRef.current = value || [];
    handleLyricsChange();
  }, [handleLyricsChange, value]);

  return (
    <div className={styles.wrapper}>
      {all ? (
        <CrudySelector<ILyrics, ILyricsSearchParams>
          placeholder={`${t("select")} ${t("lyrics._")}`}
          {...props}
          crudy={LyricsCrudy}
          searchParams={sp}
          value={value}
          onLoaded={handleLoaded}
        />
      ) : (
        <PagedCrudySelector<ILyrics, ILyricsSearchParams>
          placeholder={`${t("select")} ${t("lyrics._")}`}
          {...props}
          crudy={LyricsCrudy}
          pageSize={1000}
          searchParams={sp}
          searchPropName="like_name"
          value={value}
          onLoaded={handleLoaded}
        />
      )}
      {!!lyrics.length && (
        <div className={styles.copyButtons}>
          {lyrics.map((l) =>
            typeof l === "number" ? (
              <span key={l}>{l}</span>
            ) : (
              <div key={l.id}>
                {onLyricsClick ? (
                  <Button type="link" onClick={() => onLyricsClick(l)}>
                    {l.name}
                  </Button>
                ) : (
                  <CopyButton value={l.name}>{l.name}</CopyButton>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
