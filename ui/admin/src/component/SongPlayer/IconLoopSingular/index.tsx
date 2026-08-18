import { RetweetOutlined } from "@ant-design/icons";
import { AntdIconProps } from "@ant-design/icons/lib/components/AntdIcon";
import cls from "classnames";
import * as React from "react";
import { HTMLProps, ReactElement } from "react";
import styles from "./style.module.scss";

type Props = Omit<AntdIconProps, "ref"> & React.RefAttributes<HTMLSpanElement>;

export interface IIconLoopSingularProps extends Props {
  wrapperProps?: HTMLProps<HTMLSpanElement>;
}

export default function IconLoopSingular({
  wrapperProps,
  ...props
}: IIconLoopSingularProps): ReactElement {
  return (
    <span
      {...wrapperProps}
      className={cls(styles.wrapper, wrapperProps?.className)}
    >
      <RetweetOutlined {...props} />
    </span>
  );
}
