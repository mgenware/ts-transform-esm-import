export interface PackageJSON {
  name: string;
  version?: string;
  main?: string;
  exports?: string | Record<string, string>;
  type?: string;
  module?: string;
}

export interface Resolver {
  dir: string;
  sourceDir?: boolean;
  filter?: string;
}
