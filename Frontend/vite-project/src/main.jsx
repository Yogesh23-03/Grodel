import './i18n/index.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import {Provider} from 'react-redux'
import './index.css'
import {store} from './redux/store.js'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Provider store={store}>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  </BrowserRouter>,
)

// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import { BrowserRouter } from 'react-router-dom'
// import { Provider } from 'react-redux'
// import { PersistGate } from 'redux-persist/integration/react'

// import './index.css'
// import { store, persistor } from './redux/store.js'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <BrowserRouter>
//       <Provider store={store}>
//         <PersistGate loading={null} persistor={persistor}>
//           <App />
//         </PersistGate>
//       </Provider>
//     </BrowserRouter>
//   </StrictMode>
// )
