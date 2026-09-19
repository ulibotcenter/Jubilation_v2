interface SpacedWordsProps {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "p";
  id?: string;
}

/** Root is always a flex row so nested use (button, <p>) still keeps a gap. */
export function SpacedWords({
  text,
  className,
  as: Comp = "span",
  id,
}: SpacedWordsProps) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const classes = ["spaced-words", className].filter(Boolean).join(" ");
  return (
    <Comp id={id} className={classes}>
      {words.map((word, i) => (
        <span key={`${i}-${word}`} className="spaced-word">
          {word}
        </span>
      ))}
    </Comp>
  );
}
