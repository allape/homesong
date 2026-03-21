import { ILV } from "@allape/gocrud-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export type BitRate = number;

export default function useBitRates(): ILV<BitRate>[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        value: 0,
        label: t("player.bitRate.original"),
      },
      {
        value: 320_000,
        label: t("player.bitRate.320k"),
      },
      {
        value: 128_000,
        label: t("player.bitRate.128k"),
      },
      {
        value: 96_000,
        label: t("player.bitRate.96k"),
      },
      {
        value: 48_000,
        label: t("player.bitRate.48k"),
      },
      {
        value: 32_000,
        label: t("player.bitRate.32k"),
      },
    ],
    [t],
  );
}
