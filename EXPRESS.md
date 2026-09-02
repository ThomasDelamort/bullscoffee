# Create Express App

mkdir clerk-express
cd clerk-express
npm init -y
npm install express

# Install @clerk/express

npm install @clerk/express

# Add clerk middleware

import express from 'express'
import { clerkMiddleware } from '@clerk/express'

const app = express()
const PORT = 3000

app.use(clerkMiddleware())

// Start the server and listen on the specified port
app.listen(PORT, () => {
console.log(`Example app listening at http://localhost:${PORT}`)
})

# Protect your app

import express from 'express'
import { clerkMiddleware, clerkClient, getAuth } from '@clerk/express'

const app = express()
const PORT = 3000

app.use(clerkMiddleware())

// Use `getAuth()` to protect this route
app.get('/protected', async (req, res) => {
// Use `getAuth()` to get the user's `userId` and authentication status
const { isAuthenticated, userId } = getAuth(req)

// If user isn't authenticated, return a 401 error
if (!isAuthenticated) {
res.status(401).json({ error: 'User not authenticated' })
return
}

// Use Clerk's JavaScript Backend SDK to get the user's User object
const user = await clerkClient.users.getUser(userId)

res.json({ user })
})

// Start the server and listen on the specified port
app.listen(PORT, () => {
console.log(`Example app listening at http://localhost:${PORT}`)
})
