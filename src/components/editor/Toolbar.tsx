"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";

function Icon({
  path,
  size = 15,
  strokeWidth = 1.7,
}: {
  path: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const BULLET_PATH = "M5.5 4.5h8M5.5 8h8M5.5 11.5h8M2.6 4.5h.01M2.6 8h.01M2.6 11.5h.01";
const ORDERED_PATH = "M5.8 4.5h7.6M5.8 8h7.6M5.8 11.5h7.6M2.2 3.4h.9v2.2M2 7.2c.3-.5 1.3-.5 1.3.2 0 .5-1.3 1.1-1.3 1.4h1.4M2 10.6h1.3l-.8 1c.6 0 1 .3 1 .8 0 .6-.7.9-1.5.6";

type Props = { editor: Editor | null };

function ToolButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="tool-btn"
      data-active={active ? "true" : "false"}
      aria-label={label}
      title={label}
      aria-pressed={active ? true : false}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Toolbar({ editor }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const rerender = () => setTick((value) => value + 1);
    editor.on("transaction", rerender);
    editor.on("selectionUpdate", rerender);
    return () => {
      editor.off("transaction", rerender);
      editor.off("selectionUpdate", rerender);
    };
  }, [editor]);

  if (!editor) {
    return <div className="toolbar" aria-hidden="true" />;
  }

  const chain = () => editor.chain().focus();

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => chain().undo().run()}
      >
        <Icon path="M6 4.5 3 7.5l3 3M3.4 7.5h6a3.1 3.1 0 0 1 0 6.2H7" />
      </ToolButton>
      <ToolButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => chain().redo().run()}
      >
        <Icon path="M10 4.5l3 3-3 3M12.6 7.5h-6a3.1 3.1 0 0 0 0 6.2H9" />
      </ToolButton>

      <span className="tool-sep" />

      {([1, 2, 3] as const).map((level) => (
        <ToolButton
          key={level}
          label={`Heading ${level}`}
          active={editor.isActive("heading", { level })}
          onClick={() => chain().toggleHeading({ level }).run()}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>H{level}</span>
        </ToolButton>
      ))}

      <span className="tool-sep" />

      <ToolButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => chain().toggleBold().run()}
      >
        <span style={{ fontWeight: 700 }}>B</span>
      </ToolButton>
      <ToolButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => chain().toggleItalic().run()}
      >
        <span style={{ fontStyle: "italic", fontFamily: "var(--font-doc)" }}>I</span>
      </ToolButton>
      <ToolButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => chain().toggleUnderline().run()}
      >
        <span style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>U</span>
      </ToolButton>

      <span className="tool-sep" />

      <ToolButton
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => chain().toggleBulletList().run()}
      >
        <Icon path={BULLET_PATH} />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <Icon path={ORDERED_PATH} />
      </ToolButton>
      <ToolButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>“</span>
      </ToolButton>

      <span className="tool-sep" />

      <ToolButton
        label="Clear formatting"
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      >
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.04em" }}>
          CLEAR
        </span>
      </ToolButton>
    </div>
  );
}
