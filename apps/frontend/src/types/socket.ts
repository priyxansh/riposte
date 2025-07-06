import type { BaseBroadcastResponse, BaseResponse } from './event-payloads/server';

export type EventCallback = (payload: BaseResponse<any>) => void;
export type BroadcastCallback = (payload: BaseBroadcastResponse<any>) => void;
