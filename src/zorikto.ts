import ky, { HTTPError, TimeoutError, type KyInstance, type Options, type ResponsePromise } from "ky";

const DEFAULT_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const DEFAULT_CONFIG: Options = {
  timeout: 10_000,
};

export class ZoriktoError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export const ERRORS = Object.freeze({
  NONE: "NONE",
  CLIENT_ERROR: "CLIENT_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  CONNECTION_ERROR: "CONNECTION_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  ABORT_ERROR: "ABORT_ERROR",

  TIMEOUT_ERROR_CODES: ["ECONNABORTED"] as const,
  NODEJS_CONNECTION_ERROR_CODES: ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET"] as const,
  STATUS_ERROR_CODES: ["ERR_BAD_REQUEST", "ERR_BAD_RESPONSE"] as const,
});

export const NONE = "NONE";
export const CLIENT_ERROR = "CLIENT_ERROR";
export const SERVER_ERROR = "SERVER_ERROR";
export const TIMEOUT_ERROR = "TIMEOUT_ERROR";
export const CONNECTION_ERROR = "CONNECTION_ERROR";
export const NETWORK_ERROR = "NETWORK_ERROR";
export const UNKNOWN_ERROR = "UNKNOWN_ERROR";
export const ABORT_ERROR = "ABORT_ERROR";

export const TIMEOUT_ERROR_CODES = ["ECONNABORTED"];
export const NODEJS_CONNECTION_ERROR_CODES = ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET"];
export const STATUS_ERROR_CODES = ["ERR_BAD_REQUEST", "ERR_BAD_RESPONSE"];

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
//
//                                  Zorikto
//
// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
export class Zorikto {
  ky: KyInstance;

  headers: Headers;
  private baseUrl: URL;

  private configWithoutHeaders: Record<string, any>;
  private configCombined: Record<string, any>;

  monitors: Monitor[] = [];
  requestTransformers: RequestTransformer[] = [];
  responseTransformers: ResponseTransformer[] = [];

  constructor({ baseUrl, ...options }: Options & { baseUrl: string; kyInstance?: KyInstance }) {
    this.headers = new Headers({ ...DEFAULT_HEADERS, ...(options.headers ?? {}) });
    this.baseUrl = new URL(baseUrl);
    this.configWithoutHeaders = { ...options, headers: undefined };
    this.configCombined = { ...DEFAULT_CONFIG, ...this.configWithoutHeaders };
    this.ky = options.kyInstance ? options.kyInstance : ky.create(this.configCombined);
  }

  public setBaseURL(baseUrl: URL | string): Zorikto {
    this.baseUrl = new URL(baseUrl);
    return this;
  }

  public getBaseURL(returnAs: "url"): URL;
  public getBaseURL(returnAs?: "string" | undefined): string;
  public getBaseURL(returnAs?: "string" | "url") {
    return returnAs === "url" ? this.baseUrl : this.baseUrl.toString();
  }

  public on(kind: "monitor", transformer: Monitor): Zorikto;
  public on(kind: "request", transformer: RequestTransformer): Zorikto;
  public on(kind: "response", transformer: ResponseTransformer): Zorikto;
  public on(kind: "request" | "response" | "monitor", transformer: any): Zorikto {
    if (kind === "monitor") {
      this.monitors.push(transformer);
    }
    if (kind === "request") {
      this.requestTransformers.push(transformer);
    }
    if (kind === "response") {
      this.responseTransformers.push(transformer);
    }
    return this;
  }

  private doRequestWithoutBody(method: "get" | "head" | "delete" | "link" | "unlink"): RequestWithoutBody {
    return (url, searchParams, options) =>
      this.doRequest(url, {
        ...options,
        searchParams: searchParams ? new URLSearchParams(searchParams as any) : new URLSearchParams(),
        method,
      });
  }

  private doRequestWithBody(method: "post" | "put" | "patch"): RequestWithBody {
    return (url, body, options) =>
      this.doRequest(url, {
        ...options,
        searchParams: options?.searchParams ? new URLSearchParams(options.searchParams as any) : new URLSearchParams(),
        method,
        body: JSON.stringify(body),
      });
  }

