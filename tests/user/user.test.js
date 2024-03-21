import request from 'supertest'
import app from '../../src/app.js'
import mongoose from 'mongoose'

describe('User API endpoints', () => {
	beforeAll(async () => {
		await mongoose.connect(process.env.MONGO_URI)
	}, 10000)

	afterAll(async () => {
		await mongoose.disconnect()
	})

	describe('POST /api/users/register', () => {
		it('should validate user input and return 400 for invalid data', async () => {
			const response = await request(app).post('/api/users/register').send({
				email: 'invalid-email',
				password: '123'
			})

			expect(response.statusCode).toBe(400)
			expect(response.body).toHaveProperty('error')
		})

		it('should register a new user and prevent duplicate registration', async () => {
			const newUser = {
				email: 'test@example.com',
				password: 'password123'
			}

			// Register a new user
			let response = await request(app)
				.post('/api/users/register')
				.send(newUser)
			expect(response.statusCode).toBe(201)
			expect(response.body).toHaveProperty('token')
			expect(response.body).toHaveProperty(
				'message',
				'User signed up successfully'
			)

			// Attempt to register the same user again
			response = await request(app).post('/api/users/register').send(newUser)
			expect(response.statusCode).toBe(400)
			expect(response.body).toHaveProperty('error', 'User already exists')
		})
	})

	describe('POST /api/users/login', () => {
		const userData = {
			email: 'login-test@example.com',
			password: 'Password123!'
		}

		beforeAll(async () => {
			// Ensure the user is registered before attempting to log in
			await request(app).post('/api/users/register').send(userData)
		})

		it('should validate user input and return 400 for invalid data', async () => {
			const response = await request(app).post('/api/users/login').send({
				email: 'invalid-email',
				password: '123'
			})

			expect(response.statusCode).toBe(400)
			expect(response.body).toHaveProperty('error')
		})

		it('should allow a user to log in with correct credentials and reject invalid attempts', async () => {
			// Correct credentials
			let response = await request(app).post('/api/users/login').send(userData)
			expect(response.statusCode).toBe(200)
			expect(response.body).toHaveProperty('token')
			expect(response.body).toHaveProperty(
				'message',
				'User logged in successfully'
			)

			// Unregistered email
			response = await request(app).post('/api/users/login').send({
				email: 'not-exist@example.com',
				password: userData.password
			})
			expect(response.statusCode).toBe(400)
			expect(response.body).toHaveProperty('error', 'User not found')

			// Incorrect password
			response = await request(app).post('/api/users/login').send({
				email: userData.email,
				password: 'WrongPassword123!'
			})
			expect(response.statusCode).toBe(400)
			expect(response.body).toHaveProperty('error', 'Invalid password')
		})
	})

	describe('Profile Endpoint', () => {
		let authToken

		beforeAll(async () => {
			// Register and login a user to get a valid token
			const userData = { email: 'user@example.com', password: 'testpassword' }
			await request(app).post('/api/users/register').send(userData)
			const loginResponse = await request(app)
				.post('/api/users/login')
				.send(userData)
			authToken = loginResponse.body.token
		})

		it('should return the user profile for authenticated user', async () => {
			const response = await request(app)
				.get('/api/users/profile')
				.set('Authorization', `Bearer ${authToken}`)
			expect(response.statusCode).toBe(200)
			expect(response.body).toHaveProperty('user')
			expect(response.body.user).toHaveProperty('email', 'user@example.com')
		})

		it('should deny access without a valid token', async () => {
			const response = await request(app)
				.get('/api/users/profile')
				.set('Authorization', 'Bearer invalidtoken123')
			expect(response.statusCode).toBe(401)
		})
	})
})
