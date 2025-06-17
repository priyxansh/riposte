import type { EventName } from '$lib/constants/events';
import type { EventCallback } from '../../types/socket';

class SocketManager {
	private listeners: Map<EventName, Set<EventCallback>> = new Map();

	public addMessageListener(event: EventName, callback: EventCallback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}

		this.listeners.get(event)?.add(callback);
	}

	public removeMessageListener(event: EventName, callback: EventCallback) {
		this.listeners.get(event)?.delete(callback);

		if (this.listeners.get(event)?.size === 0) {
			this.listeners.delete(event);
		}
	}

	private dispatchEvent(event: EventName, payload: any) {
		this.listeners.get(event)?.forEach((cb) => cb(payload));
	}

	private state = $state({
		socket: null as WebSocket | null,
		connectionState: 'disconnected' as 'connected' | 'disconnected' | 'error',
		error: null as Error | null
	});

	public roomState = $state({
		roomId: null as string | null,
		roomName: null as string | null,
		roomMembers: [] as string[]
	});

	public clearRoomState() {
		this.roomState.roomId = null;
		this.roomState.roomName = null;
		this.roomState.roomMembers = [];
	}

	public get socket() {
		return this.state.socket;
	}

	public get connectionState() {
		return this.state.connectionState;
	}

	public get error() {
		return this.state.error;
	}

	public connect(url: string) {
		if (this.state.socket) {
			this.state.socket.close();
		}

		this.state.socket = new WebSocket(url);

		this.state.socket.onopen = () => {
			this.state.connectionState = 'connected';
			this.state.error = null;
			console.log('WebSocket connection established.');
		};

		this.state.socket.onclose = () => {
			this.state.connectionState = 'disconnected';
			console.log('WebSocket connection closed.');
		};

		this.state.socket.onerror = (event) => {
			this.state.connectionState = 'error';
			this.state.error = new Error('WebSocket connection error');
			console.error('WebSocket error:', event);
		};

		this.state.socket.onmessage = (ev) => {
			try {
				const { event, payload } = JSON.parse(ev.data);
				if (typeof event !== 'string' || !payload) return;

				this.dispatchEvent(event as EventName, payload);
			} catch (error) {
				console.error('Error handling WebSocket message:', error);
			}
		};
	}

	public sendMessage(message: string) {
		if (this.state.socket && this.state.socket.readyState === WebSocket.OPEN) {
			this.state.socket.send(message);
		} else {
			console.error('WebSocket is not open. Cannot send message.');
		}
	}
}

export const socketManager = new SocketManager();
