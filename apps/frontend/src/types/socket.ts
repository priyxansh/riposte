import type { BaseResponse } from './event-payloads/server';

export type EventCallback = (payload: BaseResponse<any>) => void;
