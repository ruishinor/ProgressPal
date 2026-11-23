import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PathwaysPilotApp } from './PathwaysPilotApp';
import '@/styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root was not found.');

createRoot(root).render(
  <StrictMode>
    <PathwaysPilotApp />
  </StrictMode>,
);