  private async doRequest(url: string, options: CustomKyOptions) {
    const headers = new Headers();

    this.headers.forEach((value, key) => headers.set(key, value));
    options.headers?.forEach((value, key) => headers.set(key, value));

    const context = { url, options: { ...options, headers } };

    for (const transformer of this.requestTransformers) {
      const transform = transformer(context);

      if (!transform) {
        continue;
      }

      if (isPromiseLike(transform)) {
        await transform;
      } else {
        await transform(context);
      }
    }

    const startTime = toNumber(new Date());

    const chain = async (result: Awaited<ResponsePromise<unknown>>, options: CustomKyOptions) => {
      const convertedResponse = await convertResponse({ result, startTime, options, responseTransformers: this.responseTransformers });
      runMonitors(convertedResponse, this.monitors);
      return convertedResponse;
    };

    const finalUrl = new URL(context.url, this.baseUrl);

    return this.ky(finalUrl, context.options)
      .then((result) => chain(result, context.options))
      .catch((error) => chain(error, context.options));
  }

  public post = this.doRequestWithBody("post");
  public put = this.doRequestWithBody("put");
  public patch = this.doRequestWithBody("patch");

  public get = this.doRequestWithoutBody("get");
  public delete = this.doRequestWithoutBody("delete");
  public head = this.doRequestWithoutBody("head");
  public link = this.doRequestWithoutBody("link");
  public unlink = this.doRequestWithoutBody("unlink");
}

/**
 * Converts the parameter to a number.
 *
 * Number, null, and undefined will return themselves,
 * but everything else will be convert to a Number, or
 * die trying.
 *
 * @param {String} value String to convert
 * @return {Number} the Number version
 * @example
 * toNumber('7') //=> 7
 */
function toNumber(value: unknown): number {
  // if value is a Date, convert to a number
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const num = Number(value);

    if (Number.isNaN(num)) {
      return 0;
    }

    return num;
  }

  if (typeof value === "number" || value === null || value === undefined) {
    const num = Number(value);

    if (Number.isNaN(num)) {
      return 0;
    }

    return num;
  }

  return 0;
}
/**
 * Given a min and max, determines if the value is included
 * in the range.
 *
 * @sig Number a -> a -> a -> b
 * @param {Number} min minimum number
 * @param {Number} max maximum number
 * @param {Number} value value to test
 * @return {Boolean} is the value in the range?
 * @example
 * isWithin(1, 5, 3) //=> true
 * isWithin(1, 5, 1) //=> true
 * isWithin(1, 5, 5) //=> true
 * isWithin(1, 5, 5.1) //=> false
 */
function isWithin(min: number, max: number, value: number): boolean {
  return value >= min && value <= max;
}
function isPromiseLike<T = unknown>(thing: unknown): thing is Promise<T> {
  if (!thing) {
    return false;
  }

  if (thing instanceof Promise) {
    return true;
  }

  if (!(typeof thing === "object" || typeof thing === "function")) {
    return false;
  }

  return "then" in thing && typeof thing.then === "function";
}
/**
 * Given a HTTP status code, return back the appropriate issue enum.
 */
function getIssueFromStatus(status: undefined | number): ISSUE_CODE {
  if (!status) {
    return UNKNOWN_ERROR;
  }

  if (isStatus(status, 200)) {
    return NONE;
  }

  if (isStatus(status, 400)) {
    return CLIENT_ERROR;
  }

  if (isStatus(status, 500)) {
    return SERVER_ERROR;
  }

  return UNKNOWN_ERROR;
}
/**
 * What's the issue for this ky response?
 */
function getIssueFromError(error: HTTPError | TimeoutError | Error) {
  if (!(error instanceof Error)) {
    return UNKNOWN_ERROR;
  }

  if (error.message === "Network Error") {
    return NETWORK_ERROR;
  }

  if ("code" in error) {
    if (error.code === "ConnectionRefused") {
      return CONNECTION_ERROR;
    }
  }

  if (isTimeoutError(error)) {
    return TIMEOUT_ERROR;
  }

  if (isHTTPError(error)) {
    return getIssueFromStatus(error.response.status);
  }

  return UNKNOWN_ERROR;
}

