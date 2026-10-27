import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CardImageProvider } from './context/CardImageContext';

createRoot(document.getElementById('root')!).render(
  <CardImageProvider>
    <App />
  </CardImageProvider>
);

