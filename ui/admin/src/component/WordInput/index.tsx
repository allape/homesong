import { Input, InputProps, Tag } from "antd";
import {
  MouseEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";

export interface IWordInputProps
  extends Omit<InputProps, "value" | "onChange"> {
  value?: string;
  splitter?: RegExp;
  capitalize?: boolean;
  onChange?: (value?: string) => void;
  onAuxChange?: (value: string) => void;
}

export default function WordInput({
  value,
  splitter,
  capitalize = true,
  onChange,
  onAuxChange,
  ...props
}: IWordInputProps): ReactElement {
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    if (!value) {
      setWords([]);
      return;
    }

    let values = value
      .split(splitter || /[-|,.、/&]+/)
      .map((i) => i.trim())
      .filter((i) => !!i);

    if (capitalize) {
      values = values.map((i) => {
        return i
          .split(" ")
          .map((i) => i.charAt(0).toUpperCase() + i.slice(1))
          .join(" ");
      });
    }

    setWords((old) => {
      const words: string[] = Array.from(new Set([...values, ...old]));
      if (words.length > 10) {
        return words.slice(0, 10);
      }
      return words;
    });
  }, [capitalize, splitter, value]);

  const handleContextMenuCapture = useCallback(
    (e: MouseEvent<HTMLSpanElement>, word: string) => {
      e.preventDefault();
      e.stopPropagation();
      onAuxChange?.(word);
    },
    [onAuxChange],
  );

  return (
    <>
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
      <div style={{ paddingTop: "5px" }}>
        {words.map((word) => (
          <Tag
            key={word}
            onClick={() => onChange?.(word)}
            onContextMenuCapture={(e) => handleContextMenuCapture(e, word)}
            style={{ cursor: "pointer" }}
          >
            {word}
          </Tag>
        ))}
      </div>
    </>
  );
}