function isStatus(given: number, against: 200 | 400 | 500 | (number & {})): boolean {
  switch (against) {
    case 200:
      return isWithin(200, 299, given);

    case 300:
      return isWithin(300, 399, given);

    case 400:
      return isWithin(400, 499, given);

    case 500:
      return isWithin(500, 599, given);

    default:
      return given === against;
  }
}

async function getApiResponse({
  result,
  startTime,
  options,
}: {
  startTime: number;
  result: Awaited<ResponsePromise<unknown>>;
  options: CustomKyOptions;
}): Promise<ApiResponse> {
  const endTime = toNumber(new Date());
  const duration = endTime - startTime;

  if (typeof result === "string") {
    const response = new Response(JSON.stringify({ aborted: result }), { status: 299, statusText: "Aborted" });

    const apiResponse: ApiErrorResponse = {
      bodyUsed: response.bodyUsed,
      body: null,
      duration,
      issue: ABORT_ERROR,
      originalError: new ZoriktoError("Aborted", ABORT_ERROR),
      ok: false,
      status: response.status,
      headers: response.headers,
      options: undefined,
    };

    return apiResponse;
  }

  if (isKyError(result)) {
    const issue = getIssueFromError(result);
    const originalError = result;

    if (isHTTPError(result)) {
      const response = result.response.clone();

      const apiResponse: ApiErrorResponse = {
        bodyUsed: response.bodyUsed,
        body: null,
        duration,
        issue,
        originalError,
        ok: false,
        status: response.status,
        headers: response.headers,
        // @ts-expect-error: !!!
        // FIX: fix
        options: result.options,
      };

      return apiResponse;
    }

    if (isTimeoutError(result)) {
      const apiResponse: ApiErrorResponse = {
        bodyUsed: false,
        body: null,
        duration,
        issue,
        originalError,
        ok: false,
        status: 408,
        headers: result.headers,
        options: options,
      };

      return apiResponse;
    }
  }

  if (result instanceof Error) {
    const issue = getIssueFromError(result);
    const originalError = result;

    const apiResponse: ApiErrorResponse = {
      bodyUsed: false,
      body: null,
      duration,
      issue,
      originalError,
      ok: false,
      status: result.status,
      headers: undefined,
      options: options,
    };

    return apiResponse;
  }

  const kyResponse = result.clone();

  // @ts-expect-error: !!!
  const text = await kyResponse.body?.text();

  // @ts-expect-error: !!!
  const apiResponse: ApiResponse = {
    bodyUsed: kyResponse.bodyUsed,
    body: text?.length ? JSON.parse(text) : null,
    duration,
    issue: NONE,
    originalError: null,
    ok: true,
    status: kyResponse.status,
    headers: kyResponse.headers,
    options: options,
  };

  return apiResponse;
}

/**
 * Fires after we convert from ky' response into our response.  Exceptions
 * raised for each monitor will be ignored.
 */
function runMonitors(ourResponse: ApiResponse, monitors: Monitor[]): void {
  for (const monitor of monitors) {
    try {
      monitor(ourResponse);
    } catch (_error) {
      // all monitor complaints will be ignored
    }
  }
}

async function convertResponse({
  result,
  startTime,
  options,
  responseTransformers,
}: {
  startTime: number;
  result: Awaited<ResponsePromise<unknown>>;
  options: CustomKyOptions;
  responseTransformers: ResponseTransformer[];
}): Promise<ApiResponse> {
  const apiResponse = await getApiResponse({ result, startTime, options });

  for (const transformer of responseTransformers) {
    if (!transformer || typeof transformer !== "function") {
      continue;
    }

    const transform = transformer(apiResponse);

    if (!transform) {
      continue;
    }

    if (isPromiseLike(transform)) {
      await transform;
    } else {
      await transform(apiResponse);
    }
  }

  return apiResponse;
}

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
//
//                                  Type Guards
//
// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

