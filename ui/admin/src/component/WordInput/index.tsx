import { Input, Tag } from "antd";
import { TextAreaProps } from "antd/es/input";
import {
  MouseEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";

export interface IWordInputProps extends Omit<
  TextAreaProps,
  "value" | "onChange"
> {
  value?: string;
  onChange?: (value?: string) => void;
  cleaner?: RegExp;
  splitter?: RegExp;
  capitalize?: boolean;
  onTagClick?: (value: string) => void;
  onTagAuxClick?: (value: string) => void;
}

export default function WordInput({
  value,
  cleaner,
  splitter,
  capitalize = true,
  onChange,
  onTagClick,
  onTagAuxClick,
  ...props
}: IWordInputProps): ReactElement {
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    if (!value) {
      setWords([]);
      return;
    }

    let v = value;

    if (cleaner) {
      v = v.replace(cleaner, "");
    }

    let values = v
      .split(splitter || /[-_|,，.、/&:：\n]+/)
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
  }, [capitalize, cleaner, splitter, value]);

  const handleContextMenuCapture = useCallback(
    (e: MouseEvent<HTMLSpanElement>, word: string) => {
      e.preventDefault();
      e.stopPropagation();
      onTagAuxClick?.(word);
    },
    [onTagAuxClick],
  );

  return (
    <>
      <Input.TextArea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={1}
        {...props}
      />
      <div style={{ paddingTop: "5px" }}>
        {words.map((word) => (
          <Tag
            key={word}
            onClick={() => (onTagClick || onChange)?.(word)}
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
