const typeorm = require("typeorm");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { escape } = require("html-escaper");

/**
 * User Operations Module
 * Provides secure CRUD operations for user management
 */

class UserOperations {
  constructor() {
    this.connection = null;
    this.userRepository = null;
  }

  /**
   * Initialize database connection and repository
   */
  async initialize() {
    try {
      this.connection = typeorm.getConnection('mysql');
      this.userRepository = this.connection.getRepository("Users");
      console.log("User operations initialized successfully");
    } catch (error) {
      console.error("Failed to initialize user operations:", error);
      throw error;
    }
  }

  /**
   * Validation rules for user data
   */
  static getValidationRules() {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces')
        .escape(),
      
      body('address')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Address must be between 5 and 200 characters')
        .escape(),
      
      body('role')
        .trim()
        .isIn(['user', 'admin', 'moderator'])
        .withMessage('Role must be user, admin, or moderator')
        .escape(),
      
      body('email')
        .optional()
        .isEmail()
        .withMessage('Email must be a valid email address')
        .normalizeEmail(),
      
      body('password')
        .optional()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    ];
  }

  /**
   * Check for validation errors
   */
  static checkValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return {
        success: false,
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      };
    }
    return { success: true };
  }

  /**
   * Sanitize user input
   */
  static sanitizeUserData(userData) {
    return {
      name: escape(userData.name || '').trim(),
      address: escape(userData.address || '').trim(),
      role: escape(userData.role || 'user').trim(),
      email: userData.email ? userData.email.toLowerCase().trim() : null
    };
  }

  /**
   * Add a new user
   */
  async addUser(userData) {
    try {
      // Validate input
      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid user data provided');
      }

      // Sanitize input
      const sanitizedData = UserOperations.sanitizeUserData(userData);

      // Check if user already exists (by name and email if provided)
      const existingUser = await this.userRepository.findOne({
        where: [
          { name: sanitizedData.name },
          ...(sanitizedData.email ? [{ email: sanitizedData.email }] : [])
        ]
      });

      if (existingUser) {
        throw new Error('User already exists with this name or email');
      }

      // Hash password if provided
      let hashedPassword = null;
      if (userData.password) {
        const saltRounds = 12;
        hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      }

      // Create user object
      const newUser = {
        name: sanitizedData.name,
        address: sanitizedData.address,
        role: sanitizedData.role,
        email: sanitizedData.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const savedUser = await this.userRepository.save(newUser);

      // Return user without password
      const { password, ...userWithoutPassword } = savedUser;
      
      return {
        success: true,
        message: 'User created successfully',
        user: userWithoutPassword
      };

    } catch (error) {
      console.error('Error adding user:', error);
      return {
        success: false,
        message: error.message || 'Failed to add user'
      };
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(userId, updateData) {
    try {
      // Validate input
      if (!userId || !updateData || typeof updateData !== 'object') {
        throw new Error('Invalid user ID or update data provided');
      }

      // Find existing user
      const existingUser = await this.userRepository.findOne({
        where: { id: parseInt(userId) }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Sanitize input
      const sanitizedData = UserOperations.sanitizeUserData(updateData);

      // Check for duplicate email if email is being updated
      if (sanitizedData.email && sanitizedData.email !== existingUser.email) {
        const emailExists = await this.userRepository.findOne({
          where: { email: sanitizedData.email }
        });
        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // Hash password if provided
      let hashedPassword = existingUser.password;
      if (updateData.password) {
        const saltRounds = 12;
        hashedPassword = await bcrypt.hash(updateData.password, saltRounds);
      }

      // Prepare update object
      const updateObject = {
        ...sanitizedData,
        password: hashedPassword,
        updatedAt: new Date()
      };

      // Update user
      await this.userRepository.update(userId, updateObject);

      // Get updated user
      const updatedUser = await this.userRepository.findOne({
        where: { id: parseInt(userId) }
      });

      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        message: 'User updated successfully',
        user: userWithoutPassword
      };

    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        message: error.message || 'Failed to update user'
      };
    }
  }

  /**
   * Search for users with various filters
   */
  async searchUsers(searchCriteria = {}) {
    try {
      // Validate and sanitize search criteria
      const {
        name,
        role,
        email,
        address,
        limit = 50,
        offset = 0,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = searchCriteria;

      // Validate limit and offset
      const validatedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const validatedOffset = Math.max(parseInt(offset) || 0, 0);

      // Validate sort parameters
      const allowedSortFields = ['name', 'role', 'email', 'address', 'createdAt', 'updatedAt'];
      const validatedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
      const validatedSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

      // Build where clause
      const whereClause = {};
      
      if (name) {
        whereClause.name = typeorm.Like(`%${escape(name)}%`);
      }
      
      if (role) {
        whereClause.role = escape(role);
      }
      
      if (email) {
        whereClause.email = typeorm.Like(`%${escape(email)}%`);
      }
      
      if (address) {
        whereClause.address = typeorm.Like(`%${escape(address)}%`);
      }

      // Execute query
      const [users, totalCount] = await this.userRepository.findAndCount({
        where: whereClause,
        order: { [validatedSortBy]: validatedSortOrder },
        skip: validatedOffset,
        take: validatedLimit,
        select: ['id', 'name', 'email', 'address', 'role', 'createdAt', 'updatedAt'] // Exclude password
      });

      return {
        success: true,
        users: users,
        pagination: {
          total: totalCount,
          limit: validatedLimit,
          offset: validatedOffset,
          hasMore: validatedOffset + validatedLimit < totalCount
        }
      };

    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        message: error.message || 'Failed to search users',
        users: [],
        pagination: {
          total: 0,
          limit: 0,
          offset: 0,
          hasMore: false
        }
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findOne({
        where: { id: parseInt(userId) },
        select: ['id', 'name', 'email', 'address', 'role', 'createdAt', 'updatedAt'] // Exclude password
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: user
      };

    } catch (error) {
      console.error('Error getting user by ID:', error);
      return {
        success: false,
        message: error.message || 'Failed to get user'
      };
    }
  }

  /**
   * Delete user by ID
   */
  async deleteUser(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await this.userRepository.findOne({
        where: { id: parseInt(userId) }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deletion of admin users (optional security measure)
      if (user.role === 'admin') {
        throw new Error('Cannot delete admin users');
      }

      await this.userRepository.remove(user);

      return {
        success: true,
        message: 'User deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete user'
      };
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(userId, password) {
    try {
      if (!userId || !password) {
        throw new Error('User ID and password are required');
      }

      const user = await this.userRepository.findOne({
        where: { id: parseInt(userId) },
        select: ['id', 'password']
      });

      if (!user || !user.password) {
        throw new Error('User not found or no password set');
      }

      const isValid = await bcrypt.compare(password, user.password);
      
      return {
        success: true,
        isValid: isValid
      };

    } catch (error) {
      console.error('Error verifying password:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify password'
      };
    }
  }
}

module.exports = UserOperations;

