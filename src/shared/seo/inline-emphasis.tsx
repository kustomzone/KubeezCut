/** Renders **bold** in plain strings as strong */
export function InlineEmphasis({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\*\*(.+)\*\*$/.exec(part);
        if (m) {
          return (
            <strong key={i} className="font-semibold text-white/95">
              {m[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
