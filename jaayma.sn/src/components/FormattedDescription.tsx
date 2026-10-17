type FormattedDescriptionProps = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
};

const MARKDOWN_TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

export default function FormattedDescription({ text, className, style }: FormattedDescriptionProps) {
  const parts = text.split(MARKDOWN_TOKEN);

  return (
    <p className={`whitespace-pre-line ${className ?? ""}`} style={style}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={index} className="rounded bg-black/5 px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
        }
        return part;
      })}
    </p>
  );
}
