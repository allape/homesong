import {
  AudioOutlined,
  FireOutlined,
  RetweetOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  StopOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import IconLoopSingular from "../IconLoopSingular";
import styles from "./style.module.scss";

export type ViewType = "lyrics" | "list";

export type LoopType = "shuffle" | "list" | "singular" | "no";

export interface IControllerProps {
  view?: ViewType;
  loop?: LoopType;
  onLoopChange?: (lt: LoopType) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onViewChange?: (view: ViewType) => void;
}

export default function Controller({
  view,
  loop,
  onLoopChange,
  onPrev,
  onNext,
  onViewChange,
}: IControllerProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper}>
      <Button
        title={t("player.prev")}
        type="link"
        size="large"
        className={styles.button}
        onClick={onPrev}
      >
        <StepBackwardOutlined />
      </Button>
      {view == "lyrics" && (
        <Button
          title={t("player.list")}
          type="link"
          className={styles.button}
          onClick={() => onViewChange?.("list")}
        >
          <UnorderedListOutlined />
        </Button>
      )}
      {view == "list" && (
        <Button
          title={t("player.lyrics")}
          type="link"
          danger
          className={styles.button}
          onClick={() => onViewChange?.("lyrics")}
        >
          <AudioOutlined />
        </Button>
      )}
      {loop === "shuffle" && (
        <Button
          title={t("player.loopType.shuffle")}
          type="link"
          danger
          className={styles.button}
          onClick={() => onLoopChange?.("list")}
        >
          <FireOutlined />
        </Button>
      )}
      {loop === "list" && (
        <Button
          title={t("player.loopType.list")}
          type="link"
          danger
          className={styles.button}
          onClick={() => onLoopChange?.("singular")}
        >
          <RetweetOutlined />
        </Button>
      )}
      {loop === "singular" && (
        <Button
          title={t("player.loopType.singular")}
          type="link"
          danger
          className={styles.button}
          onClick={() => onLoopChange?.("no")}
        >
          <IconLoopSingular />
        </Button>
      )}
      {loop === "no" && (
        <Button
          title={t("player.loopType.no")}
          type="link"
          className={styles.button}
          onClick={() => onLoopChange?.("shuffle")}
        >
          <StopOutlined />
        </Button>
      )}
      <Button
        title={t("player.next")}
        type="link"
        className={styles.button}
        onClick={onNext}
      >
        <StepForwardOutlined />
      </Button>
    </div>
  );
}
