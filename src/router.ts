import { ServerRequest, ServerResponse, ServerResponseCtx } from './types.js';
export type RouterInfo<Global = undefined> = {
  router: RouterBase<Global>;
  matchType: string;
  matchPart: string;
};
export type RouterExecutorFlags = {
  termination?: boolean;
  [key: string]: unknown;
};
export type RouterExecutorStatus<Global = undefined> = {
  req: ServerRequest<Global>;
  res: ServerResponse<Global>;
  ctx: ServerResponseCtx;
  next: () => Promise<void>;
  routerInfo: RouterInfo<Global>;
  flags: RouterExecutorFlags;
};
export type RouterExecutor<Global = undefined> = (
  status: RouterExecutorStatus<Global>
) => Promise<void>;

export type RouterMatchResult<Global = undefined> = {
  caller: RouterExecutor<Global>;
  info: RouterInfo<Global>;
};
export type RouterMatcher<Global = undefined> = (
  nowPath: string,
  req: ServerRequest<Global>
) => Promise<string | boolean> | (string | boolean);

export type RouterBaseConstructorOptions = {
  name: string;
  level?: number;
};

export abstract class RouterBase<Global = undefined> {
  readonly name: string;
  readonly level: number;
  constructor (options: RouterBaseConstructorOptions) {
    this.name = options.name;
    this.level = options.level || 0;
  }

  abstract match(nowPath: string, req: ServerRequest<Global>): Promise<RouterMatchResult<Global>[]>;

  async execute(
    nowPath: string,
    req: ServerRequest<Global>,
    res: ServerResponse<Global>,
    ctx: ServerResponseCtx
  ): Promise<void> {
    function _callExecutor(executor: RouterMatchResult<Global>) {
      req.logger.debug('execute - ' + executor.info.router.name + ' - ' + executor.info.matchType);
      let nextCalled = false;
      const nowNext = () => {
        nextCalled = true;
        return _next();
      };
      const flags: RouterExecutorFlags = {};
      return Promise.resolve(
        executor.caller({ req, res, ctx, next: nowNext, routerInfo: executor.info, flags })
      ).then(() => {
        if (!nextCalled && !flags.termination) {
          return nowNext();
        }
      });
    }
    const _next = () => {
      return new Promise<void>((resolve, reject) => {
        now++;
        if (nowSubRouters.length <= now) {
          resolve();
          return;
        } else {
          _callExecutor(nowSubRouters[now]).then(resolve, reject);
        }
      });
    };
    const nowSubRouters = await this.match(nowPath, req);
    let now = -1;
    req.logger.debug('match finished. Start execute');
    return _next();
  }
}

export default class Router<Global = undefined> extends RouterBase<Global> {
  readonly name: string;
  readonly level: number;

  readonly options: Readonly<{
    name: string;
    level?: number;
    matcher?: RouterMatcher<Global> | string;
    onRootMatch?: RouterExecutor<Global>;
    onNoMatch?: RouterExecutor<Global>;
  }>;
  protected readonly _matcher: RouterMatcher<Global>;
  constructor (options: {
    name: string;
    level?: number;
    matcher?: RouterMatcher<Global> | string;
    onRootMatch?: RouterExecutor<Global>;
    onNoMatch?: RouterExecutor<Global>;
  }) {
    super({ name: options.name, level: options.level });
    this.options = Object.freeze({ ...options });
    this.name = options.name;
    this.level = options.level || 0;

    if (typeof options.matcher === 'string') {
      const topName = options.matcher;
      this._matcher = (s) => matchTop(s, topName);
    } else if (typeof options.matcher === 'function') {
      this._matcher = options.matcher;
    } else {
      this._matcher = (s) => s;
    }
  }

  readonly subRouters: { [key: string]: RouterBase<Global>[] } = {};
  private subRoutersList: RouterBase<Global>[] = [];

  addRouter(subRouter: RouterBase<Global>): void {
    if (this.subRouters[subRouter.level]) {
      this.subRouters[subRouter.level].push(subRouter);
    } else {
      this.subRouters[subRouter.level] = [subRouter];
    }
    this.refreshSubrouters();
  }
  protected refreshSubrouters() {
    this.subRoutersList = [];
    for (const i of Object.keys(this.subRouters)
      .map((i) => parseInt(i))
      .sort((a, b) => b - a)) {
      for (const j of this.subRouters[i]) {
        this.subRoutersList.push(j);
      }
    }
  }

  async match(nowPath: string, req: ServerRequest<Global>): Promise<RouterMatchResult<Global>[]> {
    const result = await Promise.resolve(this.matcher(nowPath, req));
    const matchPromises: Promise<RouterMatchResult<Global>[]>[] = [];
    if (typeof result === 'string') {
      for (const j of this.subRoutersList) {
        matchPromises.push(j.match(result, req));
      }
      const results = await Promise.all(matchPromises);
      const nowSubRouters: RouterMatchResult<Global>[] = results.flat();
      if (nowSubRouters.length === 0) {
        req.logger.debug(`${this.name}(no match)`);
        nowSubRouters.push({
          caller: this.onNoMatch,
          info: {
            router: this,
            matchType: 'noMatch',
            matchPart: nowPath,
          },
        });
      }
      return nowSubRouters;
    }
    if (result) {
      req.logger.debug(`${this.name}(root match)`);
      return [
        {
          info: {
            router: this,
            matchType: 'root',
            matchPart: nowPath,
          },
          caller: this.onRootMatch,
        },
      ];
    }
    return [];
  }
  async matcher(nowPath: string, req: ServerRequest<Global>): Promise<string | boolean> {
    return this._matcher(nowPath, req);
  }
  async onRootMatch(status: RouterExecutorStatus<Global>): Promise<void> {
    if (this.options.onRootMatch) {
      return this.options.onRootMatch(status);
    }
  }
  async onNoMatch(status: RouterExecutorStatus<Global>): Promise<void> {
    if (this.options.onNoMatch) {
      return this.options.onNoMatch(status);
    }
  }
}

export function matchTop(nowPath: string, target: string) {
  const paths = nowPath.split('/').filter((i) => i);
  if (paths.length === 0) {
    return target === '' ? true : false;
  }
  if (paths[0] === target) {
    if (paths.length > 1) {
      return `/${paths.slice(1).join('/')}`;
    }
    return true;
  }
  return false;
}
