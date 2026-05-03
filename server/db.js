import fs from 'fs';
const DB_FILE = './data.json';

const read = () => {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], chats: [] }));
  return JSON.parse(fs.readFileSync(DB_FILE));
};

const write = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

export { read, write };