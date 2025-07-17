import { Logger } from '@kuankuan/log-control';
import { NOT_FOUND } from './statue.js';
import { ServerRequest, ServerResponse, ServerResponseCtx } from './types.js';
export type RouterInfo<Global> = {
  router: Router<Global>;
  matchType: 'root' | 'noMatch';
  matchPart: string;
};

export type RouterExecutor<Global=undefined> = (
  req: ServerRequest<Global>,
  res: ServerResponse<Global>,
  ctx: ServerResponseCtx,
  next: () => Promise<void>,
  routerInfo: RouterInfo<Global>
) => Promise<void>;
export type RouterExecutorCaller<Global=undefined> = (
  req: ServerRequest<Global>,
  res: ServerResponse<Global>,
  ctx: ServerResponseCtx,
  next: () => Promise<void>
) => Promise<void>;
export type RouterMatcher<Global=undefined> = (
  nowPath: string,
  req: ServerRequest<Global>
) => Promise<string | boolean> | (string | boolean);
export type RouterExecutorThis = {
  logger: Logger;
};
export default class Router<Global=undefined> {
  name: string;
  level: number;
  private matcher: RouterMatcher<Global>;
  subRouters: { [key: string]: Router<Global>[] } = {};
  private subRoutersList: Router<Global>[] = [];
  onRootMatch: RouterExecutor<Global>;
  onNoMatch: RouterExecutor<Global>;
  constructor(options: {
    name: string;
    level?: number;
    matcher?: RouterMatcher<Global> | string;
    onRootMatch?: RouterExecutor<Global>;
    onNoMatch?: RouterExecutor<Global>;
  }) {
    this.name = options.name;
    this.level = options.level || 0;
    if (typeof options.matcher === 'string') {
      const topName = options.matcher;
      options.matcher = (s) => matchTop(s, topName);
    }
    this.matcher = options.matcher || ((s) => s);
    this.onRootMatch = options.onRootMatch || (async () => {});
    this.onNoMatch =
      options.onNoMatch ||
      (async (_req, _res, ctx, next) => {
        ctx.statue = NOT_FOUND;
        await next();
      });
  }
  addRouter(subRouter: Router<Global>): void {
    if (this.subRouters[subRouter.level]) {
      this.subRouters[subRouter.level].push(subRouter);
    } else {
      this.subRouters[subRouter.level] = [subRouter];
    }
    this.refreshSubrouters();
  }
  private refreshSubrouters() {
    this.subRoutersList = [];
    for (const i of Object.keys(this.subRouters)
      .map((i) => parseInt(i))
      .sort((a, b) => b - a)) {
      for (const j of this.subRouters[i]) {
        this.subRoutersList.push(j);
      }
    }
  }
  async match(
    nowPath: string,
    req: ServerRequest<Global>
  ): Promise<RouterExecutorCaller<Global>[]> {
    const result = await Promise.resolve(this.matcher(nowPath, req));
    let nowSubRouters: RouterExecutorCaller<Global>[] = [];

    if (typeof result === 'string') {
      for (const j of this.subRoutersList) {
        nowSubRouters = nowSubRouters.concat(await j.match(result, req));
      }
      if (nowSubRouters.length === 0) {
        req.logger.trace(`${this.name}(no match)`);
        nowSubRouters.push(async (...args) => {
          req.logger.trace('execute - ' + this.name + ' - noMatch');
          return await this.onNoMatch.call(void 0, ...args, {
            router: this,
            matchType: 'noMatch',
            matchPart: result,
          });
        });
      }
    } else {
      if (result) {
        req.logger.trace(`${this.name}(root match)`);
        nowSubRouters.push(async (...args) => {
          req.logger.trace('execute - ' + this.name + ' - rootMatch');
          return await this.onRootMatch.call(void 0, ...args, {
            router: this,
            matchType: 'root',
            matchPart: nowPath,
          });
        });
      }
    }
    return nowSubRouters;
  }

  async execute(
    nowPath: string,
    req: ServerRequest<Global>,
    res: ServerResponse<Global>,
    ctx: ServerResponseCtx
  ): Promise<void> {
    const next = () => {
      return new Promise<void>((resolve, reject) => {
        now++;
        if (nowSubRouters.length <= now) {
          resolve();
          return;
        } else {
          nowSubRouters[now](req, res, ctx, next).then(resolve, reject);
        }
      });
    };
    const nowSubRouters = await this.match(nowPath, req);
    let now = -1;
    req.logger.trace('match finished. Start execute');
    await next();
  }
}

export function matchTop(nowPath: string, target: string) {
  const paths = nowPath.split('/').filter((i) => i);
  if (paths[0] === target) {
    if (paths.length > 1) {
      return `/${paths.slice(1).join('/')}`;
    }
    return true;
  }
  return false;
}
