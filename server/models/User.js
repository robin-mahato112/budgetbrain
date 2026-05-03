import fs from 'fs';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { read, write } from '../db.js';

export const createUser = async ({ name, email, password }) => {
  const db = read();
  const hashed = await bcrypt.hash(password, 12);
  const user = { _id: randomUUID(), name, email, password: hashed };
  db.users.push(user);
  write(db);
  return user;
};

export const findUserByEmail = (email) => {
  const db = read();
  return db.users.find(u => u.email === email);
};

export const findUserById = (id) => {
  const db = read();
  return db.users.find(u => u._id === id);
};

export const comparePassword = (candidate, hashed) => bcrypt.compare(candidate, hashed);