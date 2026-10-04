import axios from 'axios'
import { serverUrl } from '../App'

export const dm = {
  get: (path) => axios.get(`${serverUrl}/api/dm${path}`, { withCredentials: true }),
  post: (path, data) => axios.post(`${serverUrl}/api/dm${path}`, data, { withCredentials: true }),
  put: (path, data) => axios.put(`${serverUrl}/api/dm${path}`, data, { withCredentials: true }),
  patch: (path, data) => axios.patch(`${serverUrl}/api/dm${path}`, data, { withCredentials: true })
}
