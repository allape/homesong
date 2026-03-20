import { BaseSearchParams, IBase } from "@allape/gocrud";
import {
  asDefaultPattern,
  config,
  CrudyTable,
  Ellipsis,
  EventEmitter,
  Flex,
  ICrudyTableProps,
  searchable,
  Uploader,
  useMobile,
} from "@allape/gocrud-react";
import NewCrudyButtonEventEmitter from "@allape/gocrud-react/src/component/CrudyButton/eventemitter.ts";
import { useProxy } from "@allape/use-loading";
import {
  CustomerServiceOutlined,
  DownloadOutlined,
  MoreOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Button,
  Divider,
  Dropdown,
  Form,
  FormInstance,
  Input,
  InputNumber,
  MenuProps,
  ModalProps,
  Switch,
  TableColumnsType,
  Tooltip,
} from "antd";
import cls from "classnames";
import {
  ChangeEvent,
  CSSProperties,
  ReactElement,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  createOrGetCollectionsByArtistNames,
  saveCollectionSongsBySong,
} from "../../api/collection.ts";
import {
  fillSongsWithCollections,
  getLyrics,
  ISongWithCollections,
  saveLyricsBySong,
  SongCrudy,
  upload,
} from "../../api/song.ts";
import CollectionCrudyButton from "../../component/CollectionCrudyButton";
import CollectionSelector, {
  ArtistSelector,
  NonArtistSelector,
} from "../../component/CollectionSelector";
import CopyButton from "../../component/CopyButton";
import LyricsCrudyButton from "../../component/LyricsCrudyButton";
import LyricsSelector, {
  ILyricsSelectorProps,
} from "../../component/LyricsSelector";
import SongPlayer from "../../component/SongPlayer";
import WordInput from "../../component/WordInput";
import {
  LyricsCreatorURL,
  LyricsRemoteTouchpadMQTTClientID,
  LyricsRemoteTouchpadMQTTURL,
} from "../../config/lyrics.ts";
import { ICollection } from "../../model/collection.ts";
import { ILyrics } from "../../model/lyrics.ts";
import { ISongSearchParams } from "../../model/song.ts";
import styles from "./style.module.scss";

const LyricsCrudyButtonModalProps: ModalProps = {
  forceRender: true,
};

type ISearchParams = ISongSearchParams;

interface IRecord extends ISongWithCollections {
  _continuesUpload?: boolean;
  _keepCover?: boolean;

  _file?: File;
  _lyricsIds?: ILyrics["id"][];

  _url?: string;
  _download?: string;
  _cover?: string;
  _name?: string;
}

// For demo screenshots
const CensoredStyle: CSSProperties = {
  // filter: "blur(10px)",
};

