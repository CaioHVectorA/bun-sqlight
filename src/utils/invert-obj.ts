export function invertObject<T extends Record<string, string | number>>(
  obj: T
): { [key: string]: keyof T } {
  const inverted: { [key: string]: keyof T } = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      inverted[value] = key;
    }
  }

  return inverted;
}
