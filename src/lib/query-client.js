import { QueryClient } from '@tanstack/react-query';

// networkMode "always": the data layer (api/base44Client) answers from its local copy and queues
// changes itself, so nothing should wait for the browser to be online.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			networkMode: 'always',
		},
		mutations: {
			networkMode: 'always',
		},
	},
});
