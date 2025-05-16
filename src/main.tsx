import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { initializeMonaco } from './config/monaco'

// Initialize Monaco with the correct theme
initializeMonaco();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
