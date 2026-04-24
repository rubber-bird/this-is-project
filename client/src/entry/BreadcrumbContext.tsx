import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BreadcrumbContextValue = {
  taskTitle: string | null;
  setTaskTitle: (title: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [taskTitle, setTaskTitle] = useState<string | null>(null);

  const value = useMemo<BreadcrumbContextValue>(
    () => ({ taskTitle, setTaskTitle }),
    [taskTitle],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

function useBreadcrumbContext(): BreadcrumbContextValue {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumb must be used within BreadcrumbProvider");
  }
  return ctx;
}

export function useTaskBreadcrumb(): string | null {
  return useBreadcrumbContext().taskTitle;
}

export function useSetTaskBreadcrumb(title: string | null) {
  const { setTaskTitle } = useBreadcrumbContext();
  useEffect(() => {
    setTaskTitle(title);
    return () => setTaskTitle(null);
  }, [title, setTaskTitle]);
}
