import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const protect = asyncHandler(async (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new AppError(401, 'USER_NOT_FOUND', 'The account no longer exists');

  req.user = user;
  req.log = req.log?.child({ userId: user.id }) || req.log;
  next();
});

export default protect;