/**
 * Type guard to check if an error is a Ky error (HTTPError or TimeoutError).
 *
 * @param error - The error to check
 * @returns `true` if the error is a Ky error, `false` otherwise
 *
 * @example
 * ```
 * import ky, {isKyError} from 'ky';
 * try {
 *   const response = await ky.get('/api/data');
 * } catch (error) {
 *   if (isKyError(error)) {
 *     // Handle Ky-specific errors
 *     console.log('Ky error occurred:', error.message);
 *   } else {
 *     // Handle other errors
 *     console.log('Unknown error:', error);
 *   }
 * }
 * ```
 */
export function isKyError(error: unknown): error is HTTPError | TimeoutError {
  return isHTTPError(error) || isTimeoutError(error);
}

/**
 * Type guard to check if an error is an HTTPError.
 *
 * @param error - The error to check
 * @returns `true` if the error is an HTTPError, `false` otherwise
 *
 * @example
 * ```
 * import ky, {isHTTPError} from 'ky';
 * try {
 *   const response = await ky.get('/api/data');
 * } catch (error) {
 *   if (isHTTPError(error)) {
 *     console.log('HTTP error status:', error.response.status);
 *   }
 * }
 * ```
 */
export function isHTTPError<T = unknown>(error: unknown): error is HTTPError<T> {
  return error instanceof HTTPError || (error as any)?.name === HTTPError.name;
}

/**
 * Type guard to check if an error is a TimeoutError.
 *
 * @param error - The error to check
 * @returns `true` if the error is a TimeoutError, `false` otherwise
 *
 * @example
 * ```
 * import ky, {isTimeoutError} from 'ky';
 * try {
 *   const response = await ky.get('/api/data', { timeout: 1000 });
 * } catch (error) {
 *   if (isTimeoutError(error)) {
 *     console.log('Request timed out:', error.request.url);
 *   }
 * }
 * ```
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError || (error as any)?.name === TimeoutError.name;
}

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
//
//                                    Types
//
// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

export type ISSUE_CODE = "CLIENT_ERROR" | "SERVER_ERROR" | "TIMEOUT_ERROR" | "CONNECTION_ERROR" | "NETWORK_ERROR" | "UNKNOWN_ERROR" | "ABORT_ERROR" | "NONE";

export type CustomURLSearchParams = URLSearchParams | string | [string, string][] | Record<string, string | number | boolean>;

export type CustomKyOptions = Omit<Options, "searchParams" | "headers"> & {
  searchParams?: URLSearchParams;
  headers?: Headers;
};

export type ZoriktoConfig = Options & {
  baseUrl: string | undefined;
  kyInstance?: KyInstance;
};

/**
 * Creates a instance of our API using the configuration
 * @param options a configuration object which must have a non-empty 'baseUrl' property.
 */
export type ApiErrorResponse = {
  bodyUsed: boolean;
  body: null;

  ok: false;
  issue: ISSUE_CODE;
  originalError: Error | HTTPError | TimeoutError | ZoriktoError;

  status: number;
  headers?: Headers;
  options?: CustomKyOptions;
  duration?: number;
};

export type ApiOkResponse<T> = {
  bodyUsed: boolean;
  body?: T;

  ok: true;
  issue: null;
  originalError: null;

  status: number;
  headers?: Headers;
  options?: CustomKyOptions;
  duration?: number;
};

export type ApiResponse<Res = unknown> = ApiErrorResponse | ApiOkResponse<Res>;

export type Monitor = (response: ApiResponse<any>) => void;

type RequestTransformerParams = {
  url: string;
  options: CustomKyOptions;
};

export type RequestTransformer = (params: RequestTransformerParams) => void | Promise<void> | ((params: RequestTransformerParams) => Promise<void>);

export type ResponseTransformer = (response: ApiResponse<any>) => void | Promise<void> | ((response: ApiResponse<any>) => Promise<void>);

export type RequestWithBody<Res = unknown> = (
  url: string,
  body?: any,
  options?: Omit<CustomKyOptions, "searchParams"> & { searchParams?: CustomURLSearchParams },
) => Promise<ApiResponse<Res>>;
export type RequestWithoutBody<Res = unknown> = (
  url: string,
  params?: CustomURLSearchParams | undefined | null,
  options?: Omit<CustomKyOptions, "searchParams"> & { searchParams?: CustomURLSearchParams },
) => Promise<ApiResponse<Res>>;
