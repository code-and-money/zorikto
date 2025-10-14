import ky, { HTTPError, TimeoutError, type KyInstance, type Options, type ResponsePromise } from "ky";

export class ZoriktoError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export const NONE = "NONE";
export const CLIENT_ERROR = "CLIENT_ERROR";
export const SERVER_ERROR = "SERVER_ERROR";
export const TIMEOUT_ERROR = "TIMEOUT_ERROR";
export const CONNECTION_ERROR = "CONNECTION_ERROR";
export const NETWORK_ERROR = "NETWORK_ERROR";
export const UNKNOWN_ERROR = "UNKNOWN_ERROR";
export const ABORT_ERROR = "ABORT_ERROR";

export const TIMEOUT_ERROR_CODES = ["ECONNABORTED"] as const;
export const NODEJS_CONNECTION_ERROR_CODES = ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET"] as const;
export const STATUS_ERROR_CODES = ["ERR_BAD_REQUEST", "ERR_BAD_RESPONSE"] as const;

// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
//
//                                  Zorikto
//
// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
export class Zorikto {
  public ky: KyInstance;

  public headers: Headers;
  private baseUrl: URL;

  private configWithoutHeaders: Record<string, any>;
  private configCombined: Record<string, any>;

  public monitors: Monitor[] = [];
  public requestTransformers: RequestTransformer[] = [];
  public responseTransformers: ResponseTransformer[] = [];

  constructor({
    baseUrl,
    ...options
  }: Omit<CustomKyOptions, "headers"> & { headers?: Record<string, string> | [string, string][] } & { baseUrl: string; kyInstance?: KyInstance }) {
    this.headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
    const headers = new Headers(options.headers ?? {});
    headers.forEach((value, key) => this.headers.set(key, value));
    this.baseUrl = new URL(baseUrl);
    this.configWithoutHeaders = { ...options, headers: undefined };
    this.configCombined = { timeout: 10_000, ...this.configWithoutHeaders };
    this.ky = options.kyInstance ? options.kyInstance : ky.create(this.configCombined);
  }

  public setBaseUrl(baseUrl: URL | string): Zorikto {
    this.baseUrl = new URL(baseUrl);
    return this;
  }

  public getBaseUrl(returnAs: "url"): URL;
  public getBaseUrl(returnAs?: "string" | undefined): string;
  public getBaseUrl(returnAs?: "string" | "url") {
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

  public post<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "post" }));
  }
  public put<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "put" }));
  }
  public patch<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "patch" }));
  }
  public get<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "get" }));
  }
  public delete<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "delete" }));
  }
  public head<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "head" }));
  }
  public link<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "link" }));
  }
  public unlink<T>(url: string, options?: ZoriktoOptions): Promise<ZoriktoResult<T>> {
    return this.request<T>(url, this.refineOptions({ ...options, method: "unlink" }));
  }

  private refineOptions(options: ZoriktoOptions | undefined): CustomKyOptions {
    return {
      ...options,
      searchParams: options?.searchParams ? new URLSearchParams(options.searchParams as any) : new URLSearchParams(),
      body: options?.body && ["post", "put", "patch"].includes(options.method ?? "get") ? options.body : undefined,
    };
  }

  private async request<T>(url: string, { body, ...options }: CustomKyOptions): Promise<ZoriktoResult<T>> {
    const headers = new Headers();
    this.headers.forEach((value, key) => headers.set(key, value));
    options.headers?.forEach((value, key) => headers.set(key, value));

    const context = { url, options: { ...options, headers, body } };

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
      const convertedResponse = await convertResponse<T>({ result, startTime, options, responseTransformers: this.responseTransformers });
      runMonitors(convertedResponse, this.monitors);
      return convertedResponse;
    };

    const finalUrl = new URL(context.url, this.baseUrl);

    return this.ky(finalUrl, { ...context.options, body: context.options.body ? JSON.stringify(context.options.body) : undefined })
      .then((result) => chain(result, context.options))
      .catch((error) => chain(error, context.options));
  }
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

async function getApiResponse<T>({
  result,
  startTime,
  options,
}: {
  result: Awaited<ResponsePromise<unknown>>;
  startTime: number;
  options: CustomKyOptions;
}): Promise<ZoriktoResult<T>> {
  const endTime = toNumber(new Date());
  const duration = endTime - startTime;

  if (typeof result === "string") {
    const response = new Response(JSON.stringify({ aborted: result }), { status: 299, statusText: "Aborted" });

    const apiResponse: ResultError = {
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

      const apiResponse: ResultError = {
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
      const apiResponse: ResultError = {
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

    const apiResponse: ResultError = {
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

  const apiResponse: ResultOk<T> = {
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
function runMonitors(response: ZoriktoResult, monitors: Monitor[]): void {
  for (const monitor of monitors) {
    try {
      monitor(response);
    } catch (_error) {}
  }
}

async function convertResponse<T>({
  result,
  startTime,
  options,
  responseTransformers,
}: {
  startTime: number;
  result: Awaited<ResponsePromise<unknown>>;
  options: CustomKyOptions;
  responseTransformers: ResponseTransformer[];
}): Promise<ZoriktoResult<T>> {
  const apiResponse = await getApiResponse<T>({ result, startTime, options });

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
 *   const result = await ky.get('/api/data');
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
 *   const result = await ky.get('/api/data');
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
 *   const result = await ky.get('/api/data', { timeout: 1000 });
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

export type CustomUrlSearchParams = URLSearchParams | string | [string, string][] | Record<string, string | number | boolean>;

export type CustomKyOptions = Omit<Options, "searchParams" | "headers" | "body"> & {
  searchParams?: URLSearchParams;
  headers?: Headers;
  body?: Record<string, any> | any[] | undefined | null;
};

export type ZoriktoConfig = Options & {
  baseUrl: string | undefined;
  kyInstance?: KyInstance;
};

/**
 * Creates a instance of our API using the configuration
 * @param options a configuration object which must have a non-empty 'baseUrl' property.
 */
export type ResultError = {
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

export type ResultOk<T> = {
  bodyUsed: boolean;
  body?: T;

  ok: true;
  issue: typeof NONE;
  originalError: null;

  status: number;
  headers?: Headers;
  options?: CustomKyOptions;
  duration?: number;
};

export type ZoriktoResult<Response = unknown> = ResultError | ResultOk<Response>;

export type Monitor = (response: ZoriktoResult<any>) => void;

type RequestTransformerParams = {
  url: string;
  options: CustomKyOptions;
};

export type RequestTransformer = (params: RequestTransformerParams) => void | Promise<void> | ((params: RequestTransformerParams) => Promise<void>);

export type ResponseTransformer = (result: ZoriktoResult<any>) => void | Promise<void> | ((result: ZoriktoResult<any>) => Promise<void>);

type ZoriktoOptions = Omit<CustomKyOptions, "searchParams"> & { searchParams?: CustomUrlSearchParams };

export type ZoriktoRequest<Response = unknown> = (url: string, options?: ZoriktoOptions) => Promise<ZoriktoResult<Response>>;
