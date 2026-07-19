import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import './index.css'

// When a logged-in session's token has expired, PocketBase returns 401. Clear
// the stale auth and send the user back to login instead of leaving the app in
// a broken "failed to load" state. (Login attempts have no pb_auth yet, so
// they're unaffected.)
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && localStorage.getItem('pb_auth')) {
      localStorage.removeItem('pb_auth')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
