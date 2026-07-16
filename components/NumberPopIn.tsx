"use client";

type Props = {
  children: number | string;
  className?: string;
};

export default function NumberPopIn({ children, className }: Props) {
  const valueStr = String(children);
  const chars = valueStr.split("");

  return (
    <span
      key={valueStr}
      className={`t-digit-group is-animating ${className || ""}`}
    >
      {chars.map((char, index) => {
        let stagger: string | undefined;
        if (index === chars.length - 2) stagger = "1";
        else if (index === chars.length - 1) stagger = "2";

        return (
          <span key={index} className="t-digit" data-stagger={stagger}>
            {char}
          </span>
        );
      })}
    </span>
  );
}
