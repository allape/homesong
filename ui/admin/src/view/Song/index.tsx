import { BaseSearchParams, IBase, stringify } from "@allape/gocrud";
import {
  asDefaultPattern,
  config,
  CopyButton,
  CrudyTable,
  Ellipsis,
  EventEmitter,
  Flex,
  ICrudyTableProps,
  NewCrudyButtonEventEmitter,
  searchable,
  Uploader,
  useMobile,
} from "@allape/gocrud-react";
import { useLoading, useProxy } from "@allape/use-loading";
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
  Col,
  Divider,
  Dropdown,
  Form,
  FormInstance,
  Input,
  InputNumber,
  MenuProps,
  ModalProps,
  Row,
  Spin,
  Switch,
  TableColumnsType,
  Tag,
  Tooltip,
} from "antd";
import type { Breakpoint } from "antd/es/_util/responsiveObserver";
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
  CollectionSongHandler,
  createOrGetCollectionsByArtistNames,
} from "../../api/collection.ts";
import {
  fillSongsWithCollections,
  getLyrics,
  ISongModified,
  SongCrudy,
  SongLyricsHandler,
  upload,
  uploadCover,
} from "../../api/song.ts";
import CollectionCrudyButton from "../../component/CollectionCrudyButton";
import CollectionSelector, {
  ArtistSelector,
  NonArtistSelector,
} from "../../component/CollectionSelector";
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
import {
  CollectionTypes,
  FromCollectionIds,
  ICollection,
} from "../../model/collection.ts";
import { ILyrics } from "../../model/lyrics.ts";
import { ISongSearchParams } from "../../model/song.ts";
import styles from "./style.module.scss";

const CleanerRegExp = /\[[^\]]+]/g;

const FormColConfig: Partial<Record<Breakpoint, number>> = {
  sm: 12,
  xs: 24,
};

const LyricsCrudyButtonModalProps: ModalProps = {
  forceRender: true,
};

interface IRecord extends ISongModified {
  _continuesUpload?: boolean;
  _keepCover?: boolean;
  _keepArtists?: boolean;

  _file?: File;
  _lyricsIds?: ILyrics["id"][];

  _url?: string;
  _download?: string;
  _cover?: string;
  _name?: string;

  _nonArtistIds?: ICollection["id"][];
  _singerIds?: ICollection["id"][];
  _lyricistIds?: ICollection["id"][];
  _composerIds?: ICollection["id"][];
  _arrangerIds?: ICollection["id"][];
  _producerIds?: ICollection["id"][];

  /**
   * @deprecated
   */
  _otherIds?: ICollection["id"][];
}

type ISearchParams = ISongSearchParams;

// For demo screenshots
const CensoredStyle: CSSProperties = {
  // filter: "blur(10px)",
};

