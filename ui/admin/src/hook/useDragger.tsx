import {
  MouseEvent as RME,
  TouchEvent as RTM,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type X = number;
export type Y = number;
export type OnDraggerStart = (e: RME<HTMLElement> | RTM<HTMLElement>) => void;

export type Dragger = {
  x: X;
  y: Y;
  OnDraggerStart: OnDraggerStart;
};

export interface IOptions {
  x?: X;
  y?: Y;
  xOffset?: X;
  yOffset?: Y;
}

export default function useDragger(defaultFunc?: () => IOptions): Dragger {
  const xRef = useRef<X>(0);
  const yRef = useRef<Y>(0);
  const isDraggingRef = useRef(false);

  const xOffsetRef = useRef<number>(0);
  const yOffsetRef = useRef<number>(0);
  const [x, setX] = useState<X>(0);
  const [y, setY] = useState<Y>(0);

  useEffect(() => {
    const handleResize = () => {
      const {
        x: xFP,
        y: yFP,
        xOffset,
        yOffset,
      }: IOptions = defaultFunc?.() || {
        x: 0,
        y: 0,
        xOffset: 0,
        yOffset: 0,
      };

      xOffsetRef.current = xOffset || 0;
      yOffsetRef.current = yOffset || 0;
      setX(() => xFP || 0);
      setY(() => yFP || 0);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [defaultFunc]);

  const onMouseDown: OnDraggerStart = useCallback((e) => {
    isDraggingRef.current = true;
    xRef.current = "clientX" in e ? e.clientX : e.touches[0].clientX;
    yRef.current = "clientY" in e ? e.clientY : e.touches[0].clientY;
  }, []);

  useEffect(() => {
    const xo = xOffsetRef.current || 0;
    const yo = yOffsetRef.current || 0;

    const handleResize = () => {
      setX((x) => {
        let maxX = window.innerWidth + xo;
        maxX = maxX < 0 ? 0 : maxX;
        if (x > maxX) {
          return maxX;
        }
        return x;
      });
      setY((y) => {
        let maxY = window.innerHeight + yo;
        maxY = maxY < 0 ? 0 : maxY;
        if (y > maxY) {
          return maxY;
        }
        return y;
      });
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const y = "clientY" in e ? e.clientY : e.touches[0].clientY;

      if (isDraggingRef.current) {
        const xDelta = x - xRef.current;
        const yDelta = y - yRef.current;
        xRef.current = x;
        yRef.current = y;
        setX((x) => {
          const newX = x + xDelta;
          if (newX < 0 || newX > window.innerWidth + xo) {
            return x;
          }
          return newX;
        });
        setY((y) => {
          const newY = y + yDelta;
          if (newY < 0 || newY > window.innerHeight + yo) {
            return y;
          }
          return newY;
        });
      }
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);

    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);

      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);

      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return {
    x,
    y,
    OnDraggerStart: onMouseDown,
  };
}
