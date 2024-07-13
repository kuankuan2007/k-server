type ValueChecker =
  | ((arg: unknown) => boolean | Promise<boolean>)
  | { [Symbol.hasInstance]: (instance: unknown) => boolean }
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'string?'
  | 'number?'
  | 'boolean?'
  | 'object?';
type TypeChecker = {
  [key: string]: TypeChecker | ValueChecker;
};
export function bodyCheck(value: unknown, typeCheck: TypeChecker | ValueChecker): Promise<boolean> {
  return new Promise(async (resolve) => {
    if (value === null) {
      resolve(false);
      return;
    }
    if (typeof typeCheck === 'object') {
      if (typeof value !== 'object') {
        resolve(false);
        return;
      }
      for (const i in typeCheck) {
        if (
          !(await bodyCheck(value[i as keyof typeof value], typeCheck[i as keyof typeof typeCheck]))
        ) {
          resolve(false);
          return;
        }
      }
      resolve(true);
    } else if (
      typeof value === 'undefined' &&
      typeof typeCheck === 'string' &&
      typeCheck.endsWith('?')
    ) {
      resolve(true);
    } else if (typeof typeCheck === 'string') {
      resolve(typeof value === typeCheck || typeof value + '?' === typeCheck);
    } else {
      try {
        if (value instanceof typeCheck) {
          resolve(true);
        }
      } finally {
        try {
          resolve(await Promise.resolve(typeCheck(value)));
        } catch {
          resolve(false);
        }
      }
    }
  });
}
export function mergeUInt8Array(...args: Uint8Array[]) {
  let length = 0;
  args.forEach((i) => (length += i.length));
  let now = 0;
  const result = new Uint8Array(length);
  for (const i of args) {
    result.set(i, now);
    now += i.length;
  }
  return result;
}
export function assert<T extends boolean>(
  value: T,
  message?: string
): T extends true ? void : never {
  if (value === false) {
    throw new Error(message);
  }
  return void 0 as T extends true ? void : never;
}
export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
