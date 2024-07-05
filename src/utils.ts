export function jsonStringifyBigIntSafe(obj: any) {
    return JSON.stringify(obj, (key, value) => {
        return typeof value === 'bigint' ? value.toString() : value;
    });
  }