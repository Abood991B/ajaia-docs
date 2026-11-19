"use client";

import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * The anchor for a comment is a mark, not a stored offset. Because the mark
 * lives inside the document HTML, it survives every edit around it: typing
 * before the selection, splitting a paragraph, or reloading from the database.
 * If the anchored text is deleted the mark goes with it, and the comment is
 * shown as unanchored rather than silently pointing at the wrong words.
 */
export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) =>
          attributes.commentId
            ? { "data-comment-id": attributes.commentId }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "comment-mark" }),
      0,
    ];
  },
});
