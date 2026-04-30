import { BaseSearchParams } from "@allape/gocrud";
import { PagedCrudySelector } from "@allape/gocrud-react";
import { ICrudySelectorProps } from "@allape/gocrud-react/src/component/CrudySelector";
import { PropsWithChildren, ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CollectionCrudy } from "../../api/collection.ts";
import {
  ArtistCollectionTypes,
  ICollection,
  ICollectionSearchParams,
  NonArtistCollectionTypes,
} from "../../model/collection.ts";

export interface ICollectionSelectorProps
  extends Partial<ICrudySelectorProps<ICollection>> {
  types?: ICollection["type"][];
}

export default function CollectionSelector({
  types,
  ...props
}: PropsWithChildren<ICollectionSelectorProps>): ReactElement {
  const { t } = useTranslation();

  const sp = useMemo<ICollectionSearchParams>(
    () => ({
      ...BaseSearchParams,
      in_type: types,
      orderBy_priority: "asc",
    }),
    [types],
  );

  return (
    <PagedCrudySelector<ICollection, ICollectionSearchParams>
      placeholder={`${t("select")} ${t("collection._")}`}
      {...props}
      crudy={CollectionCrudy}
      pageSize={100}
      searchParams={sp}
      searchPropName="keywords"
    />
  );
}

export function ArtistSelector(
  props: PropsWithChildren<ICollectionSelectorProps>,
) {
  return <CollectionSelector {...props} types={ArtistCollectionTypes} />;
}

export function NonArtistSelector(
  props: PropsWithChildren<ICollectionSelectorProps>,
) {
  return <CollectionSelector {...props} types={NonArtistCollectionTypes} />;
}
