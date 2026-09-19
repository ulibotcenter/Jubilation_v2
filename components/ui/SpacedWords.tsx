interface SpacedWordsProps {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "p";
  id?: string;
}

/** One box per word so letter-spacing cannot eat the gap. */
export function SpacedWords({
  text,
  className,
  as: Comp = "span",
  id,
}: SpacedWordsProps) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (
    <Comp id={id} className={className}>
      {words.map((word, i) => (
        <span key={`${i}-${word}`} className="spaced-word">
          {word}
        </span>
      ))}
    </Comp>
  );
}
