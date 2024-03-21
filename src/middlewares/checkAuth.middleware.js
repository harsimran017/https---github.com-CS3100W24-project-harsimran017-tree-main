import jwt from 'jsonwebtoken'
import ApiError from '../utils/apiError.js'

// Middleware to verify JWT and set user in the request
const checkAuth = (req, res, next) => {
	const authHeader = req.headers['authorization']
	const token = authHeader && authHeader.split(' ')[1]

	if (!token) return res.sendStatus(401) // No token present

	jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
		if (err) return res.sendStatus(401) // Error verifying token, use 401 as in your original code
		req.user = user
		next()
	})
}

// Middleware to check if the user is admin
const isAdmin = (req, res, next) => {
	if (!req.user || !req.user.isAdmin) {
		return res.status(403).json({ message: 'Unauthorized' })
	}
	next()
}

// Middleware for handling 404 Not Found
const notFound = (req, res, next) => {
	const error = new ApiError(`Not Found - ${req.originalUrl}`, 404)
	next(error)
}

// Middleware for error handling
const errorHandler = (err, req, res, next) => {
	if (err instanceof ApiError) {
		res.status(err.status).json({
			error: err.message,
			stack: process.env.NODE_ENV === 'production' ? null : err.stack
		})
	} else {
		const statusCode = res.statusCode === 200 ? 500 : res.statusCode
		res.status(statusCode).json({
			error: err.message,
			stack: process.env.NODE_ENV === 'production' ? null : err.stack
		})
	}
}

export { checkAuth, isAdmin, notFound, errorHandler }
