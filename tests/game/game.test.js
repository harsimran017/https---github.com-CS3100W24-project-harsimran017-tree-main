import request from 'supertest'
import app from '../../src/app.js'
import mongoose from 'mongoose'
import seedAdminUser from '../../seedAdmin.js'

describe('User API endpoints', () => {
	let adminToken, userToken, gameId

	beforeAll(async () => {
		await mongoose.connect(process.env.MONGO_URI)
		await seedAdminUser()

		// Seed admin user and login
		const adminResponse = await request(app).post('/api/users/login').send({
			email: 'adminUser@email.com',
			password: 'adminPassword'
		})
		adminToken = adminResponse.body.token

		// Register a new user and login
		const userResponse = await request(app).post('/api/users/register').send({
			email: 'testuser@example.com',
			password: 'testpassword'
		})
		userToken = userResponse.body.token

		// Create a game used for multiple tests to reduce setup redundancy
		const gameResponse = await request(app)
			.post('/api/games/create')
			.send({
				name: 'Shared Test Game',
				startTime: '2024-01-01T00:00:00Z',
				endTime: '2024-12-31T00:00:00Z',
				initialAmount: 1000
			})
			.set('Authorization', `Bearer ${adminToken}`)
		gameId = gameResponse.body._id
	}, 30000)

	afterAll(async () => {
		await mongoose.disconnect()
	})

	describe('Game Creation and Retrieval', () => {
		it('should create a new game and retrieve it by id', async () => {
			// Test for creating a new game is done in the beforeAll hook

			// Test for retrieving the created game by ID
			const getResponse = await request(app)
				.get(`/api/games/${gameId}`)
				.set('Authorization', `Bearer ${adminToken}`)
			expect(getResponse.statusCode).toBe(200)
			expect(getResponse.body).toHaveProperty('name', 'Shared Test Game')
		})

		it('should return paginated list of games', async () => {
			const listResponse = await request(app)
				.get('/api/games')
				.query({ page: 1, limit: 10 })
				.set('Authorization', `Bearer ${adminToken}`)
			expect(listResponse.statusCode).toBe(200)
			expect(Array.isArray(listResponse.body.games)).toBeTruthy()
		})
	})

	describe('User Registration for Game', () => {
		it('should register a user for a game and prevent duplicate registrations', async () => {
			// Register user for the game
			const registerResponse = await request(app)
				.post(`/api/games/${gameId}/register`)
				.set('Authorization', `Bearer ${userToken}`)
			expect(registerResponse.status).toBe(200)
			expect(registerResponse.body).toHaveProperty('cash', 1000)

			// Attempt to register again to test prevention of duplicate registrations
			const duplicateRegisterResponse = await request(app)
				.post(`/api/games/${gameId}/register`)
				.set('Authorization', `Bearer ${userToken}`)
			expect(duplicateRegisterResponse.status).toBe(400)
			expect(duplicateRegisterResponse.body.error).toBeDefined()
		})
	})

	describe('Stock Transactions', () => {
		it('should allow buying and selling of stocks within a game', async () => {
			const stockToBuy = {
				stockSymbol: 'AAPL',
				quantity: 1
			}
			// Buy stock
			const buyResponse = await request(app)
				.post(`/api/games/${gameId}/buy`)
				.send(stockToBuy)
				.set('Authorization', `Bearer ${userToken}`)
			expect(buyResponse.status).toBe(200)
			expect(buyResponse.body.message).toBe('Stocks purchased successfully')

			// Sell stock
			const sellResponse = await request(app)
				.post(`/api/games/${gameId}/sell`)
				.send(stockToBuy) // Assuming selling the same stock bought
				.set('Authorization', `Bearer ${userToken}`)
			expect(sellResponse.body.message).toBe('Stocks sold successfully')
		})

		it('should handle attempts to buy with insufficient funds and selling more stocks than owned', async () => {
			const stockToBuy = {
				stockSymbol: 'AAPL',
				quantity: 1000 // Assuming this quantity is not affordable
			}
			// Attempt to buy with insufficient funds
			const insufficientFundsResponse = await request(app)
				.post(`/api/games/${gameId}/buy`)
				.send(stockToBuy)
				.set('Authorization', `Bearer ${userToken}`)
			expect(insufficientFundsResponse.status).toBe(400)
			expect(insufficientFundsResponse.body.error).toBeDefined()

			// Attempt to sell more stocks than owned
			const stockToSell = {
				stockSymbol: 'AAPL',
				quantity: 500 // Assuming selling more than owned
			}
			const sellResponse = await request(app)
				.post(`/api/games/${gameId}/sell`)
				.send(stockToSell)
				.set('Authorization', `Bearer ${userToken}`)
			expect(sellResponse.status).toBe(400)
			expect(sellResponse.body.error).toBeDefined()
		})
	})

	describe('Error Handling', () => {
		it('should return 404 for non-existent game actions', async () => {
			// Attempt to register for a non-existent game
			const nonExistentGameId = '507f1f77bcf86cd799439011'
			const registerResponse = await request(app)
				.post(`/api/games/${nonExistentGameId}/register`)
				.set('Authorization', `Bearer ${userToken}`)

			expect(registerResponse.status).toBe(404)

			// Attempt to fetch a non-existent game
			const fetchResponse = await request(app)
				.get(`/api/games/${nonExistentGameId}`)
				.set('Authorization', `Bearer ${adminToken}`)

			expect(fetchResponse.status).toBe(404)
		})
	})
})
