import { createContext, type ReactNode } from 'react';

/** App-owned optional header action; microlearning imports no feedback service. */
export const MicroFeedbackSlot = createContext<ReactNode>(null);
