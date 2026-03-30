import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const login = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password format.' });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { department: { select: { id: true, name: true } } },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie('token', token, COOKIE_OPTIONS);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      notifyEmail: user.notifyEmail,
    },
  });
};

export const logout = (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ message: 'Logged out.' });
};

export const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      notifyEmail: true,
      department: { select: { id: true, name: true } },
    },
  });
  res.json({ user });
};

export const updateMe = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    notifyEmail: z.boolean().optional(),
    password: z.string().min(8).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const data = { ...parsed.data };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 12);
    delete data.password;
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, name: true, email: true, role: true, notifyEmail: true },
  });

  res.json({ user });
};
