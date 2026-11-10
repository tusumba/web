import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

const element = document.getElementById('root');
if (!element) throw new Error('Root element is missing');
createRoot(element).render(<StrictMode><App /></StrictMode>);
