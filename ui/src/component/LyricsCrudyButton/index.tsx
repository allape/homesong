import { BaseSearchParams, stringify } from "@allape/gocrud";
import {
  asDefaultPattern,
  CopyButton,
  CrudyButton,
  Ellipsis,
  Flex,
  ICrudyButtonProps,
  searchable,
  useMobile,
} from "@allape/gocrud-react";
import { LyricsDriver } from "@allape/lyrics";
import { CopyOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Divider,
  Form,
  FormInstance,
  Input,
  InputNumber,
  TableColumnsType,
} from "antd";
import { DragEvent, ReactElement, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LyricsCrudy } from "../../api/lyrics.ts";
import { LyricsCreatorDocURL } from "../../config/lyrics.ts";
import { ILyrics, ILyricsSearchParams } from "../../model/lyrics.ts";

type IRecord = ILyrics;
type ISearchParams = ILyricsSearchParams;

export type ILyricsCrudyButtonProps = Partial<ICrudyButtonProps<IRecord>>;

export default function LyricsCrudyButton({
  beforeSave,
  ...props
}: ILyricsCrudyButtonProps): ReactElement {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const isMobile = useMobile();

  const [form, setForm] = useState<FormInstance<ILyrics> | null>(null);
  const [searchParams, setSearchParams] = useState<ISearchParams>(() => ({
    ...BaseSearchParams,
    orderBy_updatedAt: "desc",
  }));

  const columns = useMemo<TableColumnsType<IRecord>>(
    () => [
      {
        title: t("id"),
        dataIndex: "id",
      },
      {
        title: <span className="nowrap">{t("lyrics.priority")}</span>,
        dataIndex: "priority",
      },
      {
        title: t("lyrics.name"),
        dataIndex: "name",
        render: (v) => (
          <CopyButton value={v}>
            {v} <CopyOutlined />
          </CopyButton>
        ),
        filtered: !!searchParams["like_name"],
        ...searchable(t("lyrics.name"), (value) =>
          setSearchParams((old) => ({
            ...old,
            like_name: value,
          })),
        ),
      },
      {
        title: t("lyrics.searchText"),
        dataIndex: "searchText",
        render: (v) => <Ellipsis>{v}</Ellipsis>,
        filtered: !!searchParams["like_searchText"],
        ...searchable(t("lyrics.searchText"), (value) =>
          setSearchParams((old) => ({
            ...old,
            like_searchText: value,
          })),
        ),
      },
      {
        title: t("lyrics.content"),
        dataIndex: "content",
        render: (v) => <Ellipsis>{v}</Ellipsis>,
      },
      {
        title: <span className="nowrap">{t("lyrics.description")}</span>,
        dataIndex: "description",
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

  const handleParseStandardLRC = useCallback(() => {
    const lrc: string =
      window.prompt(t("lyrics.fromStandardLRC")) ||
      form?.getFieldValue("content");
    if (!lrc?.trim()) {
      return;
    }

    form?.setFieldValue("content", LyricsDriver.parseStandardLRC(lrc).save());
  }, [form, t]);

  const handleLRCPDrop = useCallback(
    async (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer?.files?.[0];
      if (!file) {
        return;
      } else if (file.size > 1024 * 1024) {
        message.warning(t("lyrics.fileIsTooLarge"));
        return;
      }

      const text = await file.text();
      if (!text) {
        return;
      }

      form?.setFieldValue("content", text);
    },
    [form, message, t],
  );

  const handleOpenLRCPReadme = useCallback(() => {
    window.open(LyricsCreatorDocURL);
  }, []);

  const handleCopyName = useCallback((): string => {
    return form?.getFieldValue("name");
  }, [form]);

  const handleBeforeSave = useCallback(
    async (record: ILyrics, form: FormInstance<ILyrics>) => {
      try {
        record.searchText = (record.content || "")
          // remove all [00:00.00]
          .replace(/\[\d+:\d+(\.\d+)?]/gi, "")
          // remove all hidden char
          .replace(/\s/gi, "");
      } catch (e) {
        message.warning(`${t("lyrics._")}: ${stringify(e)}`);
        throw e;
      }

      return (beforeSave ? beforeSave(record, form) : record) as ILyrics;
    },
    [beforeSave, message, t],
  );

  return (
    <CrudyButton
      name={t("lyrics._")}
      columns={columns}
      crudy={LyricsCrudy}
      searchParams={searchParams}
      scroll={{
        y: isMobile ? "calc(100dvh - 200px)" : "calc(100dvh - 260px)",
        x: true,
      }}
      onFormInit={setForm}
      {...props}
      beforeSave={handleBeforeSave}
    >
      <Form.Item name="priority" label={t("lyrics.priority")}>
        <InputNumber
          step={1}
          precision={0}
          placeholder={t("lyrics.priority")}
        />
      </Form.Item>
      <Form.Item
        name="name"
        label={
          <Flex justifyContent="flex-start">
            {t("lyrics.name")}
            <CopyButton value={handleCopyName} />
          </Flex>
        }
        rules={[{ required: true }]}
      >
        <Input maxLength={200} placeholder={t("lyrics.name")} />
      </Form.Item>

      <Form.Item
        name="content"
        label={
          <>
            {t("lyrics.content")}
            <Divider type="vertical" />
            <Button type="link" onClick={handleOpenLRCPReadme}>
              {t("lyrics.howToMakeLRCPLyrics")}
            </Button>
            <Divider type="vertical" />
            <Button type="primary" onClick={handleParseStandardLRC}>
              {t("lyrics.fromStandardLRC")}
            </Button>
          </>
        }
        rules={[
          {
            required: true,
            message: t("required", {
              name: t("lyrics.content"),
            }),
          },
        ]}
      >
        <Input.TextArea
          onDrop={handleLRCPDrop}
          rows={10}
          placeholder={t("lyrics.content")}
        />
      </Form.Item>
      <Form.Item name="description" label={t("lyrics.description")}>
        <Input.TextArea
          maxLength={20000}
          rows={10}
          placeholder={t("lyrics.description")}
        />
      </Form.Item>
    </CrudyButton>
  );
}
