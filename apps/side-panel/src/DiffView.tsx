import { wordMyersDiff } from "@awa/diff";
import { useMemo } from "react";

interface DiffViewProps {
  original: string;
  modified: string;
}

/** Word-level Myers diff: removed words struck through in red, added words in green. */
export function DiffView({ original, modified }: DiffViewProps) {
  const ops = useMemo(() => wordMyersDiff(original, modified), [original, modified]);

  return (
    <p className="text-sm leading-relaxed text-slate-700" data-testid="diff-view">
      {ops.map((op, i) => {
        if (op.type === "equal") return <span key={i}>{op.text} </span>;
        if (op.type === "delete") {
          return (
            <del key={i} className="rounded bg-red-100 px-0.5 text-red-700">
              {op.text}{" "}
            </del>
          );
        }
        return (
          <ins key={i} className="rounded bg-green-100 px-0.5 text-green-800 no-underline">
            {op.text}{" "}
          </ins>
        );
      })}
    </p>
  );
}
