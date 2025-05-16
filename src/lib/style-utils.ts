export type Padding = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

/**
 * Parses a CSS padding shorthand string into an object with `top`, `right`, `bottom`, and `left` properties.
 *
 * ⭐️ Supports up to 4 space-separated values with the following units:
 * - `px`, `em`, `rem`, `%`, `vw`, `vh`
 * - `0` (unitless)
 * - Negative values (e.g., `-0.5vh`, `-10px`)
 *
 * @param {string} padding - The padding string to parse.
 * @returns {Padding} An object containing the parsed padding values.
 * @throws {Error} Throws an error if the padding string is invalid or contains unsupported units.
 *
 * @example
 * // Single value (all sides)
 * parsePadding("10px");
 * // Returns: { top: "10px", right: "10px", bottom: "10px", left: "10px" }
 *
 * @example
 * // Two values (vertical | horizontal)
 * parsePadding("10px 20px");
 * // Returns: { top: "10px", right: "20px", bottom: "10px", left: "20px" }
 *
 * @example
 * // Three values (top | horizontal | bottom)
 * parsePadding("10px 20px 30px");
 * // Returns: { top: "10px", right: "20px", bottom: "30px", left: "20px" }
 *
 * @example
 * // Four values (top | right | bottom | left)
 * parsePadding("10px 20px 30px 40px");
 * // Returns: { top: "10px", right: "20px", bottom: "30px", left: "40px" }
 *
 * @example
 * // Zero without unit
 * parsePadding("0 10px 0 5%");
 * // Returns: { top: "0", right: "10px", bottom: "0", left: "5%" }
 *
 * @example
 * // Negative values
 * parsePadding("-5.5em 3rem -0.5vh 2vw");
 * // Returns: { top: "-5.5em", right: "3rem", bottom: "-0.5vh", left: "2vw" }
 *
 * @example
 * // Invalid unit
 * parsePadding("10px solid 20px");
 * // Throws: Error: Invalid padding unit: "solid"
 *
 * @example
 * // Excessive values
 * parsePadding("10px 20px 30px 40px 50px");
 * // Throws: Error: Invalid padding value (too many or too few parts): "10px 20px 30px 40px 50px"
 */
export function parsePaddingStr(padding: string): Padding {
  // 공백 제거 및 값 분리
  const values = padding.trim().split(/\s+/);

  // 유효성 검사
  if (values.length < 1 || values.length > 4) {
    throw new Error(`Invalid padding value (too many or too few parts): "${padding}"`);
  }

  const VALID_PADDING_REGEX = /^(0|-?\d+(\.\d+)?(px|em|rem|%|vw|vh))$/;

  for (const value of values) {
    if (!VALID_PADDING_REGEX.test(value)) {
      throw new Error(`Invalid padding unit: "${value}". Allowed units are px, em, rem, %, vw, vh`);
    }
  }

  // 값 분배
  switch (values.length) {
    case 1:
      return {
        top: values[0],
        right: values[0],
        bottom: values[0],
        left: values[0],
      };
    case 2:
      return {
        top: values[0],
        right: values[1],
        bottom: values[0],
        left: values[1],
      };
    case 3:
      return {
        top: values[0],
        right: values[1],
        bottom: values[2],
        left: values[1],
      };
    case 4:
      return {
        top: values[0],
        right: values[1],
        bottom: values[2],
        left: values[3],
      };
    default:
      throw new Error(`Unexpected padding format: "${padding}"`);
  }
}

export function parseFontSizeStr(str: string): string | null {
  const trimmed = str.trim();

  const VALID_FONT_SIZE_REGEX = /^(inherit|\d*\.?\d+(px|em|rem))$/;

  if (!VALID_FONT_SIZE_REGEX.test(trimmed)) {
    throw new Error(`Invalid font-size value: "${str}". Allowed units are px, em, rem, and inherit.`);
  }

  return trimmed;
}
