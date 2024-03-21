import { Router } from 'express'
import { UserRepository } from '../repositories/user.repository.js'
import userModel from '../models/user.model.js'
import { UserService } from '../services/user.service.js'
import { UserController } from '../controllers/playercontroller.js'
import asyncHandler from 'express-async-handler'
import { body } from 'express-validator'
import {
	checkAuth,
	isAdmin,
	notFound,
	errorHandler
} from '../middlewares/checkAuth.middleware.js'

const router = Router()

const userRepository = new UserRepository(userModel)
const userService = new UserService(userRepository)
const userController = new UserController(userService)

router.post(
	'/register',
	[
		body('email').isEmail().withMessage('Please enter a valid email address'),
		body('password')
			.isLength({ min: 6 })
			.withMessage('Password must be at least 6 characters long')
	],
	asyncHandler(userController.register.bind(userController))
)
router.post(
	'/login',
	[
		body('email').isEmail().withMessage('Please enter a valid email address'),
		body('password')
			.isLength({ min: 6 })
			.withMessage('Password must be at least 6 characters long')
	],
	asyncHandler(userController.login.bind(userController))
)
router.get(
	'/profile',
	checkAuth,
	asyncHandler(userController.getProfile.bind(userController))
)

export default router
