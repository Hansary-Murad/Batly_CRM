import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: JSON.parse(localStorage.getItem('batly_user')) || null,
  token: localStorage.getItem('batly_token') || null,
  isLoading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload
      state.user = user
      state.token = token
      localStorage.setItem('batly_token', token)
      localStorage.setItem('batly_user', JSON.stringify(user))
    },
    logout: (state) => {
      state.user = null
      state.token = null
      localStorage.removeItem('batly_token')
      localStorage.removeItem('batly_user')
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
  },
})

export const { setCredentials, logout, setLoading, setError } = authSlice.actions
export default authSlice.reducer