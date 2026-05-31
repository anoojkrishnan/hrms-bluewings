import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useUiStore } from './lib/store/ui.store';
import { useSessionCheck } from './lib/hooks/useSessionCheck';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppInner() {
  useSessionCheck();
  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
}

export default function App() {
  const { theme } = useUiStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