export default function Song(): ReactElement {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { loading: filesLoading, execute: filesExecute } = useLoading();

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
  const lyricsRef = useRef<string>();

  const [searchParams, setSearchParams] = useState<ISearchParams>(() => ({
    ...BaseSearchParams,
    orderBy_updatedAt: "desc",
  }));
  const [form, setForm] = useState<FormInstance<IRecord> | undefined>();
  const [playerVisible, setPlayerVisible] = useState<boolean>(
    () => window.innerWidth <= 600,
  );
  const [songForPlay, setSongForPlay] = useState<ISongModified | undefined>();

  const [keywords, keywordsRef, setKeywords] = useProxy<string>("");

  const columns = useMemo<TableColumnsType<IRecord>>(
    () => [
      {
        title: t("id"),
        dataIndex: "id",
        width: 80,
        filtered: !!searchParams["in_id"],
        ...searchable<IRecord, IRecord["id"]>(t("id"), (value) =>
          setSearchParams((old) => ({
            ...old,
            in_id: value ? [value] : undefined,
          })),
        ),
      },
      {
        title: t("collection._"),
        dataIndex: "_nonArtistNames",
        render: (_, record) => (
          <div>
            <div className="nowrap">{record.mime}</div>
            <div className="nowrap">
              {record._duration} - {record._fileSizeInMB || "??"} MB
            </div>
            <div style={CensoredStyle}>
              {record._collectionSets?._?.sort((a, b) =>
                a.type.localeCompare(b.type),
              ).map((coll) => {
                const color =
                  CollectionTypes.find((ct) => ct.value === coll.type)?.color ||
                  "";
                return (
                  <div
                    key={coll.id}
                    className={cls(styles.nonArtistName, styles.noWrap)}
                  >
                    <Tag color={color}>{coll.name}</Tag>
                  </div>
                );
              }) || "---"}
            </div>
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
          <div>
            <Flex justifyContent="flex-start">
              <CopyButton value={record._name} />
              <Tooltip title={record._name}>
                <Button
                  type="link"
                  size="small"
                  style={CensoredStyle}
                  onClick={() => {
                    setPlayerVisible(true);
                    setSongForPlay({ ...record } as ISongModified);
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
            <Flex justifyContent="flex-start">{record.subtitle}</Flex>
          </div>
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
        const name = `${s.name}${s._singerNames ? ` - ${s._singerNames}` : ""}`;
        const ext = s.filename.split(".").pop();

        return {
          ...s,

          _url: s.filename
            ? `${config.SERVER_STATIC_URL}${s.filename}`
            : undefined,
          _download: `${config.SERVER_URL}/song/file/${s.id}?download=${encodeURIComponent(name || s.name)}${ext ? `.${ext}` : ""}`,

          _cover: s.cover ? `${config.SERVER_STATIC_URL}${s.cover}` : undefined,

          _name: name,

          _nonArtistIds: s._collectionIdSets?._,
          _singerIds: s._collectionIdSets?.singer,
          _lyricistIds: s._collectionIdSets?.lyricist,
          _composerIds: s._collectionIdSets?.composer,
          _arrangerIds: s._collectionIdSets?.arranger,
          _producerIds: s._collectionIdSets?.producer,
          _otherIds: s._collectionIdSets?.other,
        };
      });
    },
    [],
  );

  const handleSave = useCallback(async (record: IRecord): Promise<IRecord> => {
    const song = await upload(
      {
        ...record,
        _nonArtistIds: undefined,
        _singerIds: undefined,
        _lyricistIds: undefined,
        _composerIds: undefined,
        _arrangerIds: undefined,
        _producerIds: undefined,
        _otherIds: undefined,
      } as IRecord,
      fileRef.current,
    );

    fileRef.current = undefined;
    lyricsRef.current = undefined;

    await CollectionSongHandler.saveAfterDelete("songId", song.id, [
      ...FromCollectionIds(record._nonArtistIds || [], song.id, "_"),
      ...FromCollectionIds(record._singerIds || [], song.id, "singer"),
      ...FromCollectionIds(record._lyricistIds || [], song.id, "lyricist"),
      ...FromCollectionIds(record._composerIds || [], song.id, "composer"),
      ...FromCollectionIds(record._arrangerIds || [], song.id, "arranger"),
      ...FromCollectionIds(record._producerIds || [], song.id, "producer"),
      ...FromCollectionIds(record._otherIds || [], song.id, "other"),
    ]);

    await SongLyricsHandler.saveAfterDelete(
      "songId",
      song.id,
      record._lyricsIds?.map((li) => ({
        songId: song.id,
        lyricsId: li,
      })) || [],
    );

    return song;
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!form || !e.target.files?.length) {
        return;
      }

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];

        if (file.type.startsWith("image")) {
          filesExecute(async () => {
            const coverURL = await uploadCover(file);
            form.setFieldValue("cover", coverURL);
          }).then();
          continue;
        }

        if (file.type.startsWith("audio") || file.type.startsWith("video")) {
          fileRef.current = file;
          if (!form.getFieldValue("name")) {
            form.setFieldValue("name", fileRef.current.name);
          }
          continue;
        }

        if (file.type.startsWith("text") || file.name.endsWith(".lrc")) {
          filesExecute(async () => {
            lyricsRef.current = await file.text();
          }).then();
          continue;
        }

        console.log(file.name, "no match op");
      }

      if (!fileRef.current) {
        e.target.value = "";
      }
    },
    [filesExecute, form],
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
      _keepArtists: value._keepArtists,
      _nonArtistIds: value._nonArtistIds,

      description: value.description,
      cover: value._keepCover ? value.cover : undefined,
      ...(value._keepArtists
        ? {
            _singerIds: value._singerIds,
            _lyricistIds: value._lyricistIds,
            _composerIds: value._composerIds,
            _arrangerIds: value._arrangerIds,
            _producerIds: value._producerIds,
            _otherIds: value._otherIds,
          }
        : undefined),
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
    async (preset: string = "", targetField: keyof IRecord = "_singerIds") => {
      const res = preset || window.prompt(t("createArtistsFastTips"));
      if (!res) {
        return;
      }

      const names = Array.from(
        new Set(
          res
            .split(/[,，/&]/gi)
            .map((i) => i.trim())
            .filter((i) => !!i),
        ),
      );

      const artists = await createOrGetCollectionsByArtistNames(names);

      message.success(t("created")).then();

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
          overflowX: "hidden",
        },
      },
      onCancel: () => {
        fileRef.current = undefined;
        lyricsRef.current = undefined;
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
            .join(" & ")}`
        : "";

      const songName = form.getFieldValue("name") || "";

      LyricsCrudyEmitter.dispatchEvent("open-save-form", {
        name: `${songName}${signersNames ? ` - ${signersNames}` : ""}`,
        content: lyricsRef.current || "",
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
    let kw = keywordsRef.current.trim();

    if (kw === lastSearchedKeywordsRef.current) {
      return;
    }

    lastSearchedKeywordsRef.current = kw;

    if (!kw) {
      setSearchParams((old) => {
        return {
          ...old,
          keywords: undefined,
          like_name: undefined,
        };
      });
      return;
    }

    const searchByName = /^["“]/.test(kw);
    if (searchByName) {
      kw = kw.replace(/^["“]+/, "");
    }

    if (searchByName) {
      setSearchParams((old) => ({
        ...old,
        like_name: kw,
        keywords: undefined,
      }));
    } else {
      setSearchParams((old) => ({
        ...old,
        like_name: undefined,
        keywords: kw,
      }));
    }
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
    u.hash = "#lyrics-creator";
    window.open(u.toString());
  }, [form]);

  const handleCopyText = useCallback(
    (text: string) => {
      navigator.clipboard
        ?.writeText(text)
        .then(() => message.success(t("gocrud.copied")))
        .catch((e) => message.error(stringify(e)));
    },
    [message, t],
  );

  return (
    <>
      <CrudyTable<IRecord, ISearchParams>
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
          <Spin spinning={filesLoading}>
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
              {t("keepArtists")}:{" "}
              <Form.Item noStyle name="_keepArtists">
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
              <Input type="file" multiple onChange={handleFileChange} />
            </Form.Item>

            <Form.Item name="priority" label={t("priority")}>
              <InputNumber
                step={1}
                precision={0}
                min={Number.MIN_SAFE_INTEGER}
                max={Number.MAX_SAFE_INTEGER}
                placeholder={t("priority")}
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
                onTagAuxClick={handleCreateArtist}
              />
            </Form.Item>

            <Form.Item name="subtitle" label={t("song.subtitle")}>
              <Input maxLength={20_000} placeholder={t("song.subtitle")} />
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
            <Row gutter={10}>
              <Col {...FormColConfig}>
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
              </Col>
              <Col {...FormColConfig}>
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
              </Col>
              <Col {...FormColConfig}>
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
              </Col>
              <Col {...FormColConfig}>
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
              </Col>
            </Row>
            <Form.Item
              name="_otherIds"
              hidden
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
              <WordInput
                rows={10}
                maxLength={20000}
                placeholder={t("song.description")}
                cleaner={CleanerRegExp}
                onTagClick={(text) => handleCopyText(text)}
              />
            </Form.Item>
          </Spin>
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
