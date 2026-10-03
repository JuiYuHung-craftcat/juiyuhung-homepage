"use client";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  CreateLinkButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  UnnestBlockButton,
  useCreateBlockNote,
} from "@blocknote/react";
import { useEffect, useRef } from "react";

// Terminal-green look to match the rest of the site.
const theme = {
  colors: {
    editor: { text: "#00BB00", background: "#18181b" },
    menu: { text: "#00BB00", background: "#232326" },
    tooltip: { text: "#00BB00", background: "#2e2e33" },
    hovered: { text: "#00BB00", background: "rgba(0, 187, 0, 0.12)" },
    selected: { text: "#000000", background: "#00BB00" },
    disabled: { text: "rgba(0, 187, 0, 0.35)", background: "#232326" },
    shadow: "rgba(0, 0, 0, 0.6)",
    border: "rgba(0, 187, 0, 0.35)",
    sideMenu: "rgba(0, 187, 0, 0.6)",
  },
  borderRadius: 6,
  fontFamily: "inherit",
};

/**
 * Notion-style block editor. Posts are still stored as markdown: the content is
 * parsed from `markdown` on mount and every edit is reported back as markdown.
 */
export default function BlockEditor({
  markdown,
  onChange,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useCreateBlockNote();
  const ready = useRef(false);

  useEffect(() => {
    const blocks = editor.tryParseMarkdownToBlocks(markdown);
    if (blocks.length) editor.replaceBlocks(editor.document, blocks);
    // Ignore the change event fired by loading the content itself.
    const t = setTimeout(() => {
      ready.current = true;
    }, 0);
    return () => clearTimeout(t);
    // Only load once per mount; later edits flow out through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      formattingToolbar={false}
      onChange={() => {
        if (ready.current) onChange(editor.blocksToMarkdownLossy(editor.document));
      }}
      className="admin-block-editor"
    >
      {/* Only formatting that survives the round trip to markdown. */}
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            <BlockTypeSelect key="blockType" />
            <FileReplaceButton key="replaceFile" />
            <BasicTextStyleButton basicTextStyle="bold" key="bold" />
            <BasicTextStyleButton basicTextStyle="italic" key="italic" />
            <BasicTextStyleButton basicTextStyle="strike" key="strike" />
            <BasicTextStyleButton basicTextStyle="code" key="code" />
            <NestBlockButton key="nest" />
            <UnnestBlockButton key="unnest" />
            <CreateLinkButton key="link" />
          </FormattingToolbar>
        )}
      />
    </BlockNoteView>
  );
}
