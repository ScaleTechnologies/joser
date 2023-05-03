/* eslint-disable @typescript-eslint/ban-types */
export type SerializerType<TValue = unknown, TRaw = unknown> = {
  type: Function;
  serialize: (value: TValue) => TRaw;
  deserialize: (raw: TRaw) => TValue;
};

const BUILT_IN_TYPES: SerializerType[] = [
  {
    type: Date,
    serialize(value: Date) {
      return value.getTime();
    },
    deserialize(raw: number) {
      return new Date(raw);
    },
  },
  {
    type: Buffer,
    serialize(value: Buffer) {
      return value.toString('hex');
    },
    deserialize(raw: string) {
      return Buffer.from(raw, 'hex');
    },
  },
];

export class Serializer {
  private types: Record<string, SerializerType>;
  constructor(opts?: { types?: SerializerType[] }) {
    this.types = [...BUILT_IN_TYPES, ...(opts?.types || [])].reduce(
      (acc, item) => {
        return {
          ...acc,
          [item.type.name]: item,
        };
      },
      {}
    );
  }

  serialize(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const _type = typeof value;

    if (_type === 'number' || _type === 'string' || _type === 'boolean') {
      return value;
    }

    if (_type !== 'object') {
      throw new Error(`unable to serialize ${value}`);
    }

    if (value instanceof Array) {
      return value.map((v) => this.serialize(v), value);
    }

    const obj: Record<string, unknown> = {};

    for (const key of Object.keys(value)) {
      const type = Object.values(this.types).find(
        ({ type }) => value[key] instanceof type
      );
      
      if (type) {
        Object.assign(obj, {
          [key]: type.serialize(value[key]),
          __t: {
            ...(obj['__t'] as Record<string, string> || {}),
            [key]: type.type.name,
          },
        });

        continue;
      }

      obj[key] = this.serialize(value[key]);
    }

    return obj;
  }

  deserialize<T = unknown>(raw: unknown): T {
    if (raw === undefined) {
      return undefined as never;
    }

    if (raw === null) {
      return null as never;
    }

    const _type = typeof raw;

    if (_type === 'number' || _type === 'string' || _type === 'boolean') {
      return raw as never;
    }

    if (_type !== 'object') {
      throw new Error(`unable to deserialize ${raw}`);
    }

    if (raw instanceof Array) {
      return raw.map((v) => this.deserialize(v), raw) as never;
    }

    if (raw instanceof Object) {
      const data: Record<string, unknown> = {};
      const __t: Record<string, unknown> = raw['__t'] || {};

      Object.keys(raw)
        .filter((key) => key !== '__t')
        .map((key) => {
          const type = Object.values(this.types).find(
            ({ type }) => type.name === __t[key]
          );

          if (type) {
            data[key] = type.deserialize(raw[key]);
          } else {
            data[key] = this.deserialize(raw[key]);
          }
        });

      return data as never;
    }

    throw new Error(`unable to deserialize ${raw}`);
  }
}
