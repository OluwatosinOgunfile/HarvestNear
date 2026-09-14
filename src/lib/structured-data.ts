/**
 * Serialises a value for embedding inside a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` alone is not safe there. It escapes quotes and backslashes but leaves `<`
 * untouched, so a farm name, listing title or review containing `</script>` closes the block early
 * and everything after it is parsed as HTML. Since farmers and shoppers write those values, that is
 * a stored cross-site scripting hole on every page carrying structured data.
 *
 * Replacing `<` with its unicode escape yields the same string once parsed, so search engines read
 * the data identically. U+2028 and U+2029 are legal in JSON but are line terminators in JavaScript,
 * and are escaped for the same reason.
 */
const LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, "g");

export function jsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(LINE_SEPARATORS, (character) => `\\u${character.charCodeAt(0).toString(16)}`);
}
