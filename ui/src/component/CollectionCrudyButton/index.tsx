import { BaseSearchParams } from "@allape/gocrud";
import {
  asDefaultPattern,
  config,
  CopyButton,
  CrudyButton,
  Ellipsis,
  ICrudyButtonProps,
  searchable,
  Uploader,
  useMobile,
} from "@allape/gocrud-react";
import { CopyOutlined, PictureOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  AvatarProps,
  Form,
  Input,
  InputNumber,
  Select,
  TableColumnsType,
  Tag,
} from "antd";
import { ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CollectionCrudy } from "../../api/collection.ts";
import {
  ICollection,
  ICollectionSearchParams,
  useCollectionTypes,
} from "../../model/collection.ts";

type IRecord = ICollection;
type ISearchParams = ICollectionSearchParams;

export type ICollectionCrudyButtonProps = Partial<ICrudyButtonProps<IRecord>>;

export default function CollectionCrudyButton(
  props: ICollectionCrudyButtonProps,
): ReactElement {
  const { t } = useTranslation();

  const isMobile = useMobile();

  const types = useCollectionTypes();

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
        title: <span className="nowrap">{t("collection.priority")}</span>,
        dataIndex: "priority",
      },
      {
        title: t("collection.type"),
        dataIndex: "type",
        render: (v) => {
          const found = types.find((t) => t.value === v);
          return <Tag color={found?.color}>{found?.label || t("unknown")}</Tag>;
        },
        filtered: !!searchParams["in_type"],
        ...searchable<IRecord, IRecord["type"]>(
          t("collection.type"),
          (value) =>
            setSearchParams((old) => ({
              ...old,
              in_type: value ? [value] : undefined,
            })),
          (value, onChange) => (
            <Select
              options={types}
              value={value}
              onChange={onChange}
              placeholder={t("collection.type")}
            />
          ),
        ),
      },
      {
        title: t("collection.cover"),
        dataIndex: "cover",
        align: "center",
        render: (v, record) => {
          const shape: AvatarProps["shape"] =
            record.type === "artist" ? "circle" : "square";
          return v ? (
            <Avatar
              size={64}
              shape={shape}
              src={`${config.SERVER_STATIC_URL}${v}`}
            />
          ) : (
            <Avatar
              size={64}
              shape={shape}
              icon={shape === "circle" ? <UserOutlined /> : <PictureOutlined />}
            />
          );
        },
      },
      {
        title: t("collection.name"),
        dataIndex: "name",
        render: (v, r) => (
          <>
            <div>
              <CopyButton value={v}>
                {v} <CopyOutlined />
              </CopyButton>
            </div>
            {r.code && (
              <div>
                <CopyButton value={r.code}>
                  <Tag>{r.code}</Tag>
                </CopyButton>
              </div>
            )}
            <div>{r.keywords}</div>
          </>
        ),
        filtered: !!searchParams["keywords"],
        ...searchable(t("collection.keywords"), (value) =>
          setSearchParams((old) => ({
            ...old,
            keywords: value,
          })),
        ),
      },
      {
        title: <span className="nowrap">{t("collection.description")}</span>,
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
    [searchParams, t, types],
  );

  return (
    <CrudyButton
      name={t("collection._")}
      columns={columns}
      crudy={CollectionCrudy}
      searchParams={searchParams}
      scroll={{
        y: isMobile ? "calc(100dvh - 200px)" : "calc(100dvh - 260px)",
        x: true,
      }}
      {...props}
    >
      <Form.Item name="cover" label={t("collection.cover")}>
        <Uploader serverURL={config.SERVER_STATIC_URL} accept="image/*" />
      </Form.Item>
      <Form.Item name="priority" label={t("collection.priority")}>
        <InputNumber
          step={1}
          precision={0}
          placeholder={t("collection.priority")}
        />
      </Form.Item>
      <Form.Item
        name="type"
        label={t("collection.type")}
        rules={[{ required: true }]}
      >
        <Select placeholder={t("collection.type")} options={types} />
      </Form.Item>
      <Form.Item
        name="name"
        label={t("collection.name")}
        rules={[{ required: true }]}
      >
        <Input maxLength={200} placeholder={t("collection.name")} />
      </Form.Item>
      <Form.Item name="code" label={t("collection.code")}>
        <Input maxLength={200} placeholder={t("collection.code")} />
      </Form.Item>
      <Form.Item name="keywords" label={t("collection.keywords")}>
        <Input maxLength={200} placeholder={t("collection.keywords")} />
      </Form.Item>
      <Form.Item name="description" label={t("collection.description")}>
        <Input.TextArea
          maxLength={20000}
          rows={10}
          placeholder={t("collection.description")}
        />
      </Form.Item>
    </CrudyButton>
  );
}