export default function Song(): ReactElement {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const CollectionCrudyEmitter = useMemo(
    () => NewCrudyButtonEventEmitter<ICollection>(),
    [],
  );
  const LyricsCrudyEmitter = useMemo(
    () => NewCrudyButtonEventEmitter<ILyrics>(),
    [],
  );
  const LyricsSelectorEmitter = useMemo(
    () =>
      new EventEmitter() as Exclude<ILyricsSelectorProps["emitter"], undefined>,
    [],
  );

  const isMobile = useMobile();

  const fileRef = useRef<File | undefined>();

  const [searchParams, setSearchParams] = useState<ISearchParams>(() => ({
    ...BaseSearchParams,
    orderBy_updatedAt: "desc",
  }));
  const [form, setForm] = useState<FormInstance<IRecord> | undefined>();
  const [playerVisible, setPlayerVisible] = useState<boolean>(
    () => window.innerWidth <= 600,
  );
  const [songForPlay, setSongForPlay] = useState<
    ISongWithCollections | undefined
  >();

  const [keywords, keywordsRef, setKeywords] = useProxy<string>("");

  const columns = useMemo<TableColumnsType<IRecord>>(
    () => [
      {
        title: t("id"),
        dataIndex: "id",
        width: 80,
      },
      {
        title: t("song.cover"),
        dataIndex: "_cover",
        render: (v) => {
          return v ? (
            <Avatar
              className={styles.avatar}
              size={64}
              src={v}
              shape="square"
              onClick={() => window.open(v)}
              style={CensoredStyle}
            />
          ) : (
            <Avatar shape="square" size={64} icon={<PictureOutlined />} />
          );
        },
      },
      {
        title: t("song.name"),
        dataIndex: "name",
        ellipsis: { showTitle: true },
        render: (_, record) => (
          <Flex justifyContent="flex-start">
            <CopyButton value={record._name} />
            <Tooltip title={record._name}>
              <Button
                type="link"
                size="small"
                style={CensoredStyle}
                onClick={() => {
                  setPlayerVisible(true);
                  setSongForPlay({ ...record } as ISongWithCollections);
                }}
              >
                {record._name}
              </Button>
            </Tooltip>
            <span>
              {record._nonSingerNames
                ? `+ ${record._nonSingerNames}`
                : undefined}
            </span>
          </Flex>
        ),
        filtered: !!searchParams["like_name"],
        ...searchable(t("song.name"), (value) =>
          setSearchParams((old) => ({
            ...old,
            like_name: value,
          })),
        ),
      },
      {
        title: t("collection._"),
        dataIndex: "_nonArtistNames",
        render: (_, record) => (
          <div style={CensoredStyle}>
            {record._nonArtistNameArr?.length
              ? record._nonArtistNameArr.map((name) => (
                  <div
                    key={name}
                    className={cls(styles.nonArtistName, styles.noWrap)}
                  >
                    {name}
                  </div>
                ))
              : "---"}
          </div>
        ),
        filtered: !!searchParams["in_collectionId"],
        ...searchable<IRecord, ICollection["id"]>(
          t("song.name"),
          (value) =>
            setSearchParams((old) => ({
              ...old,
              in_collectionId: value ? [value] : undefined,
            })),
          (value, onChange) => (
            <CollectionSelector value={value} onChange={onChange} />
          ),
        ),
      },
      {
        title: t("song.mime"),
        dataIndex: "mime",
        align: "center",
        render: (v) => <div className={styles.noWrap}>{v || "-"}</div>,
      },
      {
        title: t("song.ffprobeInfo"),
        dataIndex: "ffprobeInfo",
        render: (v) => <Ellipsis>{v}</Ellipsis>,
      },
      {
        title: t("createdAt"),
        dataIndex: "createdAt",
        render: asDefaultPattern,
      },
      {
        title: t("updatedAt"),
        dataIndex: "updatedAt",
        render: asDefaultPattern,
      },
    ],
    [searchParams, t],
  );

  const handleAfterListed = useCallback(
    async (records: IRecord[]): Promise<IRecord[]> => {
      const swcs = await fillSongsWithCollections(records);
      return swcs.map<IRecord>((s) => {
        const name = `${s._singerNames ? `${s._singerNames} - ` : ""}${s.name}`;
        const ext = s.filename.split(".").pop();

        return {
          ...s,

          _url: s.filename
            ? `${config.SERVER_STATIC_URL}${s.filename}`
            : undefined,
          _download: `${config.SERVER_URL}/song/file/${s.id}?download=${encodeURIComponent(name || s.name)}${ext ? `.${ext}` : ""}`,

          _cover: s.cover ? `${config.SERVER_STATIC_URL}${s.cover}` : undefined,

          _name: name,
        };
      });
    },
    [],
  );

  const handleSave = useCallback(async (record: IRecord): Promise<IRecord> => {
    const song = await upload(record, fileRef.current);

    fileRef.current = undefined;

    await saveCollectionSongsBySong(song.id, "_", record._nonArtistIds || []);

    await saveCollectionSongsBySong(song.id, "singer", record._singerIds || []);
    await saveCollectionSongsBySong(
      song.id,
      "lyricist",
      record._lyricistIds || [],
    );
    await saveCollectionSongsBySong(
      song.id,
      "composer",
      record._composerIds || [],
    );
    await saveCollectionSongsBySong(
      song.id,
      "arranger",
      record._arrangerIds || [],
    );
    await saveCollectionSongsBySong(
      song.id,
      "producer",
      record._producerIds || [],
    );
    await saveCollectionSongsBySong(song.id, "other", record._otherIds || []);

    await saveLyricsBySong(song.id, record._lyricsIds || []);

    return song;
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!form) {
        return;
      }

      fileRef.current = e.target.files?.[0];

      if (fileRef.current && !form.getFieldValue("name")) {
        form.setFieldValue("name", fileRef.current.name);
      }
    },
    [form],
  );

  const menus = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "Collection",
        label: t("collection._"),
        onClick: () => {
          CollectionCrudyEmitter.dispatchEvent("open");
        },
      },
      {
        key: "Lyrics",
        label: t("lyrics._"),
        onClick: () => {
          LyricsCrudyEmitter.dispatchEvent("open");
        },
      },
      {
        key: "Player",
        label: t("player.name"),
        onClick: () => {
          setPlayerVisible(true);
        },
      },
    ],
    [CollectionCrudyEmitter, LyricsCrudyEmitter, t],
  );

  const handleBeforeEdit = useCallback<
    Exclude<ICrudyTableProps<IRecord>["beforeEdit"], undefined>
  >(async (record?: IRecord): Promise<IRecord | undefined> => {
    if (!record) {
      return record;
    }

    record._lyricsIds = (await getLyrics(record.id)).map((i) => i.id) || [];
    return record;
  }, []);

  const handleAfterSaved = useCallback<
    Exclude<ICrudyTableProps<IRecord>["afterSaved"], undefined>
  >((_, form): boolean => {
    const value = form.getFieldsValue();

    if (!value._continuesUpload) {
      return true;
    }

    form.resetFields();
    form.setFieldsValue({
      _continuesUpload: true,
      _keepCover: value._keepCover,
      _nonArtistIds: value._nonArtistIds,

      description: value.description,
      cover: value._keepCover ? value.cover : undefined,
    });

    return false;
  }, []);

  const actions = useCallback<
    Exclude<ICrudyTableProps<IRecord>["actions"], undefined>
  >(
    ({ record, size }): ReactNode => {
      return (
        <>
          <Button
            size={size}
            title={t("download")}
            type="link"
            data-url={record._url}
            href={record._download}
            download={record._name}
          >
            <DownloadOutlined />
          </Button>
        </>
      );
    },
    [t],
  );

  const handleCreateArtist = useCallback(
    async (
      preset: string = "",
      targetField: keyof ISongWithCollections = "_singerIds",
    ) => {
      const res = preset || window.prompt(t("createArtistsFastTips"));
      if (!res) {
        return;
      }

      const names = Array.from(
        new Set(
          res
            .split(/[,，/]/gi)
            .map((i) => i.trim())
            .filter((i) => !!i),
        ),
      );

      const artists = await createOrGetCollectionsByArtistNames(names);

      message.success(t("created"));

      const existingCollections = form?.getFieldValue(targetField) || [];
      form?.setFieldValue(
        targetField,
        Array.from(
          new Set([...artists.map((a) => a.id), ...existingCollections]),
        ),
      );
    },
    [form, message, t],
  );

  const scroll = useMemo<ICrudyTableProps["scroll"]>(
    () => ({
      y: isMobile ? "calc(100dvh - 160px)" : "calc(100dvh - 200px)",
      x: true,
    }),
    [isMobile],
  );

  const saveModalProps = useMemo<ICrudyTableProps["saveModalProps"]>(
    () => ({
      styles: {
        body: {
          maxHeight: isMobile ? "calc(100dvh - 120px)" : "calc(100dvh - 150px)",
          overflowY: "auto",
        },
      },
      onCancel: () => {
        fileRef.current = undefined;
      },
    }),
    [isMobile],
  );

  const handleCopyFilename = useCallback(() => {
    return form?.getFieldValue("_file") || "";
  }, [form]);

  const singersRef = useRef<ICollection[]>([]);

  const handleSingersLoaded = useCallback((records: ICollection[]) => {
    singersRef.current = records;
  }, []);

  const handleCreateLyrics = useCallback(() => {
    setTimeout(() => {
      if (!form) {
        return;
      }

      const singerIds: ICollection["id"][] =
        form.getFieldValue("_singerIds") || [];
      const signersNames = singerIds.length
        ? `${singerIds
            .map((id) => singersRef.current.find((i) => i.id === id)?.name)
            .filter((i) => !!i)
            .join(" & ")} - `
        : "";

      const songName = form.getFieldValue("name") || "";

      LyricsCrudyEmitter.dispatchEvent("open-save-form", {
        name: `${signersNames}${songName}`,
      } as ILyrics);

      LyricsCrudyEmitter.addEventListener(
        "save-form-closed",
        (e) => {
          const old: IBase["id"][] = form.getFieldValue("_lyricsIds") || [];
          form.setFieldValue(
            "_lyricsIds",
            e.value?.id ? [...old, e.value.id] : old,
          );
        },
        {
          once: true,
        },
      );
    });
  }, [LyricsCrudyEmitter, form]);

  const handleEditLyrics = useCallback(
    (record: ILyrics) => {
      LyricsCrudyEmitter.dispatchEvent("open-save-form", record);
      LyricsCrudyEmitter.addEventListener(
        "save-form-closed",
        () => {
          LyricsSelectorEmitter.dispatchEvent("changed", undefined);
        },
        {
          once: true,
        },
      );
    },
    [LyricsCrudyEmitter, LyricsSelectorEmitter],
  );

  const lastSearchedKeywordsRef = useRef<string>("");

  const handleKeywordsSearch = useCallback(() => {
    const kw = keywordsRef.current.trim();

    if (kw === lastSearchedKeywordsRef.current) {
      return;
    }

    lastSearchedKeywordsRef.current = kw;

    if (!kw) {
      setSearchParams((old) => {
        delete old.like_name;
        delete old.like_collectionName;
        return {
          ...old,
        };
      });
      return;
    }

    const indexOfDash = kw.indexOf("-");
    if (indexOfDash > -1) {
      const singerName = kw.slice(0, indexOfDash).trim();
      const songName = kw.slice(indexOfDash + 1).trim();
      if (singerName) {
        setSearchParams((old) => ({
          ...old,
          like_name: songName,
          like_collectionName: singerName,
        }));
      }
      return;
    }

    setSearchParams((old) => ({
      ...old,
      like_name: kw,
      like_collectionName: undefined,
    }));
  }, [keywordsRef]);

  const handleRefineLyrics = useCallback(async () => {
    const data = await form?.validateFields();
    if (!data) {
      return;
    }

    const u = new URL(LyricsCreatorURL);

    u.searchParams.set("remoteTouchpadURL", LyricsRemoteTouchpadMQTTURL);
    u.searchParams.set(
      "remoteTouchpadClientID",
      LyricsRemoteTouchpadMQTTClientID,
    );

    u.searchParams.set(
      "src",
      URL.parse(
        `${config.SERVER_STATIC_URL}${data.filename}`,
        window.location.origin,
      )?.toString() || "",
    );
    if (data._lyricsIds?.length) {
      u.searchParams.set(
        "text",
        URL.parse(
          `${config.SERVER_URL}/lyrics/text/${data._lyricsIds?.[0]}`,
          window.location.origin,
        )?.toString() || "",
      );
    }
    u.hash = "#lyrics-timeline";
    window.open(u.toString());
  }, [form]);

  return (
    <>
      <CrudyTable<IRecord>
        className={cls(styles.wrapper, playerVisible && styles.playerVisible)}
        name={t("song._")}
        crudy={SongCrudy}
        columns={columns}
        searchParams={searchParams}
        afterListed={handleAfterListed}
        onSave={handleSave}
        beforeEdit={handleBeforeEdit}
        afterSaved={handleAfterSaved}
        onFormInit={setForm}
        scroll={scroll}
        actions={actions}
        saveModalProps={saveModalProps}
        titleExtra={
          <div className={styles.keywords}>
            <Input
              placeholder={t("songSearch")}
              value={keywords}
              allowClear
              onChange={(e) => setKeywords(e.target.value)}
              onBlur={handleKeywordsSearch}
              onPressEnter={handleKeywordsSearch}
            />
          </div>
        }
        extra={
          <>
            <div className={cls(styles.extra, styles.windowed)}>
              <LyricsCrudyButton
                modalProps={LyricsCrudyButtonModalProps}
                emitter={LyricsCrudyEmitter}
              />
              <Divider type="vertical" />
              <CollectionCrudyButton emitter={CollectionCrudyEmitter} />
              <Divider type="vertical" />
              <Button
                type="primary"
                title={t("player.name")}
                onClick={() => setPlayerVisible(true)}
              >
                <CustomerServiceOutlined />
              </Button>
            </div>
            <div className={styles.mobile}>
              <Dropdown menu={{ items: menus }}>
                <Button>
                  <MoreOutlined />
                </Button>
              </Dropdown>
            </div>
          </>
        }
      >
        {(record) => (
          <>
            <Flex alignItems="center" justifyContent="flex-start">
              {t("continuesUpload")}:{" "}
              <Form.Item
                noStyle
                name="_continuesUpload"
                label={t("continuesUpload")}
              >
                <Switch />
              </Form.Item>
              {t("keepCover")}:{" "}
              <Form.Item noStyle name="_keepCover">
                <Switch />
              </Form.Item>
            </Flex>
            <Divider plain />
            <Form.Item name="filename" noStyle hidden>
              <Input />
            </Form.Item>
            <Form.Item name="digest" noStyle hidden>
              <Input />
            </Form.Item>
            <Form.Item name="mime" noStyle hidden>
              <Input />
            </Form.Item>
            <Form.Item name="ffprobeInfo" noStyle hidden>
              <Input />
            </Form.Item>
            <Form.Item
              name="_file"
              label={
                <Flex justifyContent="flex-start">
                  <span>{t("song._")}</span>
                  <Divider type="vertical" />
                  <CopyButton value={handleCopyFilename} />
                </Flex>
              }
              rules={[
                {
                  required: !record?.id,
                  message: t("required", {
                    name: t("song._"),
                  }),
                },
              ]}
            >
              <Input
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
              />
            </Form.Item>

            <Form.Item name="index" label={t("song.index")}>
              <InputNumber
                min={-9999}
                max={9999}
                step={1}
                precision={0}
                placeholder={t("song.index")}
              />
            </Form.Item>

            <Form.Item name="cover" label={t("song.cover")}>
              <Uploader serverURL={config.SERVER_STATIC_URL} accept="image/*" />
            </Form.Item>

            <Form.Item
              name="name"
              label={t("song.name")}
              rules={[{ required: true }]}
            >
              <WordInput
                maxLength={200}
                placeholder={t("song.name")}
                onAuxChange={handleCreateArtist}
              />
            </Form.Item>

            <Form.Item
              name="_singerIds"
              label={
                <Flex>
                  {t("collection.artistTypes.singer")}
                  <Divider type="vertical" />
                  <Button type="link" onClick={() => handleCreateArtist()}>
                    {t("createArtistsFast")}
                  </Button>
                </Flex>
              }
            >
              <ArtistSelector
                mode="multiple"
                onLoaded={handleSingersLoaded}
                placeholder={t("collection.artistTypes.singer")}
              />
            </Form.Item>
            <Form.Item
              name="_lyricistIds"
              label={
                <Flex>
                  {t("collection.artistTypes.lyricist")}
                  <Divider type="vertical" />
                  <Button
                    type="link"
                    onClick={() => handleCreateArtist("", "_lyricistIds")}
                  >
                    {t("createArtistsFast")}
                  </Button>
                </Flex>
              }
            >
              <ArtistSelector
                mode="multiple"
                placeholder={t("collection.artistTypes.lyricist")}
              />
            </Form.Item>
            <Form.Item
              name="_composerIds"
              label={
                <Flex>
                  {t("collection.artistTypes.composer")}
                  <Divider type="vertical" />
                  <Button
                    type="link"
                    onClick={() => handleCreateArtist("", "_composerIds")}
                  >
                    {t("createArtistsFast")}
                  </Button>
                </Flex>
              }
            >
              <ArtistSelector
                mode="multiple"
                placeholder={t("collection.artistTypes.composer")}
              />
            </Form.Item>
            <Form.Item
              name="_arrangerIds"
              label={
                <Flex>
                  {t("collection.artistTypes.arranger")}
                  <Divider type="vertical" />
                  <Button
                    type="link"
                    onClick={() => handleCreateArtist("", "_arrangerIds")}
                  >
                    {t("createArtistsFast")}
                  </Button>
                </Flex>
              }
            >
              <ArtistSelector
                mode="multiple"
                placeholder={t("collection.artistTypes.arranger")}
              />
            </Form.Item>
            <Form.Item
              name="_producerIds"
              label={
                <Flex>
                  {t("collection.artistTypes.producer")}
                  <Divider type="vertical" />
                  <Button
                    type="link"
                    onClick={() => handleCreateArtist("", "_producerIds")}
                  >
                    {t("createArtistsFast")}
                  </Button>
                </Flex>
              }
            >
              <ArtistSelector
                mode="multiple"
                placeholder={t("collection.artistTypes.producer")}
              />
            </Form.Item>
            <Form.Item
              name="_otherIds"
              label={
                <Flex>
                  {t("collection.artistTypes.other")}
                  <Divider type="vertical" />
                  <Button
                    type="link"
                    onClick={() => handleCreateArtist("", "_otherIds")}
                  >
                    {t("createArtistsFast")}
                  </Button>
                </Flex>
              }
            >
              <ArtistSelector
                mode="multiple"
                placeholder={t("collection.artistTypes.other")}
              />
            </Form.Item>

            <Form.Item
              name="_nonArtistIds"
              label={
                <Flex>
                  {t("collection._")}
                  <Divider type="vertical" />

                  <Button
                    onClick={() => CollectionCrudyEmitter.dispatchEvent("open")}
                  >
                    {t("gocrud.manage")}
                    {t("collection._")}
                  </Button>
                </Flex>
              }
            >
              <NonArtistSelector mode="multiple"></NonArtistSelector>
            </Form.Item>

            <Form.Item
              name="_lyricsIds"
              label={
                <Flex>
                  {t("lyrics._")}
                  <Divider type="vertical" />

                  <Tooltip
                    title={!record?.id ? t("createSongFirst") : undefined}
                  >
                    <Button
                      type="link"
                      disabled={!record?.id}
                      onClick={handleRefineLyrics}
                    >
                      {t("refineLyrics")}
                    </Button>
                  </Tooltip>
                  <Divider type="vertical" />

                  <Button
                    onClick={() => LyricsCrudyEmitter.dispatchEvent("open")}
                  >
                    {t("gocrud.manage")}
                    {t("lyrics._")}
                  </Button>
                  <Divider type="vertical" />
                  <Button type="primary" onClick={handleCreateLyrics}>
                    {t("gocrud.add")}
                    {t("lyrics._")}
                  </Button>
                </Flex>
              }
            >
              <LyricsSelector
                mode="multiple"
                onLyricsClick={handleEditLyrics}
                emitter={LyricsSelectorEmitter}
              />
            </Form.Item>

            <Form.Item name="description" label={t("song.description")}>
              <Input.TextArea
                rows={10}
                maxLength={20000}
                placeholder={t("song.description")}
              />
            </Form.Item>
          </>
        )}
      </CrudyTable>
      {playerVisible && (
        <SongPlayer
          song={songForPlay}
          onClose={() => {
            setPlayerVisible(false);
            setSongForPlay(undefined);
          }}
        />
      )}
    </>
  );
}
