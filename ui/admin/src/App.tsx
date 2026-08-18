import { i18n, ThemeProvider } from "@allape/gocrud-react";
import { Locale } from "antd/es/locale";
import zhCN from "antd/locale/zh_CN";
import { ReactElement } from "react";
import styles from "./style.module.scss";
import Song from "./view/Song";

function getLocale(): Locale | undefined {
  const language = i18n.getLanguage();
  if (language.startsWith("zh")) {
    import("dayjs/locale/zh-cn");
    return zhCN;
  }
  return undefined;
}

export default function App(): ReactElement {
  return (
    <ThemeProvider locale={getLocale()}>
      <div className={styles.wrapper}>
        <Song />
      </div>
    </ThemeProvider>
  );
}
