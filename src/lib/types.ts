export type Role = 'system' | 'user' | 'assistant';
export type Message = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	status?: 'streaming' | 'complete' | 'stopped' | 'error';
	error?: string;
	finishReason?: string;
};
export type Conversation = {
	id: string;
	title: string;
	model: string;
	updatedAt: number;
	messages: Message[];
};
export type Settings = { maxTokens: number; theme: 'system' | 'light' | 'dark' };
export type Model = { id: string };